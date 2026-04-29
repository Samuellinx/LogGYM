import {useDeferredValue, useEffect, useState} from 'react';
import {Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {CalendarDays, Check, X} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

import {Button} from '@/components/Button';
import {ConfirmModal} from '@/components/ConfirmModal';
import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TextField} from '@/components/TextField';
import {WorkoutCard} from '@/components/WorkoutCard';
import {WorkoutConsultModal} from '@/components/WorkoutConsultModal';
import {
  deleteTrainingDraftAutosave,
  duplicateWorkout,
  getExerciseProgress,
  getWorkoutDetail,
  listStartedTrainingDraftWorkoutIds,
} from '@/features/workouts/workoutRepository';
import {
  getExercisePerformanceRecord,
  getTrainingStartActionConfig,
  type ExercisePerformanceRecord,
} from '@/features/workouts/trainingSessionUi';
import {MainTabParamList, RootStackParamList} from '@/navigation/types';
import {theme} from '@/theme';
import type {WorkoutDetail} from '@/types/domain';
import {toUserMessage} from '@/utils/errors';
import {useAppStore} from '@/store/useAppStore';

type AppNavigation = NavigationProp<MainTabParamList & RootStackParamList>;
type DraftToClear = {
  workoutId: string;
  workoutName: string;
} | null;
type ExercisePerformanceRecords = Record<string, ExercisePerformanceRecord>;

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

export const WorkoutsScreen = () => {
  const navigation = useNavigation<AppNavigation>();
  const workouts = useAppStore(state => state.workouts);
  const history = useAppStore(state => state.history);
  const refreshData = useAppStore(state => state.refreshData);
  const isRefreshing = useAppStore(state => state.isRefreshing);
  const session = useAppStore(state => state.session);
  const showError = useAppStore(state => state.showError);
  const [search, setSearch] = useState('');
  const [startedWorkoutIds, setStartedWorkoutIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftToClear, setDraftToClear] = useState<DraftToClear>(null);
  const [consultWorkout, setConsultWorkout] =
    useState<WorkoutDetail | null>(null);
  const [consultWorkoutRecords, setConsultWorkoutRecords] =
    useState<ExercisePerformanceRecords>({});
  const deferredSearch = useDeferredValue(search);

  const normalized = deferredSearch.trim().toLowerCase();
  const workoutsForDate = selectedDate
    ? new Set(
        history
          .filter(item => {
            if (!item.workoutId) {
              return false;
            }

            const itemDate = new Date(item.performedAt);

            return (
              itemDate.getDate() === selectedDate.getDate() &&
              itemDate.getMonth() === selectedDate.getMonth() &&
              itemDate.getFullYear() === selectedDate.getFullYear()
            );
          })
          .map(item => item.workoutId)
          .filter((workoutId): workoutId is string => Boolean(workoutId)),
      )
    : null;
  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = normalized
      ? `${workout.name} ${workout.focus} ${workout.notes}`
          .toLowerCase()
          .includes(normalized)
      : true;
    const matchesDate = workoutsForDate ? workoutsForDate.has(workout.id) : true;

    return matchesSearch && matchesDate;
  });
  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const handleDuplicate = async (workoutId: string) => {
    if (!session) {
      return;
    }

    try {
      const duplicatedId = await duplicateWorkout(session.user.id, workoutId);
      await refreshData();
      navigation.navigate('WorkoutDetail', {workoutId: duplicatedId});
    } catch (error) {
      showError(toUserMessage(error));
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);

    if (event.type === 'set' && date) {
      setSelectedDate(date);
    }
  };

  const handleClearTrainingDraft = async () => {
    if (!session || !draftToClear) {
      return;
    }

    try {
      await deleteTrainingDraftAutosave(session.user.id, draftToClear.workoutId);
      setStartedWorkoutIds(current =>
        current.filter(id => id !== draftToClear.workoutId),
      );
      setDraftToClear(null);
    } catch (error) {
      showError(toUserMessage(error));
    }
  };

  const handleConsultWorkout = async (workoutId: string) => {
    if (!session) {
      return;
    }

    try {
      const detail = await getWorkoutDetail(session.user.id, workoutId);

      if (!detail) {
        showError('Treino não encontrado para consulta.');
        return;
      }

      const performanceRecords = await loadExercisePerformanceRecords(
        session.user.id,
        detail,
      ).catch(() => ({}));

      setConsultWorkoutRecords(performanceRecords);
      setConsultWorkout(detail);
    } catch (error) {
      showError(
        toUserMessage(error, 'Não foi possível consultar este treino agora.'),
      );
    }
  };

  useEffect(() => {
    let active = true;

    const loadStartedWorkouts = async () => {
      if (!session) {
        if (active) {
          setStartedWorkoutIds([]);
        }
        return;
      }

      const startedIds = await listStartedTrainingDraftWorkoutIds(session.user.id);

      if (active) {
        setStartedWorkoutIds(startedIds);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadStartedWorkouts);
    loadStartedWorkouts().catch(() => undefined);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigation, session, workouts]);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          tintColor={theme.colors.accent}
          onRefresh={refreshData}
        />
      }>
      <SectionHeader
        title="Treinos"
        subtitle="Templates editaveis para sua rotina"
      />

      <LinearGradient
        colors={['#121D27', '#122A1A', '#0F131A']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.createCard}>
        <Text style={styles.createTitle}>Criar novo treino</Text>

        <Button
          label="Novo treino"
          icon={<Check color="#04110A" size={18} />}
          onPress={() => navigation.navigate('WorkoutForm')}
        />
      </LinearGradient>

      <TextField
        label="Buscar treino"
        placeholder="Peito, pernas, upper..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowDatePicker(true)}
          style={({pressed}) => [
            styles.calendarButton,
            pressed ? styles.filterPressed : null,
          ]}>
          <CalendarDays color={theme.colors.text} size={18} />
          <Text style={styles.calendarButtonLabel}>
            {selectedDateLabel ? selectedDateLabel : 'Filtrar por data'}
          </Text>
        </Pressable>

        {selectedDate ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedDate(null)}
            style={({pressed}) => [
              styles.clearButton,
              pressed ? styles.filterPressed : null,
            ]}>
            <X color={theme.colors.textMuted} size={16} />
          </Pressable>
        ) : null}
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={selectedDate ?? new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      ) : null}

      {selectedDateLabel ? (
        <Text style={styles.filterSummary}>
          Mostrando treinos registrados em {selectedDateLabel}.
        </Text>
      ) : null}

      <View style={styles.list}>
        {filteredWorkouts.length ? (
          filteredWorkouts.map(workout => {
            const startAction = getTrainingStartActionConfig(
              startedWorkoutIds.includes(workout.id),
            );

            return (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onPress={() =>
                  navigation.navigate('WorkoutDetail', {workoutId: workout.id})
                }
                onStart={() =>
                  navigation.navigate('TrainingSession', {workoutId: workout.id})
                }
                onConsult={() => handleConsultWorkout(workout.id)}
                onDuplicate={() => handleDuplicate(workout.id)}
                onClearTraining={() =>
                  setDraftToClear({
                    workoutId: workout.id,
                    workoutName: workout.name,
                  })
                }
                clearTrainingDisabled={!startedWorkoutIds.includes(workout.id)}
                startLabel={startAction.label}
                isResume={startAction.variant === 'resume'}
              />
            );
          })
        ) : (
          <EmptyState
            title="Nenhum treino encontrado"
            description={
              selectedDateLabel
                ? 'Não houve treino registrado nessa data. Escolha outro dia ou limpe o filtro.'
                : 'Ajuste a busca ou crie um novo template para comecar.'
            }
          />
        )}
      </View>

      <Text style={styles.footerHint}>
        Dica: duplique um treino e ajuste pequenos detalhes para montar splits
        diferentes sem recomecar do zero.
      </Text>

      <ConfirmModal
        visible={draftToClear !== null}
        title="Limpar treino?"
        description={
          draftToClear
            ? `O rascunho em andamento de ${draftToClear.workoutName} será apagado. As sessões já salvas continuam preservadas.`
            : ''
        }
        confirmLabel="Limpar treino"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleClearTrainingDraft}
        onCancel={() => setDraftToClear(null)}
      />
      <WorkoutConsultModal
        visible={consultWorkout !== null}
        workout={consultWorkout}
        performanceRecords={consultWorkoutRecords}
        onClose={() => {
          setConsultWorkout(null);
          setConsultWorkoutRecords({});
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  createCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  createTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  calendarButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  calendarButtonLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  clearButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPressed: {
    opacity: 0.92,
    transform: [{scale: 0.985}],
  },
  filterSummary: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
  footerHint: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
