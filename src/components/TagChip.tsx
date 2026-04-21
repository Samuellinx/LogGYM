import {Pressable, StyleSheet, Text} from 'react-native';

import {theme} from '@/theme';

interface TagChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  accentColor?: string;
}

export const TagChip = ({
  label,
  active = false,
  onPress,
  accentColor = theme.colors.accent,
}: TagChipProps) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.chip,
      active
        ? {backgroundColor: `${accentColor}22`, borderColor: `${accentColor}66`}
        : null,
    ]}>
    <Text
      style={[
        styles.label,
        active ? {color: accentColor} : {color: theme.colors.textMuted},
      ]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    ...theme.typography.caption,
  },
});
