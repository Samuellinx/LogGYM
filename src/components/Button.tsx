import type {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {cardShadow, theme} from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: {
    gradient: ['#A3FF5D', '#49D97C'],
    textColor: '#04110A',
    borderColor: 'transparent',
    backgroundColor: '#7CFF4F',
  },
  secondary: {
    gradient: null,
    textColor: theme.colors.text,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  ghost: {
    gradient: null,
    textColor: theme.colors.textMuted,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  danger: {
    gradient: null,
    textColor: '#FFE8EC',
    borderColor: 'rgba(255,111,125,0.18)',
    backgroundColor: 'rgba(255,111,125,0.14)',
  },
};

export const Button = ({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  icon,
  fullWidth = true,
}: ButtonProps) => {
  const config = variantStyles[variant];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.pressable,
        !fullWidth && styles.autoWidth,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}>
      {config.gradient ? (
        <LinearGradient
          colors={config.gradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.gradient}>
          <View style={styles.content}>
            {icon}
            <Text style={[styles.label, {color: config.textColor}]}>{label}</Text>
          </View>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.flat,
            {
              backgroundColor: config.backgroundColor,
              borderColor: config.borderColor,
            },
          ]}>
          <View style={styles.content}>
            {icon}
            <Text style={[styles.label, {color: config.textColor}]}>{label}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  autoWidth: {
    width: 'auto',
    alignSelf: 'flex-start',
  },
  gradient: {
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    ...cardShadow,
  },
  flat: {
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.subtitle,
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.985}],
  },
  disabled: {
    opacity: 0.45,
  },
});
