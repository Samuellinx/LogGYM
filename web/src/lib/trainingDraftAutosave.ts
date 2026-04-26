import type {
  TrainingDraftExercise,
  TrainingDraftSet,
  WorkoutDocument,
} from '../types';

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

const getDraftStorageKey = (userId: string, workoutId: string) =>
  `loggym:training-draft:${userId}:${workoutId}`;
const getDraftStorageKeyPrefix = (userId: string) => `loggym:training-draft:${userId}:`;

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

export const getTrainingDraftAutosave = (
  userId: string,
  workoutId: string,
): TrainingDraftAutosavePayload | null => {
  return parseTrainingDraftSnapshot(
    window.localStorage.getItem(getDraftStorageKey(userId, workoutId)),
  );
};

export const saveTrainingDraftAutosave = (
  draft: TrainingDraftAutosavePayload,
) => {
  window.localStorage.setItem(
    getDraftStorageKey(draft.userId, draft.workoutId),
    JSON.stringify(draft),
  );
};

export const deleteTrainingDraftAutosave = (
  userId: string,
  workoutId: string,
) => {
  window.localStorage.removeItem(getDraftStorageKey(userId, workoutId));
};

export const deleteAllTrainingDraftAutosavesForUser = (userId: string) => {
  const keyPrefix = getDraftStorageKeyPrefix(userId);
  const keysToDelete: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(keyPrefix)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => window.localStorage.removeItem(key));
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

export const restoreTrainingDraftExercises = (
  workout: WorkoutDocument,
  savedDraft: TrainingDraftAutosavePayload | null,
): TrainingDraftExercise[] => {
  const savedExercises = new Map(
    savedDraft?.workoutId === workout.id
      ? savedDraft.exercises.map(exercise => [exercise.workoutExerciseId, exercise])
      : [],
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
