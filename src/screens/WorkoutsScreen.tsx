import {useDeferredValue, useState} from 'react';
import {Alert, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';

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
  const refreshData = useAppStore(state => state.refreshData);
  const isRefreshing = useAppStore(state => state.isRefreshing);
  const session = useAppStore(state => state.session);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const normalized = deferredSearch.trim().toLowerCase();
  const filteredWorkouts = !normalized
    ? workouts
    : workouts.filter(workout =>
        `${workout.name} ${workout.focus} ${workout.notes}`
          .toLowerCase()
          .includes(normalized),
      );

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
        actionLabel="Criar"
        onPressAction={() => navigation.navigate('WorkoutForm')}
      />

      <TextField
        label="Buscar treino"
        placeholder="Push, pernas, upper..."
        value={search}
        onChangeText={setSearch}
      />

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
            description="Ajuste a busca ou crie um novo template para comecar."
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
  footerHint: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
