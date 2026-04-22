import {Modal, StyleSheet, Text, View} from 'react-native';
import {Check} from 'lucide-react-native';

import {Button} from '@/components/Button';
import {theme} from '@/theme';

export interface WorkoutCompletionGroupStat {
  label: string;
  count: number;
}

export interface WorkoutCompletionSummary {
  workoutName: string;
  totalSets: number;
  seriesByGroup: WorkoutCompletionGroupStat[];
  maxLoad: number;
  minLoad: number;
  maxReps: number;
  minReps: number;
}

interface WorkoutCompletionModalProps {
  visible: boolean;
  summary: WorkoutCompletionSummary | null;
  onClose: () => void;
}

const formatMetric = (value: number, suffix = '') => {
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace('.', ',');

  return `${formatted}${suffix}`;
};

export const WorkoutCompletionModal = ({
  visible,
  summary,
  onClose,
}: WorkoutCompletionModalProps) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.modalCard}>
        <View style={styles.heroBadge}>
          <Check color="#06210E" size={30} strokeWidth={3} />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>Treino finalizado</Text>
          <Text style={styles.subtitle}>
            Parabens. Seu treino foi salvo e o historico ja foi atualizado.
          </Text>
          {summary ? (
            <Text style={styles.workoutName}>{summary.workoutName}</Text>
          ) : null}
        </View>

        {summary ? (
          <>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Series registradas</Text>
              <Text style={styles.highlightValue}>{summary.totalSets}</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Maior carga</Text>
                <Text style={styles.metricValue}>{formatMetric(summary.maxLoad, ' kg')}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Menor carga</Text>
                <Text style={styles.metricValue}>{formatMetric(summary.minLoad, ' kg')}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Maior repeticao</Text>
                <Text style={styles.metricValue}>{formatMetric(summary.maxReps)}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Menor repeticao</Text>
                <Text style={styles.metricValue}>{formatMetric(summary.minReps)}</Text>
              </View>
            </View>

            <View style={styles.groupCard}>
              <Text style={styles.groupTitle}>Series por grupo muscular</Text>
              <View style={styles.groupList}>
                {summary.seriesByGroup.map(group => (
                  <View key={group.label} style={styles.groupPill}>
                    <Text style={styles.groupLabel}>{group.label}</Text>
                    <Text style={styles.groupValue}>{group.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        <Button label="Continuar" onPress={onClose} />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.overlay,
  },
  modalCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(57,217,138,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(57,217,138,0.38)',
  },
  copyBlock: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  workoutName: {
    ...theme.typography.subtitle,
    color: theme.colors.accent,
    textAlign: 'center',
  },
  highlightCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  highlightLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  highlightValue: {
    ...theme.typography.display,
    color: theme.colors.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  metricValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  groupCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  groupTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  groupList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  groupLabel: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  groupValue: {
    ...theme.typography.subtitle,
    color: theme.colors.accent,
  },
});
