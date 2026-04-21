import {useDeferredValue, useState} from 'react';
import {Alert, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {CalendarDays, ClipboardPlus, X} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

import {Button} from '@/components/Button';
import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TextField} from '@/components/TextField';
import {WorkoutCard} from '@/components/WorkoutCard';
import {duplicateWorkout} from '@/features/workouts/workoutRepository';
import {MainTabParamList, RootStackParamList} from '@/navigation/types';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';
import {useAppStore} from '@/store/useAppStore';

type AppNavigation = NavigationProp<MainTabParamList & RootStackParamList>;

export const WorkoutsScreen = () => {
  const navigation = useNavigation<AppNavigation>();
  const workouts = useAppStore(state => state.workouts);
  const history = useAppStore(state => state.history);
  const refreshData = useAppStore(state => state.refreshData);
  const isRefreshing = useAppStore(state => state.isRefreshing);
  const session = useAppStore(state => state.session);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
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
      Alert.alert('Duplicar treino', toUserMessage(error));
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);

    if (event.type === 'set' && date) {
      setSelectedDate(date);
    }
  };

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
        <View style={styles.createCardHeader}>
          <View style={styles.createIconWrap}>
            <ClipboardPlus color="#04110A" size={20} />
          </View>
          <View style={styles.createCopy}>
            <Text style={styles.createTitle}>Criar novo treino</Text>
            <Text style={styles.createSubtitle}>
              Monte um template em poucos toques e deixe a rotina pronta para o treino.
            </Text>
          </View>
        </View>

        <Button
          label="Comecar agora"
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
          <CalendarDays color={theme.colors.accent} size={18} />
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
          filteredWorkouts.map(workout => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onPress={() => navigation.navigate('WorkoutDetail', {workoutId: workout.id})}
              onStart={() =>
                navigation.navigate('TrainingSession', {workoutId: workout.id})
              }
              onDuplicate={() => handleDuplicate(workout.id)}
            />
          ))
        ) : (
          <EmptyState
            title="Nenhum treino encontrado"
            description={
              selectedDateLabel
                ? 'Nao houve treino registrado nessa data. Escolha outro dia ou limpe o filtro.'
                : 'Ajuste a busca ou crie um novo template para comecar.'
            }
          />
        )}
      </View>

      <Text style={styles.footerHint}>
        Dica: duplique um treino e ajuste pequenos detalhes para montar splits
        diferentes sem recomecar do zero.
      </Text>
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
  createCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  createIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  createCopy: {
    flex: 1,
    gap: 4,
  },
  createTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  createSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
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
