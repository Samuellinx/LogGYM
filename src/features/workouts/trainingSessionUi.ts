import type {
  TrainingDraftExercise,
  TrainingDraftExerciseState,
  TrainingDraftSet,
} from './trainingDraftAutosave';

export type ExercisePerformanceRecord = {
  load: number;
  reps: number;
};

type ExercisePerformancePoint = {
  load: number;
  reps: number;
};

export type TrainingDraftExerciseInput = {
  exerciseName: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  hint: string;
};

const createDraftSetId = () =>
  `draft-set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const createDraftExerciseId = () =>
  `ad-hoc-exercise-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const createBlankSet = (seriesNumber = 1): TrainingDraftSet => ({
  id: createDraftSetId(),
  seriesNumber,
  load: '',
  reps: '',
  note: '',
});

const getNextExerciseOrderIndex = (draftState: TrainingDraftExerciseState) =>
  [
    ...draftState.completedExercises,
    ...draftState.pendingExercises,
  ].reduce(
    (highestOrderIndex, exercise) =>
      Number.isFinite(exercise.orderIndex)
        ? Math.max(highestOrderIndex, exercise.orderIndex)
        : highestOrderIndex,
    -1,
  ) + 1;

export const getTrainingStartActionConfig = (hasStartedDraft: boolean) => ({
  label: hasStartedDraft ? 'Continuar treino' : 'Iniciar treino',
  variant: hasStartedDraft ? ('resume' as const) : ('primary' as const),
});

export const getExercisePerformanceRecord = (
  points: ReadonlyArray<ExercisePerformancePoint>,
) =>
  points.reduce<ExercisePerformanceRecord | null>((record, point) => {
    if (
      !Number.isFinite(point.load) ||
      !Number.isFinite(point.reps) ||
      point.load <= 0 ||
      point.reps <= 0
    ) {
      return record;
    }

    if (!record || point.load > record.load) {
      return {
        load: point.load,
        reps: point.reps,
      };
    }

    if (point.load === record.load && point.reps > record.reps) {
      return {
        load: point.load,
        reps: point.reps,
      };
    }

    return record;
  }, null);

export const getNextTrainingExerciseIndex = (
  currentExerciseIndex: number,
  totalExercises: number,
) => {
  const nextExerciseIndex = currentExerciseIndex + 1;

  if (nextExerciseIndex >= totalExercises) {
    return null;
  }

  return nextExerciseIndex;
};

const parsePositiveNumber = (value: string) => Number(value.replace(',', '.').trim());

export const isTrainingDraftSetCompleted = (setItem: TrainingDraftSet) =>
  Number.isFinite(parsePositiveNumber(setItem.load)) &&
  Number.isFinite(parsePositiveNumber(setItem.reps)) &&
  parsePositiveNumber(setItem.load) > 0 &&
  parsePositiveNumber(setItem.reps) > 0;

export const canFinalizeTrainingDraftExercise = (
  exercise: TrainingDraftExercise,
) =>
  exercise.status !== 'not-performed' &&
  exercise.sets.length > 0 &&
  exercise.sets.every(isTrainingDraftSetCompleted);

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

export const markTrainingDraftExerciseNotPerformed = (
  draftState: TrainingDraftExerciseState,
  exerciseIndex: number,
): TrainingDraftExerciseState | null => {
  const exercise = draftState.pendingExercises[exerciseIndex];

  if (!exercise) {
    return null;
  }

  return {
    ...draftState,
    pendingExercises: draftState.pendingExercises.map(
      (currentExercise, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? {...currentExercise, status: 'not-performed'}
          : currentExercise,
    ),
  };
};

export const addTrainingDraftExercise = (
  draftState: TrainingDraftExerciseState,
  input: TrainingDraftExerciseInput,
): TrainingDraftExerciseState => ({
  ...draftState,
  pendingExercises: [
    ...draftState.pendingExercises,
    {
      workoutExerciseId: createDraftExerciseId(),
      orderIndex: getNextExerciseOrderIndex(draftState),
      exerciseName: input.exerciseName.trim(),
      muscleGroup: input.muscleGroup.trim() || 'Outros',
      baseLoad: input.baseLoad.trim(),
      targetReps: input.targetReps.trim(),
      hint: input.hint.trim(),
      sets: [createBlankSet(1)],
    },
  ],
});

export const mergeTrainingDraftExercisesForSave = (
  draftState: TrainingDraftExerciseState,
) =>
  [...draftState.completedExercises, ...draftState.pendingExercises]
    .filter(exercise => exercise.status !== 'not-performed')
    .sort((left, right) => left.orderIndex - right.orderIndex);
