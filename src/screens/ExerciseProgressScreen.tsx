import {useEffect, useState} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {SparklineChart} from '@/components/SparklineChart';
import {StatCard} from '@/components/StatCard';
import {getExerciseProgress} from '@/features/workouts/workoutRepository';
import type {ExerciseProgressData} from '@/types/domain';
import {RootStackParamList} from '@/navigation/types';
import {theme} from '@/theme';
import {
  formatLoad,
  formatSessionDate,
  formatVolume,
} from '@/utils/formatters';
import {useAppStore} from '@/store/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseProgress'>;

export const ExerciseProgressScreen = ({route}: Props) => {
  const session = useAppStore(state => state.session);
  const [progress, setProgress] = useState<ExerciseProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const {width} = useWindowDimensions();

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!session) {
        return;
      }

      try {
        const data = await getExerciseProgress(session.user.id, route.params.exerciseName);

        if (active) {
          setProgress(data);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [route.params.exerciseName, session]);

  if (isLoading) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Carregando evolucao...</Text>
      </Screen>
    );
  }

  if (!progress || progress.points.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Sem histórico para este exercício"
          description="Assim que você registrar séries, a curva de carga aparece aqui."
        />
      </Screen>
    );
  }

  const recentPoints = [...progress.points].reverse().slice(0, 6);

  return (
    <Screen>
      <SectionHeader
        title={progress.exerciseName}
        subtitle={`Última execução ${formatSessionDate(progress.lastPerformedAt)}`}
      />

      <View style={styles.statRow}>
        <StatCard
          label="Recorde"
          value={formatLoad(progress.recordLoad)}
          helper="maior carga registrada"
        />
        <StatCard
          label="Reps medias"
          value={progress.averageReps.toFixed(1)}
          helper="média por série"
        />
      </View>

      <StatCard
        label="Volume"
        value={formatVolume(progress.totalVolume)}
        helper="soma de carga x repeticoes"
      />

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Curva de carga</Text>
        <SparklineChart values={progress.points.map(point => point.load)} width={width - 32} />
      </View>

      <SectionHeader
        title="Últimas séries"
        subtitle="Dados recentes para comparar sensação e técnica"
      />

      <View style={styles.recentList}>
        {recentPoints.map(point => (
          <View key={`${point.workoutName}-${point.performedAt}-${point.load}`} style={styles.pointCard}>
            <View style={styles.pointHeader}>
              <Text style={styles.pointWorkout}>{point.workoutName}</Text>
              <Text style={styles.pointLoad}>{formatLoad(point.load)}</Text>
            </View>
            <Text style={styles.pointMeta}>
              {point.reps} reps · {formatSessionDate(point.performedAt)}
            </Text>
            {point.note ? <Text style={styles.pointNote}>{point.note}</Text> : null}
          </View>
        ))}
      </View>
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
  statRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  chartCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  chartTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  recentList: {
    gap: theme.spacing.sm,
  },
  pointCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  pointWorkout: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  pointLoad: {
    ...theme.typography.subtitle,
    color: theme.colors.accent,
  },
  pointMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  pointNote: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
});
