import {StyleSheet, Text, View} from 'react-native';

import {cardShadow, theme} from '@/theme';

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
}

export const StatCard = ({label, value, helper}: StatCardProps) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.helper}>{helper}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
    ...cardShadow,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    ...theme.typography.display,
    color: theme.colors.text,
  },
  helper: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
});
