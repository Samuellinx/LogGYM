import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ChevronRight, Play, Repeat2} from 'lucide-react-native';

import type {WorkoutSummary} from '@/types/domain';
import {cardShadow, theme} from '@/theme';
import {formatSessionDate} from '@/utils/formatters';

interface WorkoutCardProps {
  workout: WorkoutSummary;
  onPress: () => void;
  onStart: () => void;
  onDuplicate?: () => void;
}

export const WorkoutCard = ({
  workout,
  onPress,
  onStart,
  onDuplicate,
}: WorkoutCardProps) => (
  <Pressable onPress={onPress} style={[styles.card, {borderLeftColor: workout.accentColor}]}>
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>{workout.name}</Text>
        <Text style={styles.meta}>
          {workout.focus} - {workout.exerciseCount} exercicios
        </Text>
      </View>
      <ChevronRight color={theme.colors.textMuted} size={18} />
    </View>

    <Text style={styles.notes} numberOfLines={2}>
      {workout.notes || 'Treino pronto para registrar cargas e anotacoes.'}
    </Text>

    <View style={styles.footer}>
      <Text style={styles.lastPerformed}>
        Ultima execucao: {formatSessionDate(workout.lastPerformedAt)}
      </Text>

      <View style={styles.actions}>
        {onDuplicate ? (
          <Pressable onPress={onDuplicate} style={styles.actionPill}>
            <Repeat2 color={theme.colors.textMuted} size={16} />
          </Pressable>
        ) : null}
        <Pressable onPress={onStart} style={styles.startButton}>
          <Play color="#06120A" fill="#06120A" size={14} />
          <Text style={styles.startLabel}>Iniciar</Text>
        </Pressable>
      </View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  lastPerformed: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionPill: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
  },
  startLabel: {
    ...theme.typography.caption,
    color: '#06120A',
    fontWeight: '700',
  },
});
