import {useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {CloudOff, Wifi} from 'lucide-react-native';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';

import {BrandMark} from '@/components/BrandMark';
import {Button} from '@/components/Button';
import {Screen} from '@/components/Screen';
import {TagChip} from '@/components/TagChip';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';

export const LoginScreen = () => {
  const signInWithGoogle = useAppStore(state => state.signInWithGoogle);
  const isOnline = useAppStore(state => state.isOnline);
  const [pending, setPending] = useState<'google' | null>(null);

  const handleGoogle = async () => {
    try {
      setPending('google');
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Entrar com Google', toUserMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <Screen scroll={false} contentContainerStyle={styles.content}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />

      <Animated.View entering={FadeInUp.duration(420)} style={styles.heroWrap}>
        <LinearGradient
          colors={['#10161F', '#0B1016', '#112014']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.hero}>
          <BrandMark size={108} />
          <Text style={styles.title}>LogGYM</Text>
          <Text style={styles.headline}>Treine. Registre. Evolua.</Text>
          <Text style={styles.description}>
            Seus treinos, cargas e anotacoes no mesmo lugar.
          </Text>

          <View style={styles.badges}>
            <TagChip
              label={isOnline ? 'Online' : 'Sem internet'}
              active
              accentColor={isOnline ? theme.colors.success : theme.colors.warning}
            />
            <TagChip label="Uso rapido" active />
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(70).duration(360)}
        style={styles.summaryCard}>
        {isOnline ? (
          <Wifi color={theme.colors.success} size={18} />
        ) : (
          <CloudOff color={theme.colors.warning} size={18} />
        )}
        <Text style={styles.summaryText}>
          {isOnline
            ? 'Depois da primeira entrada, seus treinos continuam com voce mesmo sem internet.'
            : 'Conecte-se para entrar com Google. Depois disso voce pode seguir usando o app normalmente.'}
        </Text>
      </Animated.View>

      <View style={styles.actions}>
        <Button
          label={pending === 'google' ? 'Conectando...' : 'Entrar com Google'}
          onPress={handleGoogle}
          disabled={pending !== null || !isOnline}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
    overflow: 'hidden',
  },
  backgroundOrbTop: {
    position: 'absolute',
    top: 70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(81,199,255,0.08)',
  },
  backgroundOrbBottom: {
    position: 'absolute',
    bottom: 110,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124,255,79,0.07)',
  },
  heroWrap: {
    alignItems: 'center',
  },
  hero: {
    width: '100%',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.text,
  },
  headline: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'center',
  },
  summaryCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  summaryText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  actions: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
