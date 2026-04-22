import {Pressable, StyleSheet, Text, View} from 'react-native';

import {cardShadow, theme} from '@/theme';

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  onPress?: () => void;
}

export const StatCard = ({label, value, helper, onPress}: StatCardProps) => {
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.helper}>{helper}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed ? styles.pressed : null]}>
      {content}
    </Pressable>
  );
};

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
  pressed: {
    opacity: 0.92,
    transform: [{scale: 0.985}],
  },
});
