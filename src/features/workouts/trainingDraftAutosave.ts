import type {WorkoutDetail} from '@/types/domain';

export type TrainingDraftSet = {
  load: string;
  reps: string;
  note: string;
};

export type TrainingDraftExercise = {
  workoutExerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  hint: string;
  sets: TrainingDraftSet[];
};

export type TrainingDraftAutosavePayload = {
  version: 1;
  userId: string;
  workoutId: string;
  performedAt: string;
  overallNotes: string;
  exercises: TrainingDraftExercise[];
  updatedAt: string;
};

type SnapshotInput = Omit<TrainingDraftAutosavePayload, 'version'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const createBlankSet = (): TrainingDraftSet => ({
  load: '',
  reps: '',
  note: '',
});

export const createDraftExercisesFromWorkout = (
  workout: WorkoutDetail,
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

export const restoreTrainingDraftExercises = (
  workout: WorkoutDetail,
  savedDraft: TrainingDraftAutosavePayload | null,
): TrainingDraftExercise[] => {
  if (!savedDraft || savedDraft.workoutId !== workout.id) {
    return createDraftExercisesFromWorkout(workout);
  }

  const savedExercises = new Map(
    savedDraft.exercises.map(exercise => [exercise.workoutExerciseId, exercise]),
  );

  return workout.exercises.map(exercise => {
    const savedExercise = savedExercises.get(exercise.id);

    return {
      workoutExerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      baseLoad: exercise.baseLoad,
      targetReps: exercise.targetReps,
      hint: exercise.note,
      sets: savedExercise?.sets.length ? savedExercise.sets : [createBlankSet()],
    };
  });
};

export const createTrainingDraftSnapshot = (
  input: SnapshotInput,
): TrainingDraftAutosavePayload => ({
  version: 1,
  ...input,
});

export const parseTrainingDraftSnapshot = (
  value: string | null,
): TrainingDraftAutosavePayload | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!isRecord(parsed) || parsed.version !== 1) {
      return null;
    }

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.workoutId !== 'string' ||
      typeof parsed.performedAt !== 'string' ||
      typeof parsed.overallNotes !== 'string' ||
      typeof parsed.updatedAt !== 'string' ||
      !Array.isArray(parsed.exercises)
    ) {
      return null;
    }

    const exercises = parsed.exercises
      .map((exercise): TrainingDraftExercise | null => {
        if (
          !isRecord(exercise) ||
          typeof exercise.workoutExerciseId !== 'string' ||
          typeof exercise.exerciseName !== 'string' ||
          typeof exercise.muscleGroup !== 'string' ||
          typeof exercise.baseLoad !== 'string' ||
          typeof exercise.targetReps !== 'string' ||
          typeof exercise.hint !== 'string' ||
          !Array.isArray(exercise.sets)
        ) {
          return null;
        }

        const sets = exercise.sets
          .map((setItem): TrainingDraftSet | null => {
            if (
              !isRecord(setItem) ||
              typeof setItem.load !== 'string' ||
              typeof setItem.reps !== 'string' ||
              typeof setItem.note !== 'string'
            ) {
              return null;
            }

            return {
              load: setItem.load,
              reps: setItem.reps,
              note: setItem.note,
            };
          })
          .filter((setItem): setItem is TrainingDraftSet => setItem !== null);

        return {
          workoutExerciseId: exercise.workoutExerciseId,
          exerciseName: exercise.exerciseName,
          muscleGroup: exercise.muscleGroup,
          baseLoad: exercise.baseLoad,
          targetReps: exercise.targetReps,
          hint: exercise.hint,
          sets,
        };
      })
      .filter((exercise): exercise is TrainingDraftExercise => exercise !== null);

    return {
      version: 1,
      userId: parsed.userId,
      workoutId: parsed.workoutId,
      performedAt: parsed.performedAt,
      overallNotes: parsed.overallNotes,
      updatedAt: parsed.updatedAt,
      exercises,
    };
  } catch {
    return null;
  }
};

export const hasStartedTrainingDraft = (
  draft: TrainingDraftAutosavePayload | null,
) => {
  if (!draft) {
    return false;
  }

  if (draft.overallNotes.trim()) {
    return true;
  }

  return draft.exercises.some(exercise =>
    exercise.sets.some(
      setItem =>
        setItem.load.trim() !== '' ||
        setItem.reps.trim() !== '' ||
        setItem.note.trim() !== '',
    ),
  );
};
