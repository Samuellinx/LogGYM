import {useDeferredValue, useState} from 'react';
import {RefreshControl, StyleSheet, Text, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';

import {EmptyState} from '@/components/EmptyState';
import {Screen} from '@/components/Screen';
import {SectionHeader} from '@/components/SectionHeader';
import {TagChip} from '@/components/TagChip';
import {TextField} from '@/components/TextField';
import {MainTabParamList, RootStackParamList} from '@/navigation/types';
import {theme} from '@/theme';
import {formatLoad, formatSessionDate, formatVolume} from '@/utils/formatters';
import {useAppStore} from '@/store/useAppStore';

type AppNavigation = NavigationProp<MainTabParamList & RootStackParamList>;

export const HistoryScreen = () => {
  const navigation = useNavigation<AppNavigation>();
  const history = useAppStore(state => state.history);
  const refreshData = useAppStore(state => state.refreshData);
  const isRefreshing = useAppStore(state => state.isRefreshing);
  const [search, setSearch] = useState('');
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
        title="Historico"
        subtitle="Cada execucao salva fica disponivel para comparacao"
      />

      <TextField
        label="Buscar no historico"
        placeholder="Supino, legs, upper..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {filteredHistory.length} sessoes · {formatVolume(totalVolume)} de volume total
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
                    {item.focus} · {formatSessionDate(item.performedAt)}
                  </Text>
                </View>
                <Text style={styles.cardLoad}>{formatLoad(item.topLoad)}</Text>
              </View>

              <Text style={styles.cardStats}>
                {item.totalSets} series · {formatVolume(item.totalVolume)}
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
            title="Sem execucoes para mostrar"
            description="Salve um treino para preencher o historico e destravar comparacoes."
          />
        )}
      </View>
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
  cardLoad: {
    ...theme.typography.subtitle,
    color: theme.colors.accent,
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
});
