import {useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Plus, Trash2} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {ConfirmModal} from '@/components/ConfirmModal';
import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {TextField} from '@/components/TextField';
import {
  getWorkoutDetail,
  saveTrainingSession,
} from '@/features/workouts/workoutRepository';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import type {WorkoutDetail} from '@/types/domain';
import {toUserMessage} from '@/utils/errors';
import {formatDateLong} from '@/utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingSession'>;

type DraftSet = {
  load: string;
  reps: string;
  note: string;
};

type DraftExercise = {
  workoutExerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  hint: string;
  sets: DraftSet[];
};

type PendingSetDeletion = {
  exerciseIndex: number;
  setIndex: number;
} | null;

const createBlankSet = (): DraftSet => ({
  load: '',
  reps: '',
  note: '',
});

const createDraftFromWorkout = (workout: WorkoutDetail): DraftExercise[] =>
  workout.exercises.map(exercise => ({
    workoutExerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    baseLoad: exercise.baseLoad,
    targetReps: exercise.targetReps,
    hint: exercise.note,
    sets: [createBlankSet()],
  }));

const parseNumber = (value: string) => Number(value.replace(',', '.').trim());

export const TrainingSessionScreen = ({navigation, route}: Props) => {
  const session = useAppStore(state => state.session);
  const refreshData = useAppStore(state => state.refreshData);
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [drafts, setDrafts] = useState<DraftExercise[]>([]);
  const [performedAt, setPerformedAt] = useState(new Date());
  const [overallNotes, setOverallNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setToDelete, setSetToDelete] = useState<PendingSetDeletion>(null);

  useEffect(() => {
    let active = true;

    const loadWorkout = async () => {
      if (!session) {
        return;
      }

      try {
        const detail = await getWorkoutDetail(session.user.id, route.params.workoutId);

        if (!active || !detail) {
          return;
        }

        setWorkout(detail);
        setDrafts(createDraftFromWorkout(detail));
      } catch (error) {
        if (active) {
          Alert.alert('Executar treino', toUserMessage(error));
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
  }, [route.params.workoutId, session]);

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof DraftSet,
    value: string,
  ) => {
    setDrafts(current =>
      current.map((exercise, currentExerciseIndex) => {
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
    );
  };

  const addSet = (exerciseIndex: number) => {
    setDrafts(current =>
      current.map((exercise, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? {...exercise, sets: [...exercise.sets, createBlankSet()]}
          : exercise,
      ),
    );
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setDrafts(current =>
      current.map((exercise, currentExerciseIndex) => {
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
    );
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate) {
      setPerformedAt(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!session || !workout) {
      return;
    }

    try {
      setIsSaving(true);

      await saveTrainingSession(session.user.id, {
        workoutId: workout.id,
        workoutName: workout.name,
        focus: workout.focus,
        overallNotes,
        performedAt: performedAt.toISOString(),
        exercises: drafts.map(exercise => ({
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

      await refreshData();
      Alert.alert('Treino salvo', 'Historico e indicadores atualizados com sucesso.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Salvar execucao', toUserMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSetDeletion = () => {
    if (!setToDelete) {
      return;
    }

    removeSet(setToDelete.exerciseIndex, setToDelete.setIndex);
    setSetToDelete(null);
  };

  return (
    <Screen>
      {isLoading ? (
        <Text style={styles.loadingText}>Preparando treino...</Text>
      ) : !workout ? (
        <EmptyState
          title="Treino nao encontrado"
          description="Nao foi possivel carregar o template para execucao."
        />
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.title}>{workout.name}</Text>
            <Text style={styles.subtitle}>
              {workout.focus} - {workout.exerciseCount} exercicios
            </Text>
            <Button
              fullWidth={false}
              variant="secondary"
              label={formatDateLong(performedAt.toISOString())}
              onPress={() => setShowDatePicker(true)}
            />
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
            label="Notas gerais da execucao"
            placeholder="Como o treino se comportou hoje?"
            value={overallNotes}
            onChangeText={setOverallNotes}
            multiline
          />

          <View style={styles.exerciseList}>
            {drafts.map((exercise, exerciseIndex) => (
              <View key={exercise.workoutExerciseId} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderCopy}>
                    <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.muscleGroup} - alvo {exercise.targetReps}
                    </Text>
                  </View>
                  <Button
                    fullWidth={false}
                    variant="secondary"
                    label="Nova serie"
                    icon={<Plus color={theme.colors.text} size={15} />}
                    onPress={() => addSet(exerciseIndex)}
                  />
                </View>

                {exercise.hint ? (
                  <Text style={styles.exerciseHint}>{exercise.hint}</Text>
                ) : null}

                {exercise.baseLoad ? (
                  <Text style={styles.exerciseLoadHint}>
                    Carga sugerida: {exercise.baseLoad}
                  </Text>
                ) : null}

                {exercise.sets.map((set, setIndex) => (
                  <View key={`${exercise.workoutExerciseId}-${setIndex}`} style={styles.setCard}>
                    <View style={styles.setHeader}>
                      <Text style={styles.setTitle}>Serie {setIndex + 1}</Text>
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
                          value={set.load}
                          onChangeText={value =>
                            updateSet(exerciseIndex, setIndex, 'load', value)
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
                            updateSet(exerciseIndex, setIndex, 'reps', value)
                          }
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={theme.colors.textSoft}
                          style={styles.metricInput}
                        />
                      </View>
                    </View>

                    <TextField
                      label="Anotacao da serie"
                      placeholder="Ex: ultima repeticao travou."
                      value={set.note}
                      onChangeText={value =>
                        updateSet(exerciseIndex, setIndex, 'note', value)
                      }
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>

          <Button
            label={isSaving ? 'Salvando execucao...' : 'Salvar execucao'}
            onPress={handleSave}
            disabled={isSaving}
          />
        </>
      )}

      <ConfirmModal
        visible={setToDelete !== null}
        title="Excluir serie?"
        description="Essa serie sera removida do treino atual."
        confirmLabel="Excluir serie"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmSetDeletion}
        onCancel={() => setSetToDelete(null)}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  exerciseHeaderCopy: {
    flex: 1,
    gap: 2,
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
    gap: theme.spacing.md,
  },
  metricField: {
    flex: 1,
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
