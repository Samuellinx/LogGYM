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
      <Pressable
        accessibilityRole="button"
        style={({pressed}) => [styles.action, pressed ? styles.pressed : null]}
        onPress={onPressAction}>
        <Text numberOfLines={1} style={styles.actionLabel}>
          {actionLabel}
        </Text>
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
    minHeight: 36,
    maxWidth: '44%',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(124,255,79,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,255,79,0.18)',
  },
  actionLabel: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}],
  },
});
