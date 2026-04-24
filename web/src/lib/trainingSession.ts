import type {
  TrainingDraftExercise,
  TrainingDraftSet,
  WorkoutDocument,
  WorkoutSessionDocument,
} from '../types';

const createBlankSet = (): TrainingDraftSet => ({
  load: '',
  reps: '',
  note: '',
});

const parseNumber = (value: string) => Number(value.replace(',', '.').trim());

export const createTrainingDraftFromWorkout = (
  workout: WorkoutDocument,
): TrainingDraftExercise[] =>
  workout.exercises.map(exercise => ({
    workoutExerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    baseLoad: exercise.baseLoad,
    targetReps: exercise.targetReps,
    hint: exercise.note,
    sets: [createBlankSet()],
  }));

export const addDraftSet = (exercises: TrainingDraftExercise[], exerciseIndex: number) =>
  exercises.map((exercise, currentExerciseIndex) =>
    currentExerciseIndex === exerciseIndex
      ? {...exercise, sets: [...exercise.sets, createBlankSet()]}
      : exercise,
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
          ? [createBlankSet()]
          : exercise.sets.filter((_, currentSetIndex) => currentSetIndex !== setIndex),
    };
  });

export const updateDraftSet = (
  exercises: TrainingDraftExercise[],
  exerciseIndex: number,
  setIndex: number,
  field: keyof TrainingDraftSet,
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
    throw new Error('Selecione uma data valida para a execução.');
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
    id: crypto.randomUUID(),
    userId,
    workoutId: workout.id,
    workoutName: workout.name,
    focus: workout.focus,
    overallNotes: overallNotes.trim(),
    performedAt: new Date(performedAt).toISOString(),
    createdAt,
    exercises: validExercises,
    totalSets,
    totalVolume,
    topLoad,
  };
};
