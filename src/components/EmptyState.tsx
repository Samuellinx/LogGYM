import {StyleSheet, Text, View} from 'react-native';

import {BrandMark} from '@/components/BrandMark';
import {theme} from '@/theme';

interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState = ({title, description}: EmptyStateProps) => (
  <View style={styles.container}>
    <BrandMark size={54} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
});
