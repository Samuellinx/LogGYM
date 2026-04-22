import {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Repeat2, Trash2} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {ConfirmModal} from '@/components/ConfirmModal';
import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TagChip} from '@/components/TagChip';
import {
  deleteWorkout,
  duplicateWorkout,
  getWorkoutDetail,
} from '@/features/workouts/workoutRepository';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {formatBaseLoadLabel} from '@/utils/baseLoad';
import {toUserMessage} from '@/utils/errors';
import {formatSessionDate} from '@/utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

export const WorkoutDetailScreen = ({navigation, route}: Props) => {
  const session = useAppStore(state => state.session);
  const refreshData = useAppStore(state => state.refreshData);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getWorkoutDetail>>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!session) {
        return;
      }

      setIsLoading(true);

      try {
        const data = await getWorkoutDetail(session.user.id, route.params.workoutId);

        if (active) {
          setDetail(data);
        }
      } catch (error) {
        if (active) {
          Alert.alert('Detalhe do treino', toUserMessage(error));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    const unsubscribe = navigation.addListener('focus', load);
    load();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigation, route.params.workoutId, session]);

  const handleDelete = async () => {
    if (!session || !detail) {
      return;
    }

    try {
      await deleteWorkout(session.user.id, detail.id);
      await refreshData();
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Excluir treino', toUserMessage(error));
    }
  };

  const handleDuplicate = async () => {
    if (!session || !detail) {
      return;
    }

    try {
      const duplicatedId = await duplicateWorkout(session.user.id, detail.id);
      await refreshData();
      navigation.replace('WorkoutDetail', {workoutId: duplicatedId});
    } catch (error) {
      Alert.alert('Duplicar treino', toUserMessage(error));
    }
  };

  return (
    <Screen>
      {isLoading ? (
        <Text style={styles.loadingText}>Carregando detalhe do treino...</Text>
      ) : !detail ? (
        <EmptyState
          title="Treino nao encontrado"
          description="Este template pode ter sido removido ou nao pertence mais a esta sessao."
        />
      ) : (
        <>
          <View style={[styles.hero, {borderLeftColor: detail.accentColor}]}>
            <Text style={styles.heroTitle}>{detail.name}</Text>
            <Text style={styles.heroSubtitle}>
              {detail.focus} - {detail.exerciseCount} exercicios - ultima vez{' '}
              {formatSessionDate(detail.lastPerformedAt)}
            </Text>
            <Text style={styles.heroNotes}>
              {detail.notes || 'Sem observacoes extras para este treino.'}
            </Text>
            <View style={styles.heroActions}>
              <Button
                fullWidth={false}
                label="Iniciar treino"
                onPress={() =>
                  navigation.navigate('TrainingSession', {workoutId: detail.id})
                }
              />
              <Button
                fullWidth={false}
                variant="secondary"
                label="Editar"
                onPress={() =>
                  navigation.navigate('WorkoutForm', {workoutId: detail.id})
                }
              />
            </View>
          </View>

          <View style={styles.secondaryActions}>
            <Button
              fullWidth={false}
              variant="secondary"
              label="Duplicar"
              icon={<Repeat2 color={theme.colors.text} size={16} />}
              onPress={handleDuplicate}
            />
            <Button
              fullWidth={false}
              variant="danger"
              label="Excluir"
              icon={<Trash2 color="#FFE8EC" size={16} />}
              onPress={() => setShowDeleteModal(true)}
            />
          </View>

          <SectionHeader
            title="Exercicios"
            subtitle="Toque em um exercicio para abrir a evolucao de carga"
          />

          <View style={styles.exerciseList}>
            {detail.exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseIndex}>{index + 1}</Text>
                  <View style={styles.exerciseCopy}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.muscleGroup} - alvo {exercise.targetReps}
                    </Text>
                  </View>
                </View>

                {exercise.baseLoad ? (
                  <Text style={styles.exerciseLoad}>
                    Carga sugerida: {formatBaseLoadLabel(exercise.baseLoad)}
                  </Text>
                ) : null}

                {exercise.note ? (
                  <Text style={styles.exerciseNote}>{exercise.note}</Text>
                ) : null}

                <TagChip
                  label="Ver evolucao"
                  active
                  accentColor={detail.accentColor}
                  onPress={() =>
                    navigation.navigate('ExerciseProgress', {
                      exerciseName: exercise.name,
                    })
                  }
                />
              </View>
            ))}
          </View>
        </>
      )}

      <ConfirmModal
        visible={showDeleteModal}
        title="Excluir treino?"
        description="Esse treino sera removido da sua lista. O historico ja salvo continua preservado."
        confirmLabel="Excluir treino"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
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
    borderLeftWidth: 4,
    gap: theme.spacing.sm,
  },
  heroTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  heroNotes: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  exerciseList: {
    gap: theme.spacing.sm,
  },
  exerciseCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  exerciseIndex: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    ...theme.typography.caption,
    fontWeight: '700',
  },
  exerciseCopy: {
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
  exerciseLoad: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  exerciseNote: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
});
