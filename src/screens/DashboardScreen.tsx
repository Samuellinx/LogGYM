import {useDeferredValue, useState} from 'react';
import {Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown} from 'react-native-reanimated';

import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {StatCard} from '@/components/StatCard';
import {TagChip} from '@/components/TagChip';
import {TextField} from '@/components/TextField';
import {WorkoutCard} from '@/components/WorkoutCard';
import {MainTabParamList, RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {
  formatCompactNumber,
  formatLoad,
  formatSessionDate,
} from '@/utils/formatters';

type AppNavigation = NavigationProp<MainTabParamList & RootStackParamList>;

export const DashboardScreen = () => {
  const navigation = useNavigation<AppNavigation>();
  const dashboard = useAppStore(state => state.dashboard);
  const session = useAppStore(state => state.session);
  const refreshData = useAppStore(state => state.refreshData);
  const isRefreshing = useAppStore(state => state.isRefreshing);
  const workouts = useAppStore(state => state.workouts);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const heroSubtitle = dashboard?.lastSession?.performedAt
    ? `Última sessão: ${formatSessionDate(dashboard.lastSession.performedAt)}`
    : 'Seu espaço está pronto para receber o primeiro treino.';
  const normalized = deferredSearch.trim().toLowerCase();
  const highlightedWorkouts = !normalized
    ? dashboard?.suggestedTemplates ?? []
    : workouts.filter(workout =>
        `${workout.name} ${workout.focus} ${workout.notes}`
          .toLowerCase()
          .includes(normalized),
      );
  const workoutSectionTitle = normalized ? 'Resultados da busca' : 'Treinos em foco';
  const workoutSectionSubtitle = normalized
    ? 'Toque em um treino para abrir, iniciar ou duplicar.'
    : 'Seus templates prontos para uso rápido';

  const openExerciseProgress = (exerciseName: string) => {
    navigation.navigate('ExerciseProgress', {exerciseName});
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
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroEyebrow}>Dashboard</Text>
          <Text style={styles.heroTitle}>
            {session?.user.givenName || session?.user.name}
          </Text>
        </View>
        <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsGridItem}>
          <StatCard
            compact
            label="Semana"
            value={String(dashboard?.weeklySessions ?? 0)}
            helper="Sessões registradas"
            onPress={() => navigation.navigate('History')}
          />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard
            compact
            label="Sets"
            value={formatCompactNumber(dashboard?.totalTrackedSets ?? 0)}
            helper="Sessões salvas"
            onPress={() => navigation.navigate('History')}
          />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard
            compact
            label="Templates"
            value={String(dashboard?.totalTemplates ?? 0)}
            helper="Treinos ativos"
            onPress={() => navigation.navigate('Workouts')}
          />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard
            compact
            label="Histórico"
            value={String(dashboard?.totalSessions ?? 0)}
            helper="Execuções totais"
            onPress={() => navigation.navigate('History')}
          />
        </View>
      </View>

      <TextField
        label="Pesquisar treinos"
        placeholder="Nome, foco ou anotação"
        value={search}
        onChangeText={setSearch}
      />

      <SectionHeader
        title={workoutSectionTitle}
        subtitle={workoutSectionSubtitle}
        actionLabel={normalized ? 'Treinos' : 'Novo'}
        onPressAction={() =>
          normalized
            ? navigation.navigate('Workouts')
            : navigation.navigate('WorkoutForm')
        }
      />

      {highlightedWorkouts.length ? (
        highlightedWorkouts.map((workout, index) => {
          return (
            <Animated.View
              key={workout.id}
              entering={FadeInDown.delay(40 * index).duration(320)}>
              <WorkoutCard
                workout={workout}
                onPress={() =>
                  navigation.navigate('WorkoutDetail', {workoutId: workout.id})
                }
              />
            </Animated.View>
          );
        })
      ) : (
        <EmptyState
          title="Nenhum treino encontrado"
          description={
            normalized
              ? 'Tente outro termo ou abra a aba de treinos para criar um novo.'
              : 'Crie seu primeiro template para registrar cargas e progresso.'
          }
        />
      )}

      <SectionHeader
        title="Recordes"
        subtitle="Cargas máximas observadas no histórico"
      />

      <View style={styles.recordList}>
        {dashboard?.personalRecords.length ? (
          dashboard.personalRecords.map(record => (
            <Pressable
              key={record.exerciseName}
              accessibilityRole="button"
              onPress={() => openExerciseProgress(record.exerciseName)}
              style={({pressed}) => [styles.recordCard, pressed ? styles.cardPressed : null]}>
              <Text style={styles.recordLabel}>{record.exerciseName}</Text>
              <Text style={styles.recordValue}>{formatLoad(record.maxLoad)}</Text>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="Sem recordes ainda"
            description="Registre sua primeira execução para liberar os indicadores de carga."
          />
        )}
      </View>

      <SectionHeader
        title="Exercícios recentes"
        subtitle="Atividade mais recente do seu histórico"
      />

      <View style={styles.exerciseList}>
        {dashboard?.recentExercises.length ? (
          dashboard.recentExercises.map(item => (
            <Pressable
              key={item.exerciseName}
              accessibilityRole="button"
              onPress={() => openExerciseProgress(item.exerciseName)}
              style={({pressed}) => [styles.exerciseCard, pressed ? styles.cardPressed : null]}>
              <View style={styles.exerciseCardHeader}>
                <Text style={styles.exerciseTitle}>{item.exerciseName}</Text>
                <TagChip label={formatLoad(item.maxLoad)} active />
              </View>
              <Text style={styles.exerciseMeta}>
                {item.totalSets} séries - {formatSessionDate(item.lastPerformedAt)}
              </Text>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="Histórico recente vazio"
            description="Assim que você registrar um treino, os exercícios aparecem aqui."
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  heroHeader: {
    gap: 4,
  },
  heroEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  statsGridItem: {
    width: '47%',
  },
  recordList: {
    gap: theme.spacing.sm,
  },
  recordCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordLabel: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  recordValue: {
    ...theme.typography.subtitle,
    color: theme.colors.accent,
  },
  exerciseList: {
    gap: theme.spacing.sm,
  },
  exerciseCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  exerciseTitle: {
    flex: 1,
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  exerciseMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{scale: 0.99}],
  },
});
