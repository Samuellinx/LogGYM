import {useEffect, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Controller, useFieldArray, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Plus, Trash2} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {Screen} from '@/components/Screen';
import {TagChip} from '@/components/TagChip';
import {TextField} from '@/components/TextField';
import {getWorkoutDetail, saveWorkout} from '@/features/workouts/workoutRepository';
import {
  type WorkoutFormValues,
  workoutFormSchema,
} from '@/features/workouts/workout.schemas';
import {RootStackParamList} from '@/navigation/types';
import {theme} from '@/theme';
import {useAppStore} from '@/store/useAppStore';
import {accentOptions, focusOptions, muscleGroupOptions, weekdayOptions} from '@/utils/constants';
import {toUserMessage} from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutForm'>;

const defaultValues: WorkoutFormValues = {
  name: '',
  focus: 'Push',
  notes: '',
  accentColor: accentOptions[0],
  scheduledDay: 'Segunda',
  exercises: [
    {
      name: '',
      muscleGroup: 'Peito',
      targetReps: '8-10',
      note: '',
    },
  ],
};

export const WorkoutFormScreen = ({navigation, route}: Props) => {
  const session = useAppStore(state => state.session);
  const refreshData = useAppStore(state => state.refreshData);
  const [isLoading, setIsLoading] = useState(Boolean(route.params?.workoutId));
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: {errors},
  } = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues,
  });

  const {fields, append, remove} = useFieldArray({
    control,
    name: 'exercises',
  });

  const selectedFocus = watch('focus');
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
          exercises: detail.exercises.map(exercise => ({
            id: exercise.id,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            targetReps: exercise.targetReps,
            note: exercise.note,
          })),
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

  const onSubmit = async (values: WorkoutFormValues) => {
    if (!session) {
      return;
    }

    try {
      setIsSaving(true);
      const workoutId = await saveWorkout(
        session.user.id,
        values,
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

  return (
    <Screen scroll={!isLoading} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {route.params?.workoutId ? 'Editar treino' : 'Novo treino'}
      </Text>
      <Text style={styles.subtitle}>
        Monte o template com foco, cor e exercicios para o fluxo rapido do dia a dia.
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
                placeholder="Ex: Push pesado"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.name?.message}
              />
            )}
          />

          <View style={styles.group}>
            <Text style={styles.groupLabel}>Foco</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {focusOptions.map(focus => (
                  <TagChip
                    key={focus}
                    label={focus}
                    active={selectedFocus === focus}
                    onPress={() =>
                      setValue('focus', focus, {shouldDirty: true, shouldValidate: true})
                    }
                    accentColor={selectedAccent}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

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
            <View style={styles.colorRow}>
              {accentOptions.map(color => (
                <TagChip
                  key={color}
                  label={color.replace('#', '')}
                  active={selectedAccent === color}
                  onPress={() =>
                    setValue('accentColor', color, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  accentColor={color}
                />
              ))}
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
            <View>
              <Text style={styles.exerciseTitle}>Exercicios</Text>
              <Text style={styles.exerciseSubtitle}>
                Estruture a ordem do treino e deixe observacoes por exercicio.
              </Text>
            </View>

            <Button
              fullWidth={false}
              variant="secondary"
              label="Adicionar"
              icon={<Plus color={theme.colors.text} size={16} />}
              onPress={() =>
                append({
                  name: '',
                  muscleGroup: muscleGroupOptions[0],
                  targetReps: '8-10',
                  note: '',
                })
              }
            />
          </View>

          {fields.map((field, index) => (
            <View key={field.id} style={styles.exerciseCard}>
              <View style={styles.exerciseCardHeader}>
                <Text style={styles.exerciseCardTitle}>Exercicio {index + 1}</Text>
                {fields.length > 1 ? (
                  <Pressable onPress={() => remove(index)}>
                    <Trash2 color={theme.colors.danger} size={18} />
                  </Pressable>
                ) : null}
              </View>

              <Controller
                control={control}
                name={`exercises.${index}.name`}
                render={({field: currentField}) => (
                  <TextField
                    label="Nome"
                    placeholder="Ex: Supino inclinado"
                    value={currentField.value}
                    onChangeText={currentField.onChange}
                    error={errors.exercises?.[index]?.name?.message}
                  />
                )}
              />

              <View style={styles.group}>
                <Text style={styles.groupLabel}>Grupo muscular</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {muscleGroupOptions.map(group => (
                      <TagChip
                        key={group}
                        label={group}
                        active={watch(`exercises.${index}.muscleGroup`) === group}
                        onPress={() =>
                          setValue(`exercises.${index}.muscleGroup`, group, {
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

              <Controller
                control={control}
                name={`exercises.${index}.targetReps`}
                render={({field: currentField}) => (
                  <TextField
                    label="Faixa de repeticoes"
                    placeholder="Ex: 8-10"
                    value={currentField.value}
                    onChangeText={currentField.onChange}
                    error={errors.exercises?.[index]?.targetReps?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name={`exercises.${index}.note`}
                render={({field: currentField}) => (
                  <TextField
                    label="Observacao"
                    placeholder="Ex: fazer pausa no alongamento."
                    value={currentField.value}
                    onChangeText={currentField.onChange}
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
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  exerciseHeader: {
    gap: theme.spacing.sm,
  },
  exerciseTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  exerciseSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
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
});
