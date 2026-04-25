import {useDeferredValue, useState} from 'react';
import {Alert, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {Trash2} from 'lucide-react-native';

import {ConfirmModal} from '@/components/ConfirmModal';
import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TagChip} from '@/components/TagChip';
import {TextField} from '@/components/TextField';
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
      Alert.alert(
        'Excluir execução',
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
                  <Text style={styles.cardLoad}>{formatLoad(item.topLoad)}</Text>
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

              <Text style={styles.cardStats}>
                {item.totalSets} séries - {formatVolume(item.totalVolume)}
              </Text>

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
  cardLoad: {
    ...theme.typography.subtitle,
    color: theme.colors.accent,
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
