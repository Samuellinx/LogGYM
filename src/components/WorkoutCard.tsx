import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ChevronRight, Play, Repeat2, Trash2} from 'lucide-react-native';

import type {WorkoutSummary} from '@/types/domain';
import {cardShadow, theme} from '@/theme';
import {formatSessionDate} from '@/utils/formatters';

interface WorkoutCardProps {
  workout: WorkoutSummary;
  onPress: () => void;
  onStart?: () => void;
  onDuplicate?: () => void;
  onClearTraining?: () => void;
  clearTrainingDisabled?: boolean;
  startLabel?: string;
  isResume?: boolean;
}

export const WorkoutCard = ({
  workout,
  onPress,
  onStart,
  onDuplicate,
  onClearTraining,
  clearTrainingDisabled = false,
  startLabel = 'Iniciar treino',
  isResume = false,
}: WorkoutCardProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({pressed}) => [
      styles.card,
      {borderLeftColor: workout.accentColor},
      pressed ? styles.cardPressed : null,
    ]}>
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>{workout.name}</Text>
        <Text style={styles.meta}>
          {workout.focus} - {workout.exerciseCount} exercícios
        </Text>
      </View>
      <ChevronRight color={theme.colors.textMuted} size={18} />
    </View>

    <Text style={styles.notes} numberOfLines={2}>
      {workout.notes || 'Treino pronto para registrar cargas e anotações.'}
    </Text>

    <View style={styles.footer}>
      <Text style={styles.lastPerformed}>
        Última execução: {formatSessionDate(workout.lastPerformedAt)}
      </Text>

      {onDuplicate || onClearTraining || onStart ? (
        <View style={styles.actions}>
          {onDuplicate ? (
            <Pressable onPress={onDuplicate} style={styles.actionPill}>
              <Repeat2 color={theme.colors.textMuted} size={16} />
            </Pressable>
          ) : null}
          {onClearTraining ? (
            <Pressable
              disabled={clearTrainingDisabled}
              onPress={onClearTraining}
              style={[
                styles.clearButton,
                clearTrainingDisabled ? styles.clearButtonDisabled : null,
              ]}>
              <Trash2 color="#FF9FAA" size={14} />
              <Text numberOfLines={1} style={styles.clearLabel}>
                Limpar treino
              </Text>
            </Pressable>
          ) : null}
          {onStart ? (
            <Pressable
              onPress={onStart}
              style={[styles.startButton, isResume ? styles.startButtonResume : null]}>
              <Play
                color={isResume ? '#04131B' : '#06120A'}
                fill={isResume ? '#04131B' : '#06120A'}
                size={14}
              />
              <Text
                numberOfLines={1}
                style={[styles.startLabel, isResume ? styles.startLabelResume : null]}>
                {startLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    gap: theme.spacing.sm,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
  footer: {
    gap: theme.spacing.sm,
  },
  lastPerformed: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    minHeight: 38,
    minWidth: 128,
    flexShrink: 1,
    maxWidth: '100%',
  },
  startButtonResume: {
    backgroundColor: theme.colors.accentSecondary,
  },
  startLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#06120A',
    fontWeight: '700',
    flexShrink: 1,
  },
  startLabelResume: {
    color: '#04131B',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,111,125,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,111,125,0.18)',
    minHeight: 38,
    minWidth: 128,
    flexShrink: 1,
    maxWidth: '100%',
  },
  clearLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#FF9FAA',
    fontWeight: '700',
    flexShrink: 1,
  },
  clearButtonDisabled: {
    opacity: 0.45,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{scale: 0.99}],
  },
});
