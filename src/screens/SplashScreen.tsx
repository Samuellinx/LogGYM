import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {ShieldCheck} from 'lucide-react-native';

import {BrandMark} from '@/components/BrandMark';
import {Button} from '@/components/Button';
import {theme} from '@/theme';

interface SplashScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export const SplashScreen = ({error, onRetry}: SplashScreenProps) => (
  <LinearGradient colors={['#04060A', '#101720', '#07110B']} style={styles.container}>
    <View style={styles.glow} />
    <BrandMark size={104} />

    <View style={styles.copy}>
      <Text style={styles.title}>LogGYM</Text>
      <Text style={styles.subtitle}>Preparando seu espaço de treino</Text>
    </View>

    {error ? (
      <View style={styles.errorCard}>
        <ShieldCheck color={theme.colors.warning} size={20} />
        <Text style={styles.errorText}>
          Não foi possível abrir o app agora. Tente novamente.
        </Text>
      </View>
    ) : (
      <ActivityIndicator color={theme.colors.accent} size="large" />
    )}

    {error && onRetry ? (
      <Button fullWidth={false} label="Tentar novamente" onPress={onRetry} />
    ) : null}
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.xl,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,255,79,0.08)',
    top: 90,
  },
  copy: {
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  errorCard: {
    width: '100%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(243,201,106,0.18)',
    backgroundColor: 'rgba(243,201,106,0.12)',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    ...theme.typography.body,
    color: '#F9D98B',
  },
});
