import type {
  TrainingDraftExercise,
  TrainingDraftExerciseState,
  TrainingDraftSet,
  WorkoutDocument,
  WorkoutExerciseInput,
  WorkoutSessionDocument,
} from '../types';
import {normalizeSessionDateInput} from './sessionDate';

export type TrainingCompletionGroupStat = {
  label: string;
  count: number;
};

export type TrainingCompletionSummary = {
  workoutName: string;
  totalSets: number;
  seriesByGroup: TrainingCompletionGroupStat[];
  maxLoad: number;
  minLoad: number;
  maxReps: number;
  minReps: number;
};

export type ExercisePerformanceRecord = {
  load: number;
  reps: number;
};

type ExercisePerformanceLookup =
  | Pick<WorkoutExerciseInput, 'id' | 'name'>
  | Pick<TrainingDraftExercise, 'workoutExerciseId' | 'exerciseName'>;

const createDraftSetId = () =>
  `draft-set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const createSessionDocumentId = () =>
  `training-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getNextSeriesNumber = (sets: TrainingDraftSet[]) =>
  sets.reduce(
    (highestSeriesNumber, setItem) =>
      Number.isFinite(setItem.seriesNumber)
        ? Math.max(highestSeriesNumber, setItem.seriesNumber)
        : highestSeriesNumber,
    0,
  ) + 1;

const createBlankSet = (seriesNumber = 1): TrainingDraftSet => ({
  id: createDraftSetId(),
  seriesNumber,
  load: '',
  reps: '',
  note: '',
});

const parseNumber = (value: string) => Number(value.replace(',', '.').trim());

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const getPerformanceLookupId = (exercise: ExercisePerformanceLookup) =>
  'id' in exercise ? exercise.id : exercise.workoutExerciseId;

const getPerformanceLookupName = (exercise: ExercisePerformanceLookup) =>
  'name' in exercise ? exercise.name : exercise.exerciseName;

export const getExercisePerformanceRecordFromSessions = (
  workoutId: string,
  exercise: ExercisePerformanceLookup,
  sessions: WorkoutSessionDocument[],
) => {
  const exerciseId = getPerformanceLookupId(exercise);
  const exerciseToken = normalizeToken(getPerformanceLookupName(exercise));

  return sessions
    .filter(session => session.workoutId === workoutId)
    .flatMap(session =>
      session.exercises
        .filter(sessionExercise => {
          if (sessionExercise.workoutExerciseId === exerciseId) {
            return true;
          }

          return normalizeToken(sessionExercise.exerciseName) === exerciseToken;
        })
        .flatMap(sessionExercise =>
          sessionExercise.sets.map(setItem => ({
            load: setItem.load,
            reps: setItem.reps,
          })),
        ),
    )
    .reduce<ExercisePerformanceRecord | null>((record, current) => {
      if (
        !Number.isFinite(current.load) ||
        !Number.isFinite(current.reps) ||
        current.load <= 0 ||
        current.reps <= 0
      ) {
        return record;
      }

      if (!record || current.load > record.load) {
        return current;
      }

      if (current.load === record.load && current.reps > record.reps) {
        return current;
      }

      return record;
    }, null);
};

export const buildTrainingCompletionSummary = (
  workoutName: string,
  exercises: TrainingDraftExercise[],
): TrainingCompletionSummary => {
  const validSets = exercises.flatMap(exercise =>
    exercise.sets
      .map(setItem => ({
        groupLabel: exercise.muscleGroup.trim() || 'Outros',
        load: parseNumber(setItem.load),
        reps: parseNumber(setItem.reps),
      }))
      .filter(
        setItem =>
          Number.isFinite(setItem.load) &&
          Number.isFinite(setItem.reps) &&
          setItem.load > 0 &&
          setItem.reps > 0,
      ),
  );

  if (!validSets.length) {
    throw new Error('Adicione pelo menos uma série válida antes de salvar.');
  }

  const groupCounters = new Map<string, number>();

  validSets.forEach(setItem => {
    groupCounters.set(setItem.groupLabel, (groupCounters.get(setItem.groupLabel) ?? 0) + 1);
  });

  return {
    workoutName,
    totalSets: validSets.length,
    seriesByGroup: Array.from(groupCounters.entries())
      .map(([label, count]) => ({label, count}))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    maxLoad: Math.max(...validSets.map(setItem => setItem.load)),
    minLoad: Math.min(...validSets.map(setItem => setItem.load)),
    maxReps: Math.max(...validSets.map(setItem => setItem.reps)),
    minReps: Math.min(...validSets.map(setItem => setItem.reps)),
  };
};

export const createTrainingDraftFromWorkout = (
  workout: WorkoutDocument,
): TrainingDraftExercise[] =>
  workout.exercises.map(exercise => ({
    workoutExerciseId: exercise.id,
    orderIndex: exercise.orderIndex,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    baseLoad: exercise.baseLoad,
    targetReps: exercise.targetReps,
    hint: exercise.note,
    sets: [createBlankSet(1)],
  }));

export const addDraftSet = (exercises: TrainingDraftExercise[], exerciseIndex: number) =>
  exercises.map((exercise, currentExerciseIndex) =>
    currentExerciseIndex === exerciseIndex
      ? {
          ...exercise,
          sets: [createBlankSet(getNextSeriesNumber(exercise.sets)), ...exercise.sets],
        }
      : exercise,
  );

export const isTrainingDraftSetCompleted = (setItem: TrainingDraftSet) =>
  Number.isFinite(parseNumber(setItem.load)) &&
  Number.isFinite(parseNumber(setItem.reps)) &&
  parseNumber(setItem.load) > 0 &&
  parseNumber(setItem.reps) > 0;

export const canFinalizeTrainingDraftExercise = (
  exercise: TrainingDraftExercise,
) => exercise.sets.length > 0 && exercise.sets.every(isTrainingDraftSetCompleted);

export const finalizeTrainingDraftExercise = (
  draftState: TrainingDraftExerciseState,
  exerciseIndex: number,
): TrainingDraftExerciseState | null => {
  const exercise = draftState.pendingExercises[exerciseIndex];

  if (!exercise || !canFinalizeTrainingDraftExercise(exercise)) {
    return null;
  }

  return {
    pendingExercises: draftState.pendingExercises.filter(
      (_, currentExerciseIndex) => currentExerciseIndex !== exerciseIndex,
    ),
    completedExercises: [...draftState.completedExercises, exercise].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    ),
  };
};

export const mergeTrainingDraftExercisesForSave = (
  draftState: TrainingDraftExerciseState,
) =>
  [...draftState.completedExercises, ...draftState.pendingExercises].sort(
    (left, right) => left.orderIndex - right.orderIndex,
  );

export const removeDraftSet = (
  exercises: TrainingDraftExercise[],
  exerciseIndex: number,
  setIndex: number,
) =>
  exercises.map((exercise, currentExerciseIndex) => {
    if (currentExerciseIndex !== exerciseIndex) {
      return exercise;
    }

    return {
      ...exercise,
      sets:
        exercise.sets.length === 1
          ? [createBlankSet(1)]
          : exercise.sets.filter((_, currentSetIndex) => currentSetIndex !== setIndex),
    };
  });

export const updateDraftSet = (
  exercises: TrainingDraftExercise[],
  exerciseIndex: number,
  setIndex: number,
  field: 'load' | 'reps' | 'note',
  value: string,
) =>
  exercises.map((exercise, currentExerciseIndex) => {
    if (currentExerciseIndex !== exerciseIndex) {
      return exercise;
    }

    return {
      ...exercise,
      sets: exercise.sets.map((setItem, currentSetIndex) =>
        currentSetIndex === setIndex ? {...setItem, [field]: value} : setItem,
      ),
    };
  });

export const buildTrainingSessionDocument = ({
  userId,
  workout,
  performedAt,
  overallNotes,
  exercises,
}: {
  userId: string;
  workout: WorkoutDocument;
  performedAt: string;
  overallNotes: string;
  exercises: TrainingDraftExercise[];
}): WorkoutSessionDocument => {
  if (!performedAt.trim()) {
    throw new Error('Selecione uma data válida para a execução.');
  }

  const validExercises = exercises
    .map(exercise => ({
      workoutExerciseId: exercise.workoutExerciseId,
      exerciseName: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      sets: exercise.sets
        .map(setItem => ({
          load: parseNumber(setItem.load),
          reps: parseNumber(setItem.reps),
          note: setItem.note.trim(),
        }))
        .filter(
          setItem =>
            Number.isFinite(setItem.load) &&
            Number.isFinite(setItem.reps) &&
            setItem.load > 0 &&
            setItem.reps > 0,
        ),
    }))
    .filter(exercise => exercise.sets.length > 0);

  if (!validExercises.length) {
    throw new Error('Adicione pelo menos uma série válida antes de salvar.');
  }

  const createdAt = new Date().toISOString();
  const totalSets = validExercises.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );
  const totalVolume = validExercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce(
        (exerciseVolume, setItem) => exerciseVolume + setItem.load * setItem.reps,
        0,
      ),
    0,
  );
  const topLoad = validExercises.reduce(
    (record, exercise) =>
      Math.max(record, ...exercise.sets.map(setItem => setItem.load)),
    0,
  );

  return {
    id: createSessionDocumentId(),
    userId,
    workoutId: workout.id,
    workoutName: workout.name,
    focus: workout.focus,
    overallNotes: overallNotes.trim(),
    performedAt: normalizeSessionDateInput(performedAt),
    createdAt,
    exercises: validExercises,
    totalSets,
    totalVolume,
    topLoad,
  };
};
