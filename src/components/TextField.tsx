import type {TextInputProps} from 'react-native';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {theme} from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const TextField = ({label, error, style, ...rest}: TextFieldProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholderTextColor={theme.colors.textSoft}
      style={[
        styles.input,
        rest.multiline ? styles.multiline : null,
        error ? styles.inputError : null,
        style,
      ]}
      {...rest}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  input: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    minHeight: 52,
    ...theme.typography.body,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: 'rgba(255,111,125,0.5)',
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
});
