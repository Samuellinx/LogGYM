import {useEffect, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ChevronRight,
  Clock3,
  Play,
  Plus,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {ConfirmModal} from '@/components/ConfirmModal';
import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SuccessModal} from '@/components/SuccessModal';
import {TextField} from '@/components/TextField';
import {
  WorkoutCompletionModal,
  type WorkoutCompletionSummary,
} from '@/components/WorkoutCompletionModal';
import {
  deleteTrainingDraftAutosave,
  getExerciseProgress,
  getTrainingDraftAutosave,
  getWorkoutDetail,
  saveTrainingSession,
  saveTrainingDraftAutosave,
} from '@/features/workouts/workoutRepository';
import {
  addDraftSetToExercise,
  createEmptyTrainingDraftState,
  createBlankSet,
  createTrainingDraftSnapshot,
  restoreTrainingDraftState,
  type TrainingDraftExercise,
  type TrainingDraftExerciseState,
} from '@/features/workouts/trainingDraftAutosave';
import {
  addTrainingDraftExercise,
  canFinalizeTrainingDraftExercise,
  finalizeTrainingDraftExercise,
  getExercisePerformanceRecord,
  getNextTrainingExerciseIndex,
  markTrainingDraftExerciseNotPerformed,
  mergeTrainingDraftExercisesForSave,
  type ExercisePerformanceRecord,
} from '@/features/workouts/trainingSessionUi';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import type {WorkoutDetail} from '@/types/domain';
import {formatBaseLoadLabel} from '@/utils/baseLoad';
import {toUserMessage} from '@/utils/errors';
import {
  formatDateLong,
  formatExercisePerformanceRecord,
} from '@/utils/formatters';
import {
  maskIntegerInput,
  maskLoadInput,
  maskRepRangeInput,
} from '@/utils/inputMasks';
import {
  buildSessionSetLoadFields,
  MAX_LOAD_LABEL_LENGTH,
  parseLoadInputNumber,
} from '@/shared/loadInput';
import {
  normalizeSessionDateInput,
  resolveTrainingDraftPerformedAt,
  toSessionDate,
} from '@/utils/sessionDate';
import {
  defaultRestTimerSeconds,
  formatRestTimerTime,
  restTimerPresets,
} from '@/utils/restTimer';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingSession'>;

type PendingSetDeletion = {
  exerciseIndex: number;
  setIndex: number;
} | null;
type TrainingUndoSnapshot = {
  draftState: TrainingDraftExerciseState;
  performedAt: string;
  overallNotes: string;
};
type ExercisePerformanceRecords = Record<string, ExercisePerformanceRecord>;
type SetRestTimerState = {
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  endsAt: number | null;
};
type NewExerciseDraft = {
  exerciseName: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  hint: string;
};

const parseNumber = (value: string) => Number(value.replace(',', '.').trim());
type UpdatableTrainingDraftSetField = 'load' | 'reps' | 'note';
const MAX_UNDO_STEPS = 50;
const createEmptyNewExerciseDraft = (): NewExerciseDraft => ({
  exerciseName: '',
  muscleGroup: '',
  baseLoad: '',
  targetReps: '',
  hint: '',
});

const cloneDraftExercises = (exercises: TrainingDraftExercise[]) =>
  exercises.map(exercise => ({
    ...exercise,
    sets: exercise.sets.map(setItem => ({...setItem})),
  }));

const cloneDraftState = (
  state: TrainingDraftExerciseState,
): TrainingDraftExerciseState => ({
  pendingExercises: cloneDraftExercises(state.pendingExercises),
  completedExercises: cloneDraftExercises(state.completedExercises),
});

const createRestTimerState = (
  durationSeconds = defaultRestTimerSeconds,
): SetRestTimerState => ({
  durationSeconds,
  remainingSeconds: durationSeconds,
  isRunning: false,
  endsAt: null,
});

const getSetRestTimerKey = (exerciseId: string, setId: string) =>
  `${exerciseId}:${setId}`;

const removeRestTimerKeys = (
  timers: Record<string, SetRestTimerState>,
  timerKeys: string[],
) => {
  const nextTimers = {...timers};

  timerKeys.forEach(timerKey => {
    delete nextTimers[timerKey];
  });

  return nextTimers;
};

const loadExercisePerformanceRecords = async (
  userId: string,
  workout: WorkoutDetail,
): Promise<ExercisePerformanceRecords> => {
  const entries = await Promise.all(
    workout.exercises.map(async exercise => {
      const progress = await getExerciseProgress(userId, exercise.name);
      const performanceRecord = getExercisePerformanceRecord(progress.points);

      return performanceRecord ? ([exercise.id, performanceRecord] as const) : null;
    }),
  );

  return Object.fromEntries(
    entries.filter(
      (entry): entry is readonly [string, ExercisePerformanceRecord] =>
        entry !== null,
    ),
  );
};

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const muscleGroupDictionary = [
  {
    label: 'Peito',
    keywords: ['supino', 'crucifixo', 'crossover', 'voador', 'peck deck', 'peito'],
  },
  {
    label: 'Costas',
    keywords: ['remada', 'puxada', 'barra fixa', 'pull down', 'pulldown', 'costas'],
  },
  {
    label: 'Ombro',
    keywords: ['desenvolvimento', 'elevacao lateral', 'elevacao frontal', 'ombro'],
  },
  {
    label: 'Pernas',
    keywords: ['agachamento', 'leg press', 'extensora', 'flexora', 'panturrilha', 'stiff', 'afundo', 'perna'],
  },
  {
    label: 'Biceps',
    keywords: ['rosca', 'biceps'],
  },
  {
    label: 'Triceps',
    keywords: ['triceps', 'frances', 'testa', 'corda', 'mergulho'],
  },
  {
    label: 'Gluteos',
    keywords: ['gluteo', 'hip thrust', 'coice', 'abducao'],
  },
  {
    label: 'Core',
    keywords: ['abdominal', 'prancha', 'core'],
  },
];

const resolveMuscleGroupLabel = (exerciseName: string, workoutFocus: string) => {
  const normalizedExercise = normalizeToken(exerciseName);

  for (const entry of muscleGroupDictionary) {
    if (entry.keywords.some(keyword => normalizedExercise.includes(normalizeToken(keyword)))) {
      return entry.label;
    }
  }

  const normalizedFocus = normalizeToken(workoutFocus);

  for (const entry of muscleGroupDictionary) {
    if (entry.keywords.some(keyword => normalizedFocus.includes(normalizeToken(keyword)))) {
      return entry.label;
    }
  }

  return 'Outros';
};

const buildCompletionSummary = (
  workoutName: string,
  workoutFocus: string,
  exercises: TrainingDraftExercise[],
): WorkoutCompletionSummary => {
  const validSets = exercises.flatMap(exercise =>
    exercise.sets
      .map(set => ({
        exerciseName: exercise.exerciseName,
        load: parseLoadInputNumber(set.load),
        reps: parseNumber(set.reps),
        groupLabel: resolveMuscleGroupLabel(exercise.exerciseName, workoutFocus),
      }))
      .filter(
        set =>
          Number.isFinite(set.load) &&
          Number.isFinite(set.reps) &&
          set.load > 0 &&
          set.reps > 0,
      ),
  );

  if (validSets.length === 0) {
    throw new Error('Adicione pelo menos uma série válida antes de salvar.');
  }

  const loadValues = validSets.map(set => set.load);
  const repsValues = validSets.map(set => set.reps);
  const groupCounters = new Map<string, number>();

  validSets.forEach(set => {
    groupCounters.set(set.groupLabel, (groupCounters.get(set.groupLabel) ?? 0) + 1);
  });

  return {
    workoutName,
    totalSets: validSets.length,
    seriesByGroup: Array.from(groupCounters.entries())
      .map(([label, count]) => ({label, count}))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    maxLoad: Math.max(...loadValues),
    minLoad: Math.min(...loadValues),
    maxReps: Math.max(...repsValues),
    minReps: Math.min(...repsValues),
  };
};

export const TrainingSessionScreen = ({navigation, route}: Props) => {
  const session = useAppStore(state => state.session);
  const refreshData = useAppStore(state => state.refreshData);
  const showError = useAppStore(state => state.showError);
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [draftState, setDraftState] = useState<TrainingDraftExerciseState>(
    createEmptyTrainingDraftState(),
  );
  const [performedAt, setPerformedAt] = useState(() => toSessionDate(new Date()));
  const [overallNotes, setOverallNotes] = useState('');
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExerciseDraft, setNewExerciseDraft] = useState<NewExerciseDraft>(
    createEmptyNewExerciseDraft(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setToDelete, setSetToDelete] = useState<PendingSetDeletion>(null);
  const [completionSummary, setCompletionSummary] =
    useState<WorkoutCompletionSummary | null>(null);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [undoStack, setUndoStack] = useState<TrainingUndoSnapshot[]>([]);
  const [exercisePerformanceRecords, setExercisePerformanceRecords] =
    useState<ExercisePerformanceRecords>({});
  const [setRestTimers, setSetRestTimers] = useState<Record<string, SetRestTimerState>>(
    {},
  );
  const [activeRestTimerMenuKey, setActiveRestTimerMenuKey] = useState<
    string | null
  >(null);
  const [restTimerCompletionKey, setRestTimerCompletionKey] = useState<
    string | null
  >(null);
  const hasRunningRestTimer = Object.values(setRestTimers).some(
    timer => timer.isRunning,
  );
  const notifiedRestTimerKeysRef = useRef<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView | null>(null);
  const exercisePositions = useRef<number[]>([]);
  const exerciseLoadInputRefs = useRef<Array<TextInput | null>>([]);
  const draftAutosavePausedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const loadWorkout = async () => {
      if (!session) {
        setIsLoading(false);
        return;
      }

      draftAutosavePausedRef.current = false;

      try {
        const [detail, savedDraft] = await Promise.all([
          getWorkoutDetail(session.user.id, route.params.workoutId),
          getTrainingDraftAutosave(session.user.id, route.params.workoutId),
        ]);

        if (!active || !detail) {
          return;
        }

        const restoredDraftState = restoreTrainingDraftState(detail, savedDraft);
        const performanceRecords = await loadExercisePerformanceRecords(
          session.user.id,
          detail,
        ).catch(() => ({}));

        setWorkout(detail);
        setDraftState(restoredDraftState);
        setExercisePerformanceRecords(performanceRecords);
        setIsAddingExercise(false);
        setNewExerciseDraft(createEmptyNewExerciseDraft());

        setOverallNotes(savedDraft?.overallNotes ?? '');
        setPerformedAt(resolveTrainingDraftPerformedAt(savedDraft?.performedAt));

        setUndoStack([]);
        setHasLoadedDraft(true);
      } catch (error) {
        if (active) {
          showError(toUserMessage(error));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadWorkout();

    return () => {
      active = false;
    };
  }, [route.params.workoutId, session, showError]);

  useEffect(() => {
    if (!session || !workout || !hasLoadedDraft || isSaving) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (draftAutosavePausedRef.current) {
        return;
      }

      saveTrainingDraftAutosave(
        createTrainingDraftSnapshot({
          userId: session.user.id,
          workoutId: workout.id,
          performedAt: normalizeSessionDateInput(performedAt),
          overallNotes,
          pendingExercises: draftState.pendingExercises,
          completedExercises: draftState.completedExercises,
          updatedAt: new Date().toISOString(),
        }),
      ).catch(() => undefined);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [draftState, hasLoadedDraft, isSaving, overallNotes, performedAt, session, workout]);

  useEffect(() => {
    if (!hasRunningRestTimer) {
      return;
    }

    const intervalId = setInterval(() => {
      setSetRestTimers(currentTimers => {
        let hasChanges = false;
        const nextTimers = Object.fromEntries(
          Object.entries(currentTimers).map(([timerKey, timer]) => {
            if (!timer.isRunning || timer.endsAt === null) {
              return [timerKey, timer];
            }

            const remainingSeconds = Math.max(
              0,
              Math.ceil((timer.endsAt - Date.now()) / 1000),
            );

            if (
              remainingSeconds === timer.remainingSeconds &&
              (remainingSeconds > 0 || !timer.isRunning)
            ) {
              return [timerKey, timer];
            }

            hasChanges = true;

            return [
              timerKey,
              {
                ...timer,
                remainingSeconds,
                isRunning: remainingSeconds > 0,
                endsAt: remainingSeconds > 0 ? timer.endsAt : null,
              },
            ];
          }),
        );

        return hasChanges ? nextTimers : currentTimers;
      });
    }, 250);

    return () => clearInterval(intervalId);
  }, [hasRunningRestTimer]);

  useEffect(() => {
    Object.entries(setRestTimers).forEach(([timerKey, timer]) => {
      if (timer.remainingSeconds > 0 || timer.isRunning) {
        notifiedRestTimerKeysRef.current.delete(timerKey);
      }
    });

    const finishedTimerKey = Object.entries(setRestTimers).find(
      ([timerKey, timer]) =>
        timer.remainingSeconds === 0 &&
        !timer.isRunning &&
        timer.endsAt === null &&
        !notifiedRestTimerKeysRef.current.has(timerKey),
    )?.[0];

    if (!finishedTimerKey) {
      return;
    }

    notifiedRestTimerKeysRef.current.add(finishedTimerKey);
    setActiveRestTimerMenuKey(null);
    setRestTimerCompletionKey(finishedTimerKey);
  }, [setRestTimers]);

  const pushUndoSnapshot = () => {
    setUndoStack(current => [
      {
        draftState: cloneDraftState(draftState),
        performedAt: normalizeSessionDateInput(performedAt),
        overallNotes,
      },
      ...current,
    ].slice(0, MAX_UNDO_STEPS));
  };

  const handleUndoLastChange = () => {
    const [lastSnapshot, ...remainingSnapshots] = undoStack;

    if (!lastSnapshot) {
      return;
    }

    setDraftState(cloneDraftState(lastSnapshot.draftState));
    setPerformedAt(toSessionDate(lastSnapshot.performedAt));
    setOverallNotes(lastSnapshot.overallNotes);
    setUndoStack(remainingSnapshots);
  };

  const getRestTimerState = (timerKey: string) =>
    setRestTimers[timerKey] ?? createRestTimerState();

  const configureRestTimer = (timerKey: string, durationSeconds: number) => {
    notifiedRestTimerKeysRef.current.delete(timerKey);
    setSetRestTimers(current => ({
      ...current,
      [timerKey]: createRestTimerState(durationSeconds),
    }));
  };

  const toggleRestTimer = (timerKey: string) => {
    setSetRestTimers(current => {
      const timer = current[timerKey] ?? createRestTimerState();

      if (timer.isRunning) {
        const remainingSeconds =
          timer.endsAt === null
            ? timer.remainingSeconds
            : Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));

        return {
          ...current,
          [timerKey]: {
            ...timer,
            remainingSeconds,
            isRunning: false,
            endsAt: null,
          },
        };
      }

      const remainingSeconds =
        timer.remainingSeconds > 0 ? timer.remainingSeconds : timer.durationSeconds;

      notifiedRestTimerKeysRef.current.delete(timerKey);

      return {
        ...current,
        [timerKey]: {
          ...timer,
          remainingSeconds,
          isRunning: true,
          endsAt: Date.now() + remainingSeconds * 1000,
        },
      };
    });
  };

  const resetRestTimer = (timerKey: string) => {
    notifiedRestTimerKeysRef.current.delete(timerKey);
    setSetRestTimers(current => {
      const timer = current[timerKey] ?? createRestTimerState();

      return {
        ...current,
        [timerKey]: createRestTimerState(timer.durationSeconds),
      };
    });
  };

  const toggleRestTimerMenu = (timerKey: string) => {
    setActiveRestTimerMenuKey(current =>
      current === timerKey ? null : timerKey,
    );
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: UpdatableTrainingDraftSetField,
    value: string,
  ) => {
    const currentValue =
      draftState.pendingExercises[exerciseIndex]?.sets[setIndex]?.[field];

    if (currentValue === value) {
      return;
    }

    pushUndoSnapshot();
    setDraftState({
      ...draftState,
      pendingExercises: draftState.pendingExercises.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set, currentSetIndex) =>
            currentSetIndex === setIndex ? {...set, [field]: value} : set,
          ),
        };
      }),
    });
  };

  const addSet = (exerciseIndex: number) => {
    if (!draftState.pendingExercises[exerciseIndex]) {
      return;
    }

    pushUndoSnapshot();
    setDraftState({
      ...draftState,
      pendingExercises: addDraftSetToExercise(
        draftState.pendingExercises,
        exerciseIndex,
      ),
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = draftState.pendingExercises[exerciseIndex];
    const set = exercise?.sets[setIndex];

    if (!exercise || !set) {
      return;
    }

    pushUndoSnapshot();
    const timerKey = getSetRestTimerKey(exercise.workoutExerciseId, set.id);

    setSetRestTimers(current =>
      removeRestTimerKeys(current, [
        timerKey,
      ]),
    );
    notifiedRestTimerKeysRef.current.delete(timerKey);
    setActiveRestTimerMenuKey(current => (current === timerKey ? null : current));
    setRestTimerCompletionKey(current => (current === timerKey ? null : current));
    setDraftState({
      ...draftState,
      pendingExercises: draftState.pendingExercises.map((draftExercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return draftExercise;
        }

        const nextSets =
          draftExercise.sets.length === 1
            ? [createBlankSet()]
            : draftExercise.sets.filter(
                (_, currentSetIndex) => currentSetIndex !== setIndex,
              );

        return {
          ...draftExercise,
          sets: nextSets,
        };
      }),
    });
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate && selectedDate.getTime() !== performedAt.getTime()) {
      pushUndoSnapshot();
      setPerformedAt(toSessionDate(selectedDate));
    }
  };

  const handleOverallNotesChange = (value: string) => {
    if (value === overallNotes) {
      return;
    }

    pushUndoSnapshot();
    setOverallNotes(value);
  };

  const handleExerciseLayout =
    (exerciseIndex: number) => (event: LayoutChangeEvent) => {
      exercisePositions.current[exerciseIndex] = event.nativeEvent.layout.y;
    };

  const scrollToPendingExercise = (exerciseIndex: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(
          (exercisePositions.current[exerciseIndex] ?? 0) - theme.spacing.md,
          0,
        ),
        animated: true,
      });

      setTimeout(() => {
        exerciseLoadInputRefs.current[exerciseIndex]?.focus();
      }, 220);
    }, 40);
  };

  const handleFinishExercise = (exerciseIndex: number) => {
    const exercise = draftState.pendingExercises[exerciseIndex];

    if (!exercise || !canFinalizeTrainingDraftExercise(exercise)) {
      showError(
        'Preencha carga e reps válidos em todas as séries antes de finalizar o exercício.',
      );
      return;
    }

    const nextDraftState = finalizeTrainingDraftExercise(draftState, exerciseIndex);

    if (!nextDraftState) {
      return;
    }

    pushUndoSnapshot();
    setDraftState(nextDraftState);
    const removedTimerKeys = exercise.sets.map(set =>
      getSetRestTimerKey(exercise.workoutExerciseId, set.id),
    );
    setSetRestTimers(current =>
      removeRestTimerKeys(
        current,
        removedTimerKeys,
      ),
    );
    removedTimerKeys.forEach(timerKey =>
      notifiedRestTimerKeysRef.current.delete(timerKey),
    );
    setActiveRestTimerMenuKey(current =>
      current && removedTimerKeys.includes(current) ? null : current,
    );
    setRestTimerCompletionKey(current =>
      current && removedTimerKeys.includes(current) ? null : current,
    );

    if (nextDraftState.pendingExercises.length === 0) {
      return;
    }

    const targetExerciseIndex = Math.min(
      exerciseIndex,
      nextDraftState.pendingExercises.length - 1,
    );

    scrollToPendingExercise(targetExerciseIndex);
  };

  const handleMarkExerciseNotPerformed = (exerciseIndex: number) => {
    const exercise = draftState.pendingExercises[exerciseIndex];

    if (!exercise || exercise.status === 'not-performed') {
      return;
    }

    const nextDraftState = markTrainingDraftExerciseNotPerformed(
      draftState,
      exerciseIndex,
    );

    if (!nextDraftState) {
      return;
    }

    pushUndoSnapshot();
    setDraftState(nextDraftState);

    const removedTimerKeys = exercise.sets.map(set =>
      getSetRestTimerKey(exercise.workoutExerciseId, set.id),
    );
    setSetRestTimers(current => removeRestTimerKeys(current, removedTimerKeys));
    removedTimerKeys.forEach(timerKey =>
      notifiedRestTimerKeysRef.current.delete(timerKey),
    );
    setActiveRestTimerMenuKey(current =>
      current && removedTimerKeys.includes(current) ? null : current,
    );
    setRestTimerCompletionKey(current =>
      current && removedTimerKeys.includes(current) ? null : current,
    );

    const nextExerciseIndex = getNextTrainingExerciseIndex(
      exerciseIndex,
      nextDraftState.pendingExercises.length,
    );

    if (nextExerciseIndex !== null) {
      scrollToPendingExercise(nextExerciseIndex);
    }
  };

  const handleNewExerciseDraftChange = (
    field: keyof NewExerciseDraft,
    value: string,
  ) => {
    setNewExerciseDraft(current => ({...current, [field]: value}));
  };

  const handleAddTrainingExercise = () => {
    if (!newExerciseDraft.exerciseName.trim()) {
      showError('Informe o nome do exercício para adicionar ao treino.');
      return;
    }

    pushUndoSnapshot();
    const nextDraftState = addTrainingDraftExercise(draftState, newExerciseDraft);
    const targetExerciseIndex = nextDraftState.pendingExercises.length - 1;

    setDraftState(nextDraftState);
    setNewExerciseDraft(createEmptyNewExerciseDraft());
    setIsAddingExercise(false);
    scrollToPendingExercise(targetExerciseIndex);
  };

  const handleSave = async () => {
    if (!session || !workout) {
      return;
    }

    try {
      draftAutosavePausedRef.current = true;
      setIsSaving(true);
      const exercisesForSave = mergeTrainingDraftExercisesForSave(draftState);
      const summary = buildCompletionSummary(
        workout.name,
        workout.focus,
        exercisesForSave,
      );

      await saveTrainingSession(session.user.id, {
        workoutId: workout.id,
        workoutName: workout.name,
        focus: workout.focus,
        overallNotes,
        performedAt: normalizeSessionDateInput(performedAt),
        exercises: exercisesForSave.map(exercise => ({
          workoutExerciseId: exercise.workoutExerciseId,
          exerciseName: exercise.exerciseName,
          muscleGroup: exercise.muscleGroup,
          sets: exercise.sets.map(set => ({
            ...buildSessionSetLoadFields(set.load),
            reps: parseNumber(set.reps),
            note: set.note.trim(),
          })),
        })),
      });

      await deleteTrainingDraftAutosave(session.user.id, workout.id);
      await refreshData();
      setSetRestTimers({});
      notifiedRestTimerKeysRef.current.clear();
      setActiveRestTimerMenuKey(null);
      setRestTimerCompletionKey(null);
      setCompletionSummary(summary);
    } catch (error) {
      draftAutosavePausedRef.current = false;
      showError(toUserMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseCompletionModal = () => {
    setCompletionSummary(null);
    navigation.goBack();
  };

  const confirmSetDeletion = () => {
    if (!setToDelete) {
      return;
    }

    removeSet(setToDelete.exerciseIndex, setToDelete.setIndex);
    setSetToDelete(null);
  };

  return (
    <Screen scrollViewRef={scrollViewRef}>
      {isLoading ? (
        <Text style={styles.loadingText}>Preparando treino...</Text>
      ) : !workout ? (
        <EmptyState
          title="Treino não encontrado"
          description="Não foi possível carregar o template para execução."
        />
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.title}>{workout.name}</Text>
            <Text style={styles.subtitle}>
              {workout.focus} - {workout.exerciseCount} exercícios
            </Text>
            <View style={styles.heroActions}>
              <Button
                fullWidth={false}
                variant="secondary"
                label={formatDateLong(performedAt.toISOString())}
                onPress={() => setShowDatePicker(true)}
              />
              <Button
                fullWidth={false}
                variant="secondary"
                label="Desfazer alterações"
                icon={<Undo2 color={theme.colors.text} size={15} />}
                onPress={handleUndoLastChange}
                disabled={undoStack.length === 0}
              />
              <Button
                fullWidth={false}
                label={isSaving ? 'Salvando treino...' : 'Salvar treino'}
                icon={isSaving ? undefined : <Play color="#04110A" size={15} />}
                onPress={handleSave}
                disabled={isSaving}
              />
            </View>
          </View>

          {showDatePicker ? (
            <DateTimePicker
              value={performedAt}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          ) : null}

          <View style={styles.addExerciseBox}>
            <Button
              fullWidth={false}
              variant="secondary"
              label="Adicionar novo exercício"
              icon={<Plus color={theme.colors.text} size={15} />}
              onPress={() => setIsAddingExercise(current => !current)}
            />

            {isAddingExercise ? (
              <View style={styles.newExerciseForm}>
                <TextField
                  label="Nome do exercício"
                  placeholder="Ex: Elevação lateral"
                  value={newExerciseDraft.exerciseName}
                  onChangeText={value =>
                    handleNewExerciseDraftChange('exerciseName', value)
                  }
                />
                <TextField
                  label="Grupo muscular"
                  placeholder="Ex: Ombro"
                  value={newExerciseDraft.muscleGroup}
                  onChangeText={value =>
                    handleNewExerciseDraftChange('muscleGroup', value)
                  }
                />
                <View style={styles.newExerciseMetricsRow}>
                  <View style={styles.newExerciseMetricField}>
                    <TextField
                      label="Carga sugerida"
                      placeholder="0"
                      value={newExerciseDraft.baseLoad}
                      keyboardType="default"
                      maxLength={MAX_LOAD_LABEL_LENGTH}
                      onChangeText={value =>
                        handleNewExerciseDraftChange(
                          'baseLoad',
                          maskLoadInput(value),
                        )
                      }
                    />
                  </View>
                  <View style={styles.newExerciseMetricField}>
                    <TextField
                      label="Repetições"
                      placeholder="8-12"
                      value={newExerciseDraft.targetReps}
                      keyboardType="default"
                      onChangeText={value =>
                        handleNewExerciseDraftChange(
                          'targetReps',
                          maskRepRangeInput(value),
                        )
                      }
                    />
                  </View>
                </View>
                <TextField
                  label="Observação"
                  placeholder="Ex: controlar a descida"
                  value={newExerciseDraft.hint}
                  onChangeText={value =>
                    handleNewExerciseDraftChange('hint', value)
                  }
                  multiline
                />
                <View style={styles.newExerciseActions}>
                  <Button
                    fullWidth={false}
                    variant="secondary"
                    label="Cancelar"
                    onPress={() => {
                      setIsAddingExercise(false);
                      setNewExerciseDraft(createEmptyNewExerciseDraft());
                    }}
                  />
                  <Button
                    fullWidth={false}
                    label="Adicionar"
                    icon={<Plus color="#04110A" size={15} />}
                    onPress={handleAddTrainingExercise}
                  />
                </View>
              </View>
            ) : null}
          </View>

          <TextField
            label="Notas gerais da execução"
            placeholder="Como o treino se comportou hoje?"
            value={overallNotes}
            onChangeText={handleOverallNotesChange}
            multiline
          />

            <View style={styles.exerciseList}>
            {draftState.pendingExercises.length ? (
              draftState.pendingExercises.map((exercise, exerciseIndex) => {
                const isNotPerformed = exercise.status === 'not-performed';

                return (
              <View
                key={exercise.workoutExerciseId}
                style={[
                  styles.exerciseCard,
                  isNotPerformed ? styles.exerciseCardNotPerformed : null,
                ]}
                onLayout={handleExerciseLayout(exerciseIndex)}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderCopy}>
                    <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.muscleGroup} - alvo {exercise.targetReps}
                    </Text>
                    {isNotPerformed ? (
                      <Text style={styles.notPerformedBadge}>Não realizado</Text>
                    ) : null}
                  </View>
                  <View style={styles.exerciseHeaderActions}>
                    {!isNotPerformed ? (
                      <>
                        <Button
                          fullWidth={false}
                          variant="secondary"
                          label="Desfazer alteração"
                          icon={<Undo2 color={theme.colors.text} size={15} />}
                          onPress={handleUndoLastChange}
                          disabled={undoStack.length === 0}
                        />
                        <Button
                          fullWidth={false}
                          variant="secondary"
                          label="Não realizado"
                          icon={<XCircle color={theme.colors.text} size={15} />}
                          onPress={() => handleMarkExerciseNotPerformed(exerciseIndex)}
                        />
                    <Button
                      fullWidth={false}
                      variant="secondary"
                      label="Finalizar exercício"
                      icon={<ChevronRight color={theme.colors.text} size={15} />}
                      onPress={() => handleFinishExercise(exerciseIndex)}
                    />
                    <Button
                      fullWidth={false}
                      variant="secondary"
                      label="Nova série"
                      icon={<Plus color={theme.colors.text} size={15} />}
                      onPress={() => addSet(exerciseIndex)}
                    />
                      </>
                    ) : (
                      <Button
                        fullWidth={false}
                        variant="danger"
                        label="Não realizado"
                        icon={<XCircle color="#FFE8EC" size={15} />}
                        disabled
                      />
                    )}
                  </View>
                </View>

                {exercise.hint ? (
                  <Text style={styles.exerciseHint}>{exercise.hint}</Text>
                ) : null}

                {exercisePerformanceRecords[exercise.workoutExerciseId] ? (
                  <Text style={styles.exercisePerformanceRecord}>
                    Maior carga realizada:{' '}
                    {formatExercisePerformanceRecord(
                      exercisePerformanceRecords[exercise.workoutExerciseId],
                    )}
                  </Text>
                ) : null}

                {exercise.baseLoad ? (
                  <Text style={styles.exerciseLoadHint}>
                    Carga sugerida: {formatBaseLoadLabel(exercise.baseLoad)}
                  </Text>
                ) : null}

                {isNotPerformed ? (
                  <View style={styles.notPerformedPanel}>
                    <Text style={styles.notPerformedText}>
                      Este exercício foi marcado como não realizado e não entrará
                      no histórico salvo.
                    </Text>
                  </View>
                ) : exercise.sets.map((set, setIndex) => {
                  const timerKey = getSetRestTimerKey(
                    exercise.workoutExerciseId,
                    set.id,
                  );
                  const restTimer = getRestTimerState(timerKey);
                  const timerActionLabel = restTimer.isRunning
                    ? 'Pausar'
                    : restTimer.remainingSeconds === 0
                      ? 'Reiniciar'
                      : 'Iniciar';
                  const isRestTimerMenuOpen =
                    activeRestTimerMenuKey === timerKey;

                  return (
                    <View key={set.id} style={styles.setCard}>
                      <View style={styles.setHeader}>
                        <Text style={styles.setTitle}>
                          Série - {set.seriesNumber}
                        </Text>
                        <Pressable
                          hitSlop={10}
                          style={styles.deleteIconButton}
                          onPress={() =>
                            setSetToDelete({
                              exerciseIndex,
                              setIndex,
                            })
                          }>
                          <Trash2 color={theme.colors.textMuted} size={16} />
                        </Pressable>
                      </View>

                      <View style={styles.restTimerFloatArea}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Abrir opções de descanso. Tempo atual ${formatRestTimerTime(
                            restTimer.remainingSeconds,
                          )}`}
                          onPress={() => toggleRestTimerMenu(timerKey)}
                          style={({pressed}) => [
                            styles.restTimerFloatingButton,
                            restTimer.isRunning
                              ? styles.restTimerFloatingButtonActive
                              : null,
                            pressed ? styles.pressed : null,
                          ]}>
                          <Clock3
                            color={
                              restTimer.isRunning
                                ? '#04131B'
                                : theme.colors.accentSecondary
                            }
                            size={21}
                          />
                        </Pressable>

                        {isRestTimerMenuOpen ? (
                          <View style={styles.restTimerMenu}>
                            <View style={styles.restTimerMenuHeader}>
                              <View>
                                <Text style={styles.restTimerMenuTitle}>
                                  Editar tempo
                                </Text>
                                <Text style={styles.restTimerMenuStatus}>
                                  {restTimer.isRunning
                                    ? 'Rodando'
                                    : `${formatRestTimerTime(
                                        restTimer.durationSeconds,
                                      )} configurado`}
                                </Text>
                              </View>
                              <Text style={styles.restTimerMenuClock}>
                                {formatRestTimerTime(restTimer.remainingSeconds)}
                              </Text>
                            </View>
                            <View style={styles.restTimerPresetRow}>
                              {restTimerPresets.map(preset => {
                                const isActive =
                                  restTimer.durationSeconds === preset.seconds;

                                return (
                                  <Pressable
                                    key={preset.seconds}
                                    accessibilityRole="button"
                                    onPress={() =>
                                      configureRestTimer(timerKey, preset.seconds)
                                    }
                                    style={({pressed}) => [
                                      styles.restTimerPreset,
                                      isActive
                                        ? styles.restTimerPresetActive
                                        : null,
                                      pressed ? styles.pressed : null,
                                    ]}>
                                    <Text
                                      style={[
                                        styles.restTimerPresetText,
                                        isActive
                                          ? styles.restTimerPresetTextActive
                                          : null,
                                      ]}>
                                      {preset.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>

                            <View style={styles.restTimerActions}>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => toggleRestTimer(timerKey)}
                                style={({pressed}) => [
                                  styles.restTimerActionButton,
                                  restTimer.isRunning
                                    ? styles.restTimerActionButtonActive
                                    : null,
                                  pressed ? styles.pressed : null,
                                ]}>
                                <Text
                                  style={[
                                    styles.restTimerActionText,
                                    restTimer.isRunning
                                      ? styles.restTimerActionTextActive
                                      : null,
                                  ]}>
                                  {timerActionLabel}
                                </Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => resetRestTimer(timerKey)}
                                style={({pressed}) => [
                                  styles.restTimerResetButton,
                                  pressed ? styles.pressed : null,
                                ]}>
                                <Text style={styles.restTimerResetText}>
                                  Resetar
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : null}
                      </View>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricField}>
                        <Text style={styles.metricLabel}>Carga</Text>
                        <TextInput
                          ref={input => {
                            if (setIndex === 0) {
                              exerciseLoadInputRefs.current[exerciseIndex] = input;
                            }
                          }}
                          value={set.load}
                          onChangeText={value =>
                            updateSet(
                              exerciseIndex,
                              setIndex,
                              'load',
                              maskLoadInput(value),
                            )
                          }
                          keyboardType="default"
                          maxLength={MAX_LOAD_LABEL_LENGTH}
                          placeholder="0"
                          placeholderTextColor={theme.colors.textSoft}
                          style={styles.metricInput}
                        />
                      </View>

                      <View style={styles.metricField}>
                        <Text style={styles.metricLabel}>Reps</Text>
                        <TextInput
                          value={set.reps}
                          onChangeText={value =>
                            updateSet(
                              exerciseIndex,
                              setIndex,
                              'reps',
                              maskIntegerInput(value),
                            )
                          }
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={theme.colors.textSoft}
                          style={styles.metricInput}
                        />
                      </View>
                    </View>

                    <TextField
                      label="Anotação da série"
                      placeholder="Ex: última repetição travou."
                      value={set.note}
                      onChangeText={value =>
                        updateSet(exerciseIndex, setIndex, 'note', value)
                      }
                    />
                    </View>
                  );
                })}

              </View>
                );
              })
            ) : (
              <EmptyState
                title="Exercícios finalizados"
                description="Agora restam apenas as anotações gerais e o botão de salvar treino."
              />
            )}
          </View>

          <Button
            label={isSaving ? 'Salvando treino...' : 'Salvar treino'}
            icon={isSaving ? undefined : <Play color="#04110A" size={15} />}
            onPress={handleSave}
            disabled={isSaving}
          />
        </>
      )}

      <ConfirmModal
        visible={setToDelete !== null}
        title="Excluir série?"
        description="Essa série será removida do treino atual."
        confirmLabel="Excluir série"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmSetDeletion}
        onCancel={() => setSetToDelete(null)}
      />

      <WorkoutCompletionModal
        visible={completionSummary !== null}
        summary={completionSummary}
        onClose={handleCloseCompletionModal}
      />

      <SuccessModal
        visible={restTimerCompletionKey !== null}
        message="Descanso finalizado. Inicie a nova série"
        actionLabel="Próxima série"
        onClose={() => setRestTimerCompletionKey(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  hero: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  addExerciseBox: {
    gap: theme.spacing.md,
  },
  newExerciseForm: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  newExerciseMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  newExerciseMetricField: {
    flex: 1,
    minWidth: 132,
  },
  newExerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  exerciseList: {
    gap: theme.spacing.md,
  },
  exerciseCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  exerciseCardNotPerformed: {
    borderColor: 'rgba(255,111,125,0.3)',
    backgroundColor: 'rgba(255,111,125,0.06)',
  },
  exerciseHeader: {
    gap: theme.spacing.sm,
  },
  exerciseHeaderCopy: {
    gap: 2,
  },
  exerciseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: theme.spacing.sm,
  },
  exerciseName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  exerciseMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  notPerformedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,111,125,0.14)',
    color: '#FFB8C0',
    fontSize: 12,
    fontWeight: '800',
  },
  notPerformedPanel: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,111,125,0.18)',
    backgroundColor: 'rgba(255,111,125,0.08)',
  },
  notPerformedText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  exerciseHint: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
  exerciseLoadHint: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  exercisePerformanceRecord: {
    ...theme.typography.caption,
    color: theme.colors.accentSecondary,
  },
  setCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.md,
    position: 'relative',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteIconButton: {
    padding: 4,
    borderRadius: theme.radius.sm,
  },
  setTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  restTimerFloatArea: {
    position: 'absolute',
    top: 54,
    right: theme.spacing.md,
    width: 220,
    gap: theme.spacing.sm,
    zIndex: 10,
    elevation: 10,
    alignItems: 'flex-end',
  },
  restTimerFloatingButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(81,199,255,0.34)',
    backgroundColor: 'rgba(15,19,26,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowOffset: {width: 0, height: 8},
    shadowRadius: 16,
    elevation: 6,
  },
  restTimerFloatingButtonActive: {
    borderColor: 'rgba(81,199,255,0.55)',
    backgroundColor: theme.colors.accentSecondary,
  },
  restTimerMenu: {
    width: 220,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowOffset: {width: 0, height: 8},
    shadowRadius: 14,
    elevation: 5,
  },
  restTimerMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  restTimerMenuTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  restTimerMenuStatus: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  restTimerMenuClock: {
    minWidth: 56,
    textAlign: 'right',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: theme.colors.accentSecondary,
    fontVariant: ['tabular-nums'],
  },
  restTimerPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  restTimerPreset: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  restTimerPresetActive: {
    borderColor: 'rgba(81,199,255,0.42)',
    backgroundColor: 'rgba(81,199,255,0.1)',
  },
  restTimerPresetText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  restTimerPresetTextActive: {
    color: theme.colors.accentSecondary,
  },
  restTimerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  restTimerActionButton: {
    minHeight: 38,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSecondary,
  },
  restTimerActionButtonActive: {
    backgroundColor: theme.colors.warning,
  },
  restTimerActionText: {
    ...theme.typography.caption,
    color: '#04131B',
    fontWeight: '700',
  },
  restTimerActionTextActive: {
    color: '#1A1200',
  },
  restTimerResetButton: {
    minHeight: 38,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  restTimerResetText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginTop: 54,
  },
  metricField: {
    flex: 1,
    minWidth: 132,
    gap: 6,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  metricInput: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    ...theme.typography.body,
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}],
  },
});
