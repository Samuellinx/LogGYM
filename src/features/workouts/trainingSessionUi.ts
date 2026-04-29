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
