import {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Controller, useFieldArray, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {type NavigationAction} from '@react-navigation/native';
import {Check, Minus, Plus, Trash2} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {ConfirmModal} from '@/components/ConfirmModal';
import {Screen} from '@/components/Screen';
import {TagChip} from '@/components/TagChip';
import {TextField} from '@/components/TextField';
import {getWorkoutDetail, saveWorkout} from '@/features/workouts/workoutRepository';
import {
  type WorkoutFormValues,
  workoutFormSchema,
} from '@/features/workouts/workout.schemas';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {composeBaseLoad, formatBaseLoadLabel, parseBaseLoad} from '@/utils/baseLoad';
import {accentSpectrum, setTypeOptions, weekdayOptions} from '@/utils/constants';
import {toUserMessage} from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutForm'>;

const MAX_EXERCISES = 12;
const MAX_BATCH_SIZE = 6;

const createExerciseDraft = (): WorkoutFormValues['exercises'][number] => ({
  name: '',
  muscleGroup: setTypeOptions[2],
  baseLoadKg: '',
  baseLoadPlates: '',
  baseLoadLegacy: '',
  targetReps: '8-10',
  note: '',
});

const defaultValues: WorkoutFormValues = {
  name: '',
  focus: 'Treino',
  notes: '',
  accentColor: accentSpectrum[3],
  scheduledDay: 'Segunda',
  exercises: [createExerciseDraft()],
};

export const WorkoutFormScreen = ({navigation, route}: Props) => {
  const session = useAppStore(state => state.session);
  const refreshData = useAppStore(state => state.refreshData);
  const [isLoading, setIsLoading] = useState(Boolean(route.params?.workoutId));
  const [isSaving, setIsSaving] = useState(false);
  const [exerciseBatchCount, setExerciseBatchCount] = useState(1);
  const [exerciseToDelete, setExerciseToDelete] = useState<number | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const pendingNavigationAction = useRef<NavigationAction | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: {errors, isDirty},
  } = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues,
  });

  const {fields, append, remove} = useFieldArray({
    control,
    name: 'exercises',
  });

  const selectedAccent = watch('accentColor');
  const selectedDay = watch('scheduledDay');

  useEffect(() => {
    let active = true;

    const loadWorkout = async () => {
      if (!route.params?.workoutId || !session) {
        setIsLoading(false);
        return;
      }

      try {
        const detail = await getWorkoutDetail(session.user.id, route.params.workoutId);

        if (!active || !detail) {
          return;
        }

        reset({
          name: detail.name,
          focus: detail.focus,
          notes: detail.notes,
          accentColor: detail.accentColor,
          scheduledDay: detail.scheduledDay,
          exercises: detail.exercises.map(exercise => {
            const parsedLoad = parseBaseLoad(exercise.baseLoad);

            return {
              id: exercise.id,
              name: exercise.name,
              muscleGroup: exercise.muscleGroup,
              baseLoadKg: parsedLoad.kg,
              baseLoadPlates: parsedLoad.plates,
              baseLoadLegacy: parsedLoad.fallback,
              targetReps: exercise.targetReps,
              note: exercise.note,
            };
          }),
        });
      } catch (error) {
        if (active) {
          Alert.alert('Editar treino', toUserMessage(error));
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
  }, [reset, route.params?.workoutId, session]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (!isDirty || isSaving) {
        return;
      }

      event.preventDefault();
      pendingNavigationAction.current = event.data.action;
      setShowDiscardModal(true);
    });

    return unsubscribe;
  }, [isDirty, isSaving, navigation]);

  const onSubmit = async (values: WorkoutFormValues) => {
    if (!session) {
      return;
    }

    try {
      setIsSaving(true);
      const resolvedFocus = values.name.trim().slice(0, 30);
      const workoutId = await saveWorkout(
        session.user.id,
        {
          ...values,
          focus: resolvedFocus,
          exercises: values.exercises.map(exercise => ({
            id: exercise.id,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            baseLoad: composeBaseLoad({
              kg: exercise.baseLoadKg,
              plates: exercise.baseLoadPlates,
              fallback: exercise.baseLoadLegacy,
            }),
            targetReps: exercise.targetReps,
            note: exercise.note,
          })),
        },
        route.params?.workoutId,
      );

      await refreshData();
      navigation.replace('WorkoutDetail', {workoutId});
    } catch (error) {
      Alert.alert('Salvar treino', toUserMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const updateBatchCount = (direction: 'increase' | 'decrease') => {
    setExerciseBatchCount(current => {
      if (direction === 'increase') {
        return Math.min(MAX_BATCH_SIZE, current + 1);
      }

      return Math.max(1, current - 1);
    });
  };

  const appendExerciseBatch = () => {
    const remainingSlots = MAX_EXERCISES - fields.length;

    if (remainingSlots <= 0) {
      Alert.alert(
        'Limite atingido',
        `Este treino já chegou ao limite de ${MAX_EXERCISES} exercícios.`,
      );
      return;
    }

    const exercisesToAdd = Math.min(exerciseBatchCount, remainingSlots);

    append(Array.from({length: exercisesToAdd}, createExerciseDraft));

    if (exercisesToAdd < exerciseBatchCount) {
      Alert.alert(
        'Quantidade ajustada',
        `Foram adicionados ${exercisesToAdd} exercícios para respeitar o limite do treino.`,
      );
    }
  };

  const closeDiscardModal = () => {
    setShowDiscardModal(false);
    pendingNavigationAction.current = null;
  };

  const confirmDiscardAndLeave = () => {
    const action = pendingNavigationAction.current;

    setShowDiscardModal(false);
    pendingNavigationAction.current = null;

    if (action) {
      navigation.dispatch(action);
    }
  };

  const confirmExerciseDeletion = () => {
    if (exerciseToDelete === null) {
      return;
    }

    remove(exerciseToDelete);
    setExerciseToDelete(null);
  };

  return (
    <Screen scroll={!isLoading} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {route.params?.workoutId ? 'Editar treino' : 'Novo treino'}
      </Text>
      <Text style={styles.subtitle}>
        Monte o treino com cor, exercícios e anotações do jeito que você realmente usa.
      </Text>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Carregando treino...</Text>
        </View>
      ) : (
        <>
          <Controller
            control={control}
            name="name"
            render={({field}) => (
              <TextField
                label="Nome do treino"
                placeholder="Ex: Peito pesado"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.name?.message}
              />
            )}
          />

          <View style={styles.group}>
            <Text style={styles.groupLabel}>Dia sugerido</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <TagChip
                  label="Livre"
                  active={!selectedDay}
                  onPress={() =>
                    setValue('scheduledDay', null, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                {weekdayOptions.map(day => (
                  <TagChip
                    key={day}
                    label={day}
                    active={selectedDay === day}
                    onPress={() =>
                      setValue('scheduledDay', day, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    accentColor={selectedAccent}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>Cor destaque</Text>
            <View style={styles.selectedColorCard}>
              <View
                style={[
                  styles.selectedColorPreview,
                  {backgroundColor: selectedAccent},
                ]}
              />
              <Text style={styles.selectedColorText}>Cor selecionada</Text>
            </View>
            <View style={styles.colorGrid}>
              {accentSpectrum.map(color => {
                const isSelected = selectedAccent === color;

                return (
                  <Pressable
                    key={color}
                    accessibilityRole="button"
                    onPress={() =>
                      setValue('accentColor', color, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    style={({pressed}) => [
                      styles.colorSwatchWrap,
                      isSelected ? styles.colorSwatchWrapActive : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <View style={[styles.colorSwatch, {backgroundColor: color}]}>
                      {isSelected ? <Check color="#04110A" size={16} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Controller
            control={control}
            name="notes"
            render={({field}) => (
              <TextField
                label="Notas do treino"
                placeholder="Ex: priorizar carga nos compostos e controlar descanso."
                value={field.value}
                onChangeText={field.onChange}
                multiline
                error={errors.notes?.message}
              />
            )}
          />

          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseHeaderCopy}>
              <Text style={styles.exerciseTitle}>Exercícios</Text>
              <Text style={styles.exerciseSubtitle}>
                Defina ordem, carga, repeticoes e observações para cada bloco.
              </Text>
            </View>

            <View style={styles.batchCard}>
              <Text style={styles.batchLabel}>Adicionar por vez</Text>
              <View style={styles.batchControls}>
                <Pressable
                  onPress={() => updateBatchCount('decrease')}
                  style={({pressed}) => [
                    styles.batchStepper,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Minus color={theme.colors.text} size={14} />
                </Pressable>
                <View style={styles.batchCountPill}>
                  <Text style={styles.batchCountText}>{exerciseBatchCount}</Text>
                </View>
                <Pressable
                  onPress={() => updateBatchCount('increase')}
                  style={({pressed}) => [
                    styles.batchStepper,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Plus color={theme.colors.text} size={14} />
                </Pressable>
              </View>
              <Button
                fullWidth={false}
                variant="secondary"
                label={exerciseBatchCount > 1 ? `Adicionar ${exerciseBatchCount}` : 'Adicionar'}
                icon={<Plus color={theme.colors.text} size={16} />}
                onPress={appendExerciseBatch}
              />
            </View>
          </View>

          {fields.map((item, index) => (
            <View key={item.id} style={styles.exerciseCard}>
              <View style={styles.exerciseCardHeader}>
                <Text style={styles.exerciseCardTitle}>Exercício {index + 1}</Text>
                {fields.length > 1 ? (
                  <Pressable
                    hitSlop={10}
                    onPress={() => setExerciseToDelete(index)}
                    style={({pressed}) => [
                      styles.deleteIconButton,
                      pressed ? styles.pressed : null,
                    ]}>
                    <Trash2 color={theme.colors.danger} size={18} />
                  </Pressable>
                ) : null}
              </View>

              <Controller
                control={control}
                name={`exercises.${index}.name`}
                render={({field}) => (
                  <TextField
                    label="Nome"
                    placeholder="Ex: Supino inclinado"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.exercises?.[index]?.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name={`exercises.${index}.baseLoadKg`}
                render={({field}) => (
                  <TextField
                    label="Carga em Kg"
                    placeholder="Ex: 20"
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="decimal-pad"
                    error={errors.exercises?.[index]?.baseLoadKg?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name={`exercises.${index}.baseLoadPlates`}
                render={({field}) => (
                  <TextField
                    label="Carga em Plates"
                    placeholder="Ex: 2"
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="decimal-pad"
                    error={errors.exercises?.[index]?.baseLoadPlates?.message}
                  />
                )}
              />

              <View style={styles.loadPreviewCard}>
                <Text style={styles.loadPreviewLabel}>Vai aparecer no treino como</Text>
                <Text style={styles.loadPreviewValue}>
                  {formatBaseLoadLabel(
                    composeBaseLoad({
                      kg: watch(`exercises.${index}.baseLoadKg`) ?? '',
                      plates: watch(`exercises.${index}.baseLoadPlates`) ?? '',
                      fallback: watch(`exercises.${index}.baseLoadLegacy`) ?? '',
                    }),
                  ) || 'Sem carga sugerida'}
                </Text>
                {watch(`exercises.${index}.baseLoadLegacy`) ? (
                  <Text style={styles.loadPreviewHint}>
                    A carga antiga foi mantida como referência até você substituir por Kg e Plates.
                  </Text>
                ) : null}
              </View>

              <Controller
                control={control}
                name={`exercises.${index}.targetReps`}
                render={({field}) => (
                  <TextField
                    label="Faixa de repeticoes"
                    placeholder="Ex: 8-10"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.exercises?.[index]?.targetReps?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name={`exercises.${index}.note`}
                render={({field}) => (
                  <TextField
                    label="Observação"
                    placeholder="Ex: segurar 1 segundo no pico."
                    value={field.value}
                    onChangeText={field.onChange}
                    multiline
                    error={errors.exercises?.[index]?.note?.message}
                  />
                )}
              />
            </View>
          ))}

          <Button
            label={isSaving ? 'Salvando treino...' : 'Salvar treino'}
            onPress={handleSubmit(onSubmit)}
            disabled={isSaving}
          />
        </>
      )}

      <ConfirmModal
        visible={showDiscardModal}
        title="Tem certeza que deseja voltar?"
        description="Suas alterações não salvas serão perdidas."
        confirmLabel="Voltar mesmo assim"
        cancelLabel="Continuar editando"
        confirmVariant="danger"
        onConfirm={confirmDiscardAndLeave}
        onCancel={closeDiscardModal}
      />

      <ConfirmModal
        visible={exerciseToDelete !== null}
        title="Excluir exercício?"
        description="Esse exercício será removido do treino atual."
        confirmLabel="Excluir exercício"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmExerciseDeletion}
        onCancel={() => setExerciseToDelete(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  loadingWrap: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  group: {
    gap: theme.spacing.sm,
  },
  groupLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  selectedColorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedColorPreview: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
  },
  selectedColorText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  colorSwatchWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  colorSwatchWrapActive: {
    borderColor: theme.colors.text,
    borderWidth: 2,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseHeader: {
    gap: theme.spacing.md,
  },
  exerciseHeaderCopy: {
    gap: theme.spacing.xs,
  },
  exerciseTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  exerciseSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  batchCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  batchLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  batchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  batchStepper: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  batchCountPill: {
    minWidth: 48,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
  batchCountText: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  exerciseCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCardTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  loadPreviewCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  loadPreviewLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadPreviewValue: {
    ...theme.typography.body,
    color: theme.colors.accent,
  },
  loadPreviewHint: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,111,125,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,111,125,0.18)',
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}],
  },
});
