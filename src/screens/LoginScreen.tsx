import {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import LinearGradient from 'react-native-linear-gradient';
import {CloudOff, CloudSync} from 'lucide-react-native';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';

import {BrandMark} from '@/components/BrandMark';
import {Button} from '@/components/Button';
import {Screen} from '@/components/Screen';
import {TagChip} from '@/components/TagChip';
import {TextField} from '@/components/TextField';
import {
  credentialResetSchema,
  credentialSignInSchema,
  credentialSignUpSchema,
  type CredentialResetValues,
  type CredentialSignInValues,
  type CredentialSignUpValues,
} from '@/features/auth/auth.schemas';
import {useAppStore} from '@/store/useAppStore';
import {theme} from '@/theme';
import {toUserMessage} from '@/utils/errors';

type AuthMode = 'signin' | 'signup' | 'forgot';
type PendingAction = 'google' | 'signin' | 'signup' | 'forgot' | null;

const modeLabels: Record<AuthMode, string> = {
  signin: 'Entrar',
  signup: 'Criar conta',
  forgot: 'Esqueci a senha',
};

const signInDefaults: CredentialSignInValues = {
  email: '',
  password: '',
};

const signUpDefaults: CredentialSignUpValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const resetDefaults: CredentialResetValues = {
  email: '',
};

export const LoginScreen = () => {
  const signInWithGoogle = useAppStore(state => state.signInWithGoogle);
  const signInWithCredentials = useAppStore(state => state.signInWithCredentials);
  const signUpWithCredentials = useAppStore(state => state.signUpWithCredentials);
  const sendPasswordReset = useAppStore(state => state.sendPasswordReset);
  const isOnline = useAppStore(state => state.isOnline);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [pending, setPending] = useState<PendingAction>(null);

  const signInForm = useForm<CredentialSignInValues>({
    resolver: zodResolver(credentialSignInSchema),
    defaultValues: signInDefaults,
  });
  const signUpForm = useForm<CredentialSignUpValues>({
    resolver: zodResolver(credentialSignUpSchema),
    defaultValues: signUpDefaults,
  });
  const resetForm = useForm<CredentialResetValues>({
    resolver: zodResolver(credentialResetSchema),
    defaultValues: resetDefaults,
  });

  const isCreatingAccount = pending === 'signup';

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

  const handleCredentialSignIn = signInForm.handleSubmit(async values => {
    try {
      setPending('signin');
      await signInWithCredentials(values.email, values.password);
    } catch (error) {
      Alert.alert('Entrar', toUserMessage(error));
    } finally {
      setPending(null);
    }
  });

  const handleCredentialSignUp = signUpForm.handleSubmit(async values => {
    try {
      setPending('signup');
      const createdAccount = await signUpWithCredentials(
        values.name,
        values.email,
        values.password,
      );

      signUpForm.reset(signUpDefaults);
      signInForm.reset({
        email: createdAccount.email,
        password: '',
      });
      setMode('signin');

      Alert.alert(
        'Conta criada',
        'Sua conta foi criada. Agora entre com e-mail e senha para sincronizar seus treinos.',
      );
    } catch (error) {
      Alert.alert('Criar conta', toUserMessage(error));
    } finally {
      setPending(null);
    }
  });

  const handlePasswordReset = resetForm.handleSubmit(async values => {
    try {
      setPending('forgot');
      await sendPasswordReset(values.email);
      resetForm.reset(resetDefaults);
      setMode('signin');

      Alert.alert(
        'E-mail enviado',
        'Se existir uma conta com esse e-mail, você receberá um link para redefinir a senha.',
      );
    } catch (error) {
      Alert.alert('Esqueci a senha', toUserMessage(error));
    } finally {
      setPending(null);
    }
  });

  const renderModeForm = () => {
    if (mode === 'signup') {
      const {
        control,
        formState: {errors},
      } = signUpForm;

      return (
        <View key="signup" style={styles.formCard}>
          <Text style={styles.formTitle}>Conta sincronizada</Text>
          <Text style={styles.formDescription}>
            Crie um acesso com e-mail e senha para usar o app e o site com a mesma conta.
          </Text>

          <Controller
            control={control}
            name="name"
            render={({field}) => (
              <TextField
                label="Nome"
                placeholder="Seu nome"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({field}) => (
              <TextField
                label="E-mail"
                placeholder="você@exemplo.com"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({field}) => (
              <TextField
                label="Senha"
                placeholder="Mínimo de 8 caracteres"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({field}) => (
              <TextField
                label="Confirmar senha"
                placeholder="Repita sua senha"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Text style={styles.formHint}>
            Depois do primeiro acesso online, seus treinos continuam disponíveis no aparelho mesmo sem internet.
          </Text>

          <Button
            label={pending === 'signup' ? 'Criando conta...' : 'Criar conta'}
            onPress={handleCredentialSignUp}
            disabled={pending !== null || !isOnline}
          />
        </View>
      );
    }

    if (mode === 'forgot') {
      const {
        control,
        formState: {errors},
      } = resetForm;

      return (
        <View key="forgot" style={styles.formCard}>
          <Text style={styles.formTitle}>Recuperar senha</Text>
          <Text style={styles.formDescription}>
            Informe seu e-mail para receber um link oficial de redefinição.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({field}) => (
              <TextField
                label="E-mail"
                placeholder="você@exemplo.com"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email?.message}
              />
            )}
          />

          <Button
            label={
              pending === 'forgot'
                ? 'Enviando e-mail...'
                : 'Enviar e-mail de redefinição'
            }
            onPress={handlePasswordReset}
            disabled={pending !== null || !isOnline}
          />
        </View>
      );
    }

    const {
      control,
      formState: {errors},
    } = signInForm;

    return (
      <View key="signin" style={styles.formCard}>
        <Text style={styles.formTitle}>Entrar com e-mail</Text>
        <Text style={styles.formDescription}>
          Use a mesma conta no app e no painel web para manter tudo sincronizado por usuário.
        </Text>

        <Controller
          control={control}
          name="email"
          render={({field}) => (
            <TextField
              label="E-mail"
              placeholder="você@exemplo.com"
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({field}) => (
            <TextField
              label="Senha"
              placeholder="Digite sua senha"
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.password?.message}
            />
          )}
        />

        <Button
          label={pending === 'signin' ? 'Entrando...' : 'Entrar'}
          onPress={handleCredentialSignIn}
          disabled={pending !== null}
        />
      </View>
    );
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <Modal
        transparent
        animationType="fade"
        statusBarTranslucent
        visible={isCreatingAccount}
        onRequestClose={() => undefined}>
        <View style={styles.progressOverlay}>
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.progressTitle}>Criando sua conta</Text>
            <Text style={styles.progressText}>
              Estamos preparando seu acesso e vinculando a sincronização segura.
            </Text>
          </View>
        </View>
      </Modal>

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
          <Text style={styles.headline}>Treine. Registre. Sincronize.</Text>
          <Text style={styles.description}>
            Seus treinos, cargas e histórico ficam alinhados entre app e web.
          </Text>

          <View style={styles.badges}>
            <TagChip
              label={isOnline ? 'Online' : 'Sem internet'}
              active
              accentColor={isOnline ? theme.colors.success : theme.colors.warning}
            />
            <TagChip label="Offline first" active />
            <TagChip
              label="Sync por usuário"
              active
              accentColor={theme.colors.accentSecondary}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(70).duration(360)}
        style={styles.summaryCard}>
        {isOnline ? (
          <CloudSync color={theme.colors.success} size={18} />
        ) : (
          <CloudOff color={theme.colors.warning} size={18} />
        )}
        <Text style={styles.summaryText}>
          {isOnline
            ? 'Acesse com Google ou e-mail para sincronizar seus treinos entre celular e painel web.'
            : 'Sem internet agora. Se você já entrou antes, o app continua abrindo com os dados salvos neste aparelho.'}
        </Text>
      </Animated.View>

      <View style={styles.googleCard}>
        <Text style={styles.googleTitle}>Entrada com Google</Text>
        <Text style={styles.googleText}>
          Ideal para acessar rápido e usar a mesma conta em todos os dispositivos.
        </Text>
        <Button
          label={pending === 'google' ? 'Conectando...' : 'Entrar com Google'}
          onPress={handleGoogle}
          disabled={pending !== null || !isOnline}
        />
      </View>

      <View style={styles.localAuthSection}>
        <Text style={styles.localAuthTitle}>Acesso com e-mail</Text>
        <View style={styles.modeRow}>
          {(Object.keys(modeLabels) as AuthMode[]).map(option => (
            <TagChip
              key={option}
              label={modeLabels[option]}
              active={mode === option}
              onPress={() => setMode(option)}
              accentColor={mode === option ? theme.colors.accent : undefined}
            />
          ))}
        </View>

        {renderModeForm()}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: theme.spacing.xl,
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
  googleCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  googleTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  googleText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  localAuthSection: {
    gap: theme.spacing.md,
  },
  localAuthTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  formCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  formTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
  },
  formDescription: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  formHint: {
    ...theme.typography.caption,
    color: theme.colors.textSoft,
  },
  progressOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  progressCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  progressTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    textAlign: 'center',
  },
  progressText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
