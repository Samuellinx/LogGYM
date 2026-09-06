import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {X} from 'lucide-react-native';

import {theme} from '@/theme';
import type {WorkoutDetail} from '@/types/domain';
import {formatBaseLoadLabel} from '@/utils/baseLoad';
import {
  formatExercisePerformanceRecord,
  formatSessionFinishedAt,
} from '@/utils/formatters';
import {resolveSessionFinishedAt} from '@/utils/sessionDate';
import type {ExercisePerformanceRecord} from '@/features/workouts/trainingSessionUi';

interface WorkoutConsultModalProps {
  visible: boolean;
  workout: WorkoutDetail | null;
  performanceRecords?: Record<string, ExercisePerformanceRecord>;
  onClose: () => void;
}

export const WorkoutConsultModal = ({
  visible,
  workout,
  performanceRecords = {},
  onClose,
}: WorkoutConsultModalProps) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {workout ? (
        <View accessibilityRole="summary" style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>Consulta de treino</Text>
                <Text style={styles.title}>{workout.name}</Text>
                <Text style={styles.subtitle}>
                  {workout.focus} - {workout.exerciseCount} exercícios
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Fechar consulta de treino"
                accessibilityRole="button"
                onPress={onClose}
                style={({pressed}) => [
                  styles.closeButton,
                  pressed ? styles.closeButtonPressed : null,
                ]}>
                <X color={theme.colors.text} size={16} />
                <Text style={styles.closeButtonLabel}>Fechar</Text>
              </Pressable>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Dia</Text>
                <Text style={styles.metaValue}>{workout.scheduledDay || 'Livre'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Última finalização</Text>
                <Text style={styles.metaValue}>
                  {formatSessionFinishedAt(
                    resolveSessionFinishedAt({
                      finishedAt: workout.lastFinishedAt,
                      performedAt: workout.lastPerformedAt,
                    }),
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.notesBox}>
              <Text style={styles.metaLabel}>Observações</Text>
              <Text style={styles.notes}>
                {workout.notes || 'Sem observações extras para este treino.'}
              </Text>
            </View>

            <View style={styles.exerciseList}>
              <Text style={styles.sectionTitle}>Exercícios</Text>
              {workout.exercises.map((exercise, index) => {
                const performanceRecord = performanceRecords[exercise.id];

                return (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseIndex}>{index + 1}</Text>
                    <View style={styles.exerciseCopy}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseMeta}>
                        {exercise.muscleGroup} - alvo{' '}
                        {exercise.targetReps || 'não informado'}
                      </Text>
                    </View>
                  </View>

                  {performanceRecord ? (
                    <Text style={styles.exerciseRecord}>
                      Maior carga registrada:{' '}
                      {formatExercisePerformanceRecord(performanceRecord)}
                    </Text>
                  ) : null}

                  {exercise.baseLoad ? (
                    <Text style={styles.exerciseLoad}>
                      Carga sugerida: {formatBaseLoadLabel(exercise.baseLoad)}
                    </Text>
                  ) : null}

                  {exercise.note ? (
                    <Text style={styles.exerciseNote}>{exercise.note}</Text>
                  ) : null}
                </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}
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
    width: '100%',
    maxWidth: 440,
    maxHeight: '84%',
    alignSelf: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  scrollContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeButtonLabel: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  closeButtonPressed: {
    opacity: 0.86,
    transform: [{scale: 0.98}],
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metaItem: {
    flexGrow: 1,
    minWidth: '45%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  metaLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
    textTransform: 'uppercase',
  },
  metaValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  notesBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.cardOverlay,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  exerciseList: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  exerciseCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    ...theme.typography.caption,
    fontWeight: '700',
  },
  exerciseCopy: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  exerciseMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  exerciseRecord: {
    ...theme.typography.caption,
    color: theme.colors.accentSecondary,
  },
  exerciseLoad: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
  exerciseNote: {
    ...theme.typography.body,
    color: theme.colors.textSoft,
  },
});
