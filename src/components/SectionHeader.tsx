import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ChevronRight} from 'lucide-react-native';

import {theme} from '@/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPressAction?: () => void;
}

export const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onPressAction,
}: SectionHeaderProps) => (
  <View style={styles.container}>
    <View style={styles.copy}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>

    {actionLabel ? (
      <Pressable style={styles.action} onPress={onPressAction}>
        <Text style={styles.actionLabel}>{actionLabel}</Text>
        <ChevronRight color={theme.colors.accent} size={16} />
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    ...theme.typography.caption,
    color: theme.colors.accent,
  },
});
