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
import {ChevronRight, Play, Plus, Trash2} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {ConfirmModal} from '@/components/ConfirmModal';
import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {TextField} from '@/components/TextField';
import {
  WorkoutCompletionModal,
  type WorkoutCompletionSummary,
} from '@/components/WorkoutCompletionModal';
import {
  deleteTrainingDraftAutosave,
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
  canFinalizeTrainingDraftExercise,
  finalizeTrainingDraftExercise,
  mergeTrainingDraftExercisesForSave,
} from '@/features/workouts/trainingSessionUi';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import type {WorkoutDetail} from '@/types/domain';
import {formatBaseLoadLabel} from '@/utils/baseLoad';
import {toUserMessage} from '@/utils/errors';
import {formatDateLong} from '@/utils/formatters';
import {maskDecimalInput, maskIntegerInput} from '@/utils/inputMasks';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingSession'>;

type PendingSetDeletion = {
  exerciseIndex: number;
  setIndex: number;
} | null;

const parseNumber = (value: string) => Number(value.replace(',', '.').trim());
type UpdatableTrainingDraftSetField = 'load' | 'reps' | 'note';

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
        load: parseNumber(set.load),
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
  const [performedAt, setPerformedAt] = useState(new Date());
  const [overallNotes, setOverallNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setToDelete, setSetToDelete] = useState<PendingSetDeletion>(null);
  const [completionSummary, setCompletionSummary] =
    useState<WorkoutCompletionSummary | null>(null);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const exercisePositions = useRef<number[]>([]);
  const exerciseLoadInputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let active = true;

    const loadWorkout = async () => {
      if (!session) {
        setIsLoading(false);
        return;
      }

      try {
        const [detail, savedDraft] = await Promise.all([
          getWorkoutDetail(session.user.id, route.params.workoutId),
          getTrainingDraftAutosave(session.user.id, route.params.workoutId),
        ]);

        if (!active || !detail) {
          return;
        }

        setWorkout(detail);
        setDraftState(restoreTrainingDraftState(detail, savedDraft));

        if (savedDraft) {
          setOverallNotes(savedDraft.overallNotes);
          setPerformedAt(new Date(savedDraft.performedAt));
        }

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
    if (!session || !workout || !hasLoadedDraft) {
      return;
    }

    const timeoutId = setTimeout(() => {
      saveTrainingDraftAutosave(
        createTrainingDraftSnapshot({
          userId: session.user.id,
          workoutId: workout.id,
          performedAt: performedAt.toISOString(),
          overallNotes,
          pendingExercises: draftState.pendingExercises,
          completedExercises: draftState.completedExercises,
          updatedAt: new Date().toISOString(),
        }),
      ).catch(() => undefined);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [draftState, hasLoadedDraft, overallNotes, performedAt, session, workout]);

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: UpdatableTrainingDraftSetField,
    value: string,
  ) => {
    setDraftState(current => ({
      ...current,
      pendingExercises: current.pendingExercises.map((exercise, currentExerciseIndex) => {
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
    }));
  };

  const addSet = (exerciseIndex: number) => {
    setDraftState(current => ({
      ...current,
      pendingExercises: addDraftSetToExercise(
        current.pendingExercises,
        exerciseIndex,
      ),
    }));
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setDraftState(current => ({
      ...current,
      pendingExercises: current.pendingExercises.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return exercise;
        }

        const nextSets =
          exercise.sets.length === 1
            ? [createBlankSet()]
            : exercise.sets.filter(
                (_, currentSetIndex) => currentSetIndex !== setIndex,
              );

        return {
          ...exercise,
          sets: nextSets,
        };
      }),
    }));
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate) {
      setPerformedAt(selectedDate);
    }
  };

  const handleExerciseLayout =
    (exerciseIndex: number) => (event: LayoutChangeEvent) => {
      exercisePositions.current[exerciseIndex] = event.nativeEvent.layout.y;
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

    setDraftState(nextDraftState);

    if (nextDraftState.pendingExercises.length === 0) {
      return;
    }

    const targetExerciseIndex = Math.min(
      exerciseIndex,
      nextDraftState.pendingExercises.length - 1,
    );

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(
          (exercisePositions.current[targetExerciseIndex] ?? 0) - theme.spacing.md,
          0,
        ),
        animated: true,
      });

      setTimeout(() => {
        exerciseLoadInputRefs.current[targetExerciseIndex]?.focus();
      }, 220);
    }, 40);
  };

  const handleSave = async () => {
    if (!session || !workout) {
      return;
    }

    try {
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
        performedAt: performedAt.toISOString(),
        exercises: exercisesForSave.map(exercise => ({
          workoutExerciseId: exercise.workoutExerciseId,
          exerciseName: exercise.exerciseName,
          muscleGroup: exercise.muscleGroup,
          sets: exercise.sets.map(set => ({
            load: parseNumber(set.load),
            reps: parseNumber(set.reps),
            note: set.note.trim(),
          })),
        })),
      });

      await deleteTrainingDraftAutosave(session.user.id, workout.id);
      await refreshData();
      setCompletionSummary(summary);
    } catch (error) {
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

          <TextField
            label="Notas gerais da execução"
            placeholder="Como o treino se comportou hoje?"
            value={overallNotes}
            onChangeText={setOverallNotes}
            multiline
          />

            <View style={styles.exerciseList}>
            {draftState.pendingExercises.length ? (
              draftState.pendingExercises.map((exercise, exerciseIndex) => (
              <View
                key={exercise.workoutExerciseId}
                style={styles.exerciseCard}
                onLayout={handleExerciseLayout(exerciseIndex)}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderCopy}>
                    <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.muscleGroup} - alvo {exercise.targetReps}
                    </Text>
                  </View>
                  <View style={styles.exerciseHeaderActions}>
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
                  </View>
                </View>

                {exercise.hint ? (
                  <Text style={styles.exerciseHint}>{exercise.hint}</Text>
                ) : null}

                {exercise.baseLoad ? (
                  <Text style={styles.exerciseLoadHint}>
                    Carga sugerida: {formatBaseLoadLabel(exercise.baseLoad)}
                  </Text>
                ) : null}

                {exercise.sets.map((set, setIndex) => (
                  <View key={set.id} style={styles.setCard}>
                    <View style={styles.setHeader}>
                      <Text style={styles.setTitle}>Série - {set.seriesNumber}</Text>
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
                              maskDecimalInput(value),
                            )
                          }
                          keyboardType="decimal-pad"
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
                ))}

              </View>
              ))
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
  exerciseHint: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
  exerciseLoadHint: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  setCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.md,
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
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
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
});
