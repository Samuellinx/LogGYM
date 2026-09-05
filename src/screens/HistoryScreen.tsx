import {useDeferredValue, useMemo, useState} from 'react';
import {Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {Trash2} from 'lucide-react-native';

import {ConfirmModal} from '@/components/ConfirmModal';
import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TagChip} from '@/components/TagChip';
import {TextField} from '@/components/TextField';
import {
  buildHistoryInsights,
  type HistorySessionProgress,
} from '@/features/workouts/historyInsights';
import {deleteTrainingSession} from '@/features/workouts/workoutRepository';
import {MainTabParamList, RootStackParamList} from '@/navigation/types';
import type {WorkoutHistoryItem} from '@/types/domain';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';
import {formatLoad, formatSessionDate, formatVolume} from '@/utils/formatters';
import {useAppStore} from '@/store/useAppStore';

type AppNavigation = NavigationProp<MainTabParamList & RootStackParamList>;

export const HistoryScreen = () => {
  const navigation = useNavigation<AppNavigation>();
  const session = useAppStore(state => state.session);
  const history = useAppStore(state => state.history);
  const refreshData = useAppStore(state => state.refreshData);
  const isRefreshing = useAppStore(state => state.isRefreshing);
  const showError = useAppStore(state => state.showError);
  const [search, setSearch] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<WorkoutHistoryItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const normalized = deferredSearch.trim().toLowerCase();
  const filteredHistory = !normalized
    ? history
    : history.filter(item =>
        `${item.workoutName} ${item.focus} ${item.exercises.join(' ')} ${item.overallNotes}`
          .toLowerCase()
          .includes(normalized),
      );

  const totalVolume = filteredHistory.reduce(
    (sum, item) => sum + item.totalVolume,
    0,
  );
  const historyInsights = useMemo(
    () => buildHistoryInsights(filteredHistory),
    [filteredHistory],
  );
  const maxWeeklyVolume = Math.max(
    ...historyInsights.weeklyTrend.map(week => week.totalVolume),
    1,
  );

  const formatSignedCount = (value: number, suffix: string) => {
    if (value === 0) {
      return `0 ${suffix}`;
    }

    return `${value > 0 ? '+' : '-'}${Math.abs(value)} ${suffix}`;
  };

  const formatSignedVolume = (value: number) => {
    if (value === 0) {
      return '0 kg';
    }

    return `${value > 0 ? '+' : '-'}${formatVolume(Math.abs(value))}`;
  };

  const formatSignedPercent = (value: number | null) => {
    if (value === null) {
      return 'sem semana anterior';
    }

    if (value === 0) {
      return '0%';
    }

    return `${value > 0 ? '+' : '-'}${Math.abs(value).toFixed(0)}%`;
  };

  const getSessionProgressLabel = (progress?: HistorySessionProgress) => {
    if (!progress) {
      return 'Sem comparação';
    }

    if (progress.isFirstForWorkout) {
      return 'Primeira execução deste treino';
    }

    if (progress.volumeDelta === null) {
      return 'Sem execução anterior';
    }

    return `${formatSignedVolume(progress.volumeDelta)} vs treino anterior`;
  };

  const handleDeleteSession = async () => {
    if (!session || !sessionToDelete || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTrainingSession(session.user.id, sessionToDelete.id);
      setSessionToDelete(null);
      await refreshData();
    } catch (error) {
      showError(
        toUserMessage(error, 'Não foi possível excluir a execução agora.'),
      );
    } finally {
      setIsDeleting(false);
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
        title="Histórico"
        subtitle="Cada execução salva fica disponível para comparação"
      />

      <TextField
        label="Buscar no histórico"
        placeholder="Supino, legs, upper..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {filteredHistory.length} sessões - {formatVolume(totalVolume)} de volume total
        </Text>
      </View>

      <View style={styles.insightGrid}>
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>Treinos na semana</Text>
          <Text style={styles.insightValue}>
            {historyInsights.currentWeek.sessions}
          </Text>
          <Text style={styles.insightDelta}>
            {formatSignedCount(historyInsights.comparison.sessionsDelta, 'sessões')}
          </Text>
        </View>
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>Volume semanal</Text>
          <Text style={styles.insightValue}>
            {formatVolume(historyInsights.currentWeek.totalVolume)}
          </Text>
          <Text style={styles.insightDelta}>
            {formatSignedPercent(historyInsights.comparison.volumePercent)}
          </Text>
        </View>
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>Séries concluídas</Text>
          <Text style={styles.insightValue}>
            {historyInsights.currentWeek.totalSets}
          </Text>
          <Text style={styles.insightDelta}>
            {formatSignedCount(historyInsights.comparison.setsDelta, 'séries')}
          </Text>
        </View>
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>Maior carga</Text>
          <Text style={styles.insightValue}>
            {formatLoad(historyInsights.currentWeek.topLoad)}
          </Text>
          <Text style={styles.insightDelta}>
            {formatSignedVolume(historyInsights.comparison.topLoadDelta)}
          </Text>
        </View>
      </View>

      <View style={styles.progressPanel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Progresso semana a semana</Text>
          <Text style={styles.panelSubtitle}>Volume e consistência recente</Text>
        </View>
        <View style={styles.weeklyList}>
          {historyInsights.weeklyTrend.map(week => {
            const barWidth = Math.max((week.totalVolume / maxWeeklyVolume) * 100, 0);

            return (
              <View key={week.startsAt} style={styles.weekRow}>
                <Text style={styles.weekLabel}>{week.label}</Text>
                <View style={styles.weekTrack}>
                  <View
                    style={[
                      styles.weekBar,
                      {width: `${barWidth}%`},
                    ]}
                  />
                </View>
                <Text style={styles.weekValue}>
                  {week.sessions}x - {formatVolume(week.totalVolume)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.progressPanel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Foco da semana</Text>
          <Text style={styles.panelSubtitle}>Distribuição por volume treinado</Text>
        </View>
        {historyInsights.focusDistribution.length ? (
          <View style={styles.focusList}>
            {historyInsights.focusDistribution.map(item => (
              <View key={item.focus} style={styles.focusRow}>
                <View style={styles.focusCopy}>
                  <Text style={styles.focusName}>{item.focus}</Text>
                  <Text style={styles.focusMeta}>
                    {item.sessions} sessões - {item.totalSets} séries
                  </Text>
                </View>
                <Text style={styles.focusShare}>
                  {Math.round(item.share * 100)}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyInsightText}>
            Conclua treinos nesta semana para ver a distribuição.
          </Text>
        )}
      </View>

      <View style={styles.list}>
        {filteredHistory.length ? (
          filteredHistory.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{item.workoutName}</Text>
                  <Text style={styles.cardMeta}>
                    {item.focus} - {formatSessionDate(item.performedAt)}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={() => setSessionToDelete(item)}
                    style={({pressed}) => [
                      styles.deleteButton,
                      pressed ? styles.pressed : null,
                    ]}>
                    <Trash2 color={theme.colors.danger} size={16} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <Text style={styles.metricText}>
                  Maior carga - {formatLoad(item.topLoad)}
                </Text>
                <Text style={styles.metricText}>
                  Total levantado - {formatVolume(item.totalVolume)}
                </Text>
              </View>

              <Text style={styles.cardStats}>
                {item.totalSets} séries
              </Text>

              <View style={styles.progressBadges}>
                <Text style={styles.progressBadge}>
                  {getSessionProgressLabel(historyInsights.sessionProgress[item.id])}
                </Text>
                {historyInsights.sessionProgress[item.id]?.isTopLoadRecord ? (
                  <Text style={[styles.progressBadge, styles.recordBadge]}>
                    Recorde de carga
                  </Text>
                ) : null}
              </View>

              {item.overallNotes ? (
                <Text style={styles.cardNotes}>{item.overallNotes}</Text>
              ) : null}

              <View style={styles.chips}>
                {item.exercises.map(exercise => (
                  <TagChip
                    key={`${item.id}-${exercise}`}
                    label={exercise}
                    active
                    onPress={() =>
                      navigation.navigate('ExerciseProgress', {
                        exerciseName: exercise,
                      })
                    }
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="Sem execuções para mostrar"
            description="Salve um treino para preencher o histórico e destravar comparações."
          />
        )}
      </View>

      <ConfirmModal
        visible={sessionToDelete !== null}
        title="Excluir execução?"
        description={
          sessionToDelete
            ? `A sessão ${sessionToDelete.workoutName} de ${formatSessionDate(
                sessionToDelete.performedAt,
              )} será removida do histórico e das métricas associadas.`
            : ''
        }
        confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir execução'}
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteSession}
        onCancel={() => (isDeleting ? undefined : setSessionToDelete(null))}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  summary: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  insightCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 112,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  insightLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  insightValue: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  insightDelta: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  progressPanel: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  panelHeader: {
    gap: 2,
  },
  panelTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  panelSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  weeklyList: {
    gap: theme.spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  weekLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    width: 48,
  },
  weekTrack: {
    flex: 1,
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  weekBar: {
    height: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
  },
  weekValue: {
    ...theme.typography.caption,
    color: theme.colors.text,
    minWidth: 104,
    textAlign: 'right',
  },
  focusList: {
    gap: theme.spacing.sm,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  focusCopy: {
    flex: 1,
    gap: 2,
  },
  focusName: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  focusMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  focusShare: {
    ...theme.typography.subtitle,
    color: theme.colors.accent,
  },
  emptyInsightText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  list: {
    gap: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  cardMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,111,125,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,111,125,0.18)',
  },
  cardStats: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  progressBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  progressBadge: {
    ...theme.typography.caption,
    color: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recordBadge: {
    color: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  cardNotes: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}],
  },
});
