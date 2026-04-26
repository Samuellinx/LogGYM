import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';

import {theme} from '@/theme';

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  onPress?: () => void;
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const StatCard = ({
  label,
  value,
  helper,
  onPress,
  compact = false,
  containerStyle,
}: StatCardProps) => {
  const content = (
    <>
      <Text
        numberOfLines={compact ? 1 : undefined}
        style={[styles.label, compact ? styles.labelCompact : null]}>
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit={compact}
        minimumFontScale={compact ? 0.8 : undefined}
        numberOfLines={1}
        style={[styles.value, compact ? styles.valueCompact : null]}>
        {value}
      </Text>
      <Text
        adjustsFontSizeToFit={compact}
        minimumFontScale={compact ? 0.85 : undefined}
        numberOfLines={compact ? 1 : undefined}
        style={[styles.helper, compact ? styles.helperCompact : null]}>
        {helper}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.card, compact ? styles.cardCompact : null, containerStyle]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        compact ? styles.cardCompact : null,
        containerStyle,
        pressed ? styles.pressed : null,
      ]}>
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 112,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  cardCompact: {
    minHeight: 104,
    padding: theme.spacing.sm,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  labelCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  value: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: theme.colors.text,
  },
  valueCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  helper: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
  helperCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.92,
    transform: [{scale: 0.985}],
  },
});
