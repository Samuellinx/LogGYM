import {Alert, RefreshControl, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown} from 'react-native-reanimated';

import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {StatCard} from '@/components/StatCard';
import {TagChip} from '@/components/TagChip';
import {WorkoutCard} from '@/components/WorkoutCard';
import {duplicateWorkout} from '@/features/workouts/workoutRepository';
import {MainTabParamList, RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';
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

  const heroSubtitle = dashboard?.lastSession?.performedAt
    ? `Ultima sessao: ${formatSessionDate(dashboard.lastSession.performedAt)}`
    : 'Seu espaco esta pronto para receber o primeiro treino.';

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
      <LinearGradient
        colors={['#121A24', '#0C1017', '#122014']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.hero}>
        <Text style={styles.heroEyebrow}>BEM-VINDO DE VOLTA</Text>
        <Text style={styles.heroTitle}>{session?.user.givenName || session?.user.name}</Text>
        <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatCard
          label="Semana"
          value={String(dashboard?.weeklySessions ?? 0)}
          helper="sessoes registradas"
        />
        <StatCard
          label="Sets"
          value={formatCompactNumber(dashboard?.totalTrackedSets ?? 0)}
          helper="series salvas"
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Templates"
          value={String(dashboard?.totalTemplates ?? 0)}
          helper="treinos ativos"
        />
        <StatCard
          label="Historico"
          value={String(dashboard?.totalSessions ?? 0)}
          helper="execucoes totais"
        />
      </View>

      <SectionHeader
        title="Treinos em foco"
        subtitle="Seus templates prontos para uso rapido"
        actionLabel="Novo"
        onPressAction={() => navigation.navigate('WorkoutForm')}
      />

      {dashboard?.suggestedTemplates.length ? (
        dashboard.suggestedTemplates.map((workout, index) => (
          <Animated.View
            key={workout.id}
            entering={FadeInDown.delay(40 * index).duration(320)}>
            <WorkoutCard
              workout={workout}
              onPress={() => navigation.navigate('WorkoutDetail', {workoutId: workout.id})}
              onStart={() =>
                navigation.navigate('TrainingSession', {workoutId: workout.id})
              }
              onDuplicate={() => handleDuplicate(workout.id)}
            />
          </Animated.View>
        ))
      ) : (
        <EmptyState
          title="Nenhum treino criado ainda"
          description="Crie seu primeiro template para registrar cargas e progresso."
        />
      )}

      <SectionHeader
        title="Recordes"
        subtitle="Cargas maximas observadas no historico"
      />

      <View style={styles.recordList}>
        {dashboard?.personalRecords.length ? (
          dashboard.personalRecords.map(record => (
            <View key={record.exerciseName} style={styles.recordCard}>
              <Text style={styles.recordLabel}>{record.exerciseName}</Text>
              <Text style={styles.recordValue}>{formatLoad(record.maxLoad)}</Text>
            </View>
          ))
        ) : (
          <EmptyState
            title="Sem recordes ainda"
            description="Registre sua primeira execucao para liberar os indicadores de carga."
          />
        )}
      </View>

      <SectionHeader
        title="Exercicios recentes"
        subtitle="Atividade mais recente do seu historico"
      />

      <View style={styles.exerciseList}>
        {dashboard?.recentExercises.length ? (
          dashboard.recentExercises.map(item => (
            <View key={item.exerciseName} style={styles.exerciseCard}>
              <View style={styles.exerciseCardHeader}>
                <Text style={styles.exerciseTitle}>{item.exerciseName}</Text>
                <TagChip label={formatLoad(item.maxLoad)} active />
              </View>
              <Text style={styles.exerciseMeta}>
                {item.totalSets} series - {formatSessionDate(item.lastPerformedAt)}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState
            title="Historico recente vazio"
            description="Assim que voce registrar um treino, os exercicios aparecem aqui."
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  heroEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...theme.typography.display,
    color: theme.colors.text,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  recordList: {
    gap: theme.spacing.sm,
  },
  recordCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
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
    borderRadius: theme.radius.lg,
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
});
