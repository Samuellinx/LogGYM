import type {
  TrainingDraftExercise,
  TrainingDraftExerciseState,
  TrainingDraftSet,
  WorkoutDocument,
} from '../types';

export type TrainingDraftAutosavePayload = {
  version: 2;
  userId: string;
  workoutId: string;
  performedAt: string;
  overallNotes: string;
  pendingExercises: TrainingDraftExercise[];
  completedExercises: TrainingDraftExercise[];
  updatedAt: string;
};

type SnapshotInput = Omit<TrainingDraftAutosavePayload, 'version'>;
type LegacyTrainingDraftAutosavePayload = {
  version: 1;
  userId: string;
  workoutId: string;
  performedAt: string;
  overallNotes: string;
  exercises: TrainingDraftExercise[];
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const createDraftSetId = () =>
  `draft-set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const createBlankSet = (seriesNumber = 1): TrainingDraftSet => ({
  id: createDraftSetId(),
  seriesNumber,
  load: '',
  reps: '',
  note: '',
});

const createDraftExercisesFromWorkout = (
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

const normalizeDraftSet = (setItem: {
  id?: string;
  seriesNumber?: number;
  load: string;
  reps: string;
  note: string;
}, fallbackSeriesNumber: number): TrainingDraftSet => ({
  id:
    typeof setItem.id === 'string' && setItem.id.trim()
      ? setItem.id
      : createDraftSetId(),
  seriesNumber:
    typeof setItem.seriesNumber === 'number' && Number.isFinite(setItem.seriesNumber)
      ? setItem.seriesNumber
      : fallbackSeriesNumber,
  load: setItem.load,
  reps: setItem.reps,
  note: setItem.note,
});

const getDraftStorageKey = (userId: string, workoutId: string) =>
  `loggym:training-draft:${userId}:${workoutId}`;
const getDraftStorageKeyPrefix = (userId: string) => `loggym:training-draft:${userId}:`;

export const createTrainingDraftSnapshot = (
  input: SnapshotInput,
): TrainingDraftAutosavePayload => ({
  version: 2,
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

    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== 2)) {
      return null;
    }

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.workoutId !== 'string' ||
      typeof parsed.performedAt !== 'string' ||
      typeof parsed.overallNotes !== 'string' ||
      typeof parsed.updatedAt !== 'string'
    ) {
      return null;
    }

    const pendingExercises =
      parsed.version === 2
        ? parseDraftExercises(parsed.pendingExercises)
        : parseDraftExercises(parsed.exercises);
    const completedExercises =
      parsed.version === 2 ? parseDraftExercises(parsed.completedExercises) : [];

    if (!pendingExercises || !completedExercises) {
      return null;
    }

    return {
      version: 2,
      userId: parsed.userId,
      workoutId: parsed.workoutId,
      performedAt: parsed.performedAt,
      overallNotes: parsed.overallNotes,
      updatedAt: parsed.updatedAt,
      pendingExercises,
      completedExercises,
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

  return [...draft.pendingExercises, ...draft.completedExercises].some(exercise =>
    exercise.status === 'not-performed' ||
    exercise.sets.some(
      setItem =>
        setItem.load.trim() !== '' ||
        setItem.reps.trim() !== '' ||
        setItem.note.trim() !== '',
    ),
  );
};

const normalizeDraftExercise = (
  exercise: TrainingDraftExercise,
  fallbackOrderIndex: number,
): TrainingDraftExercise => ({
  workoutExerciseId: exercise.workoutExerciseId,
  orderIndex:
    Number.isFinite(exercise.orderIndex) ? exercise.orderIndex : fallbackOrderIndex,
  exerciseName: exercise.exerciseName,
  muscleGroup: exercise.muscleGroup,
  baseLoad: exercise.baseLoad,
  targetReps: exercise.targetReps,
  hint: exercise.hint,
  status: exercise.status === 'not-performed' ? 'not-performed' : undefined,
  sets: exercise.sets.map((setItem, setIndex) =>
    normalizeDraftSet(setItem, setIndex + 1),
  ),
});

const parseDraftExercises = (
  value: unknown,
): TrainingDraftExercise[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((exercise, exerciseIndex): TrainingDraftExercise | null => {
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
        .map((setItem, setIndex): TrainingDraftSet | null => {
          if (
            !isRecord(setItem) ||
            typeof setItem.load !== 'string' ||
            typeof setItem.reps !== 'string' ||
            typeof setItem.note !== 'string'
          ) {
            return null;
          }

          return normalizeDraftSet({
            id: typeof setItem.id === 'string' ? setItem.id : undefined,
            seriesNumber:
              typeof setItem.seriesNumber === 'number' ? setItem.seriesNumber : undefined,
            load: setItem.load,
            reps: setItem.reps,
            note: setItem.note,
          }, setIndex + 1);
        })
        .filter((setItem): setItem is TrainingDraftSet => setItem !== null);

      return {
        workoutExerciseId: exercise.workoutExerciseId,
        orderIndex:
          typeof exercise.orderIndex === 'number' &&
          Number.isFinite(exercise.orderIndex)
            ? exercise.orderIndex
            : exerciseIndex,
        exerciseName: exercise.exerciseName,
        muscleGroup: exercise.muscleGroup,
        baseLoad: exercise.baseLoad,
        targetReps: exercise.targetReps,
        hint: exercise.hint,
        status:
          exercise.status === 'not-performed' ? 'not-performed' : undefined,
        sets,
      };
    })
    .filter((exercise): exercise is TrainingDraftExercise => exercise !== null);
};

const listDraftExercises = (
  draft: TrainingDraftAutosavePayload | LegacyTrainingDraftAutosavePayload,
) =>
  draft.version === 2
    ? {
        pendingExercises: draft.pendingExercises,
        completedExercises: draft.completedExercises,
      }
    : {
        pendingExercises: draft.exercises,
        completedExercises: [],
      };

export const createEmptyTrainingDraftState = (): TrainingDraftExerciseState => ({
  pendingExercises: [],
  completedExercises: [],
});

export const restoreTrainingDraftState = (
  workout: WorkoutDocument,
  savedDraft: TrainingDraftAutosavePayload | null,
): TrainingDraftExerciseState => {
  if (!savedDraft || savedDraft.workoutId !== workout.id) {
    return {
      pendingExercises: createDraftExercisesFromWorkout(workout),
      completedExercises: [],
    };
  }

  const normalizedDraft = listDraftExercises(savedDraft);
  const savedPendingExercises = new Map(
    normalizedDraft.pendingExercises.map((exercise, index) => [
      exercise.workoutExerciseId,
      normalizeDraftExercise(exercise, index),
    ]),
  );
  const savedCompletedExercises = new Map(
    normalizedDraft.completedExercises.map((exercise, index) => [
      exercise.workoutExerciseId,
      normalizeDraftExercise(exercise, index),
    ]),
  );
  const nextState = createEmptyTrainingDraftState();
  const workoutExerciseIds = new Set(workout.exercises.map(exercise => exercise.id));

  workout.exercises.forEach(exercise => {
    const savedCompletedExercise = savedCompletedExercises.get(exercise.id);
    const savedPendingExercise = savedPendingExercises.get(exercise.id);
    const savedExercise = savedCompletedExercise ?? savedPendingExercise;
    const isNotPerformed = savedExercise?.status === 'not-performed';
    const targetList = savedCompletedExercise && !isNotPerformed
      ? nextState.completedExercises
      : nextState.pendingExercises;

    targetList.push({
      workoutExerciseId: exercise.id,
      orderIndex: exercise.orderIndex,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      baseLoad: exercise.baseLoad,
      targetReps: exercise.targetReps,
      hint: exercise.note,
      status: isNotPerformed ? 'not-performed' : undefined,
      sets: savedExercise?.sets.length
        ? savedExercise.sets.map((setItem, setIndex) =>
            normalizeDraftSet(setItem, setIndex + 1),
          )
        : [createBlankSet(1)],
    });
  });

  normalizedDraft.pendingExercises.forEach((exercise, index) => {
    if (!workoutExerciseIds.has(exercise.workoutExerciseId)) {
      nextState.pendingExercises.push(
        normalizeDraftExercise(exercise, workout.exercises.length + index),
      );
    }
  });

  normalizedDraft.completedExercises.forEach((exercise, index) => {
    if (!workoutExerciseIds.has(exercise.workoutExerciseId)) {
      const normalizedExercise = normalizeDraftExercise(
        exercise,
        workout.exercises.length + normalizedDraft.pendingExercises.length + index,
      );
      const targetList =
        normalizedExercise.status === 'not-performed'
          ? nextState.pendingExercises
          : nextState.completedExercises;

      targetList.push(normalizedExercise);
    }
  });

  return nextState;
};

export const restoreTrainingDraftExercises = (
  workout: WorkoutDocument,
  savedDraft: TrainingDraftAutosavePayload | null,
): TrainingDraftExercise[] => {
  return restoreTrainingDraftState(workout, savedDraft).pendingExercises;
};
