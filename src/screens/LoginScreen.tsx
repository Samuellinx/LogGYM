import {useEffect, useState} from 'react';
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
import {CloudOff, Wifi} from 'lucide-react-native';
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
  recoveryCode: '',
};

const resetDefaults: CredentialResetValues = {
  email: '',
  recoveryCode: '',
  newPassword: '',
  confirmNewPassword: '',
};

export const LoginScreen = () => {
  const signInWithGoogle = useAppStore(state => state.signInWithGoogle);
  const signInWithCredentials = useAppStore(state => state.signInWithCredentials);
  const signUpWithCredentials = useAppStore(state => state.signUpWithCredentials);
  const resetPasswordWithRecovery = useAppStore(
    state => state.resetPasswordWithRecovery,
  );
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

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const debugGlobal = globalThis as typeof globalThis & {
      __LOGGYM_SIGNUP_PROBE_DONE?: boolean;
    };

    if (debugGlobal.__LOGGYM_SIGNUP_PROBE_DONE) {
      return;
    }

    debugGlobal.__LOGGYM_SIGNUP_PROBE_DONE = true;

    const probeEmail = `probe.${Date.now()}@example.com`;

    const runProbe = async () => {
      const startedAt = Date.now();

      try {
        console.log(`[signup-probe] start ${probeEmail}`);
        const createdAccount = await signUpWithCredentials(
          'Probe Runtime',
          probeEmail,
          'Treino1234',
          'PROBE99',
        );
        console.log(
          `[signup-probe] success ${createdAccount.email} ${Date.now() - startedAt}ms`,
        );
      } catch (error) {
        console.log(
          `[signup-probe] error ${toUserMessage(error)} ${Date.now() - startedAt}ms`,
        );
      }
    };

    runProbe();
  }, [signUpWithCredentials]);

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
        values.recoveryCode,
      );
      signUpForm.reset(signUpDefaults);
      signInForm.reset({
        email: createdAccount.email,
        password: '',
      });
      setMode('signin');

      Alert.alert(
        'Conta criada',
        'Sua conta foi criada com sucesso. Agora entre com e-mail e senha.',
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
      await resetPasswordWithRecovery(
        values.email,
        values.recoveryCode,
        values.newPassword,
      );

      signInForm.reset({
        email: values.email,
        password: '',
      });
      resetForm.reset(resetDefaults);
      setMode('signin');

      Alert.alert(
        'Senha atualizada',
        'Sua senha foi redefinida. Agora voce pode entrar com a nova senha.',
      );
    } catch (error) {
      Alert.alert('Redefinir senha', toUserMessage(error));
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
          <Text style={styles.formTitle}>Conta pessoal</Text>
          <Text style={styles.formDescription}>
            Crie um acesso por e-mail e senha. O codigo de recuperacao permite trocar a senha neste aparelho.
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
                onChangeText={value => field.onChange(value)}
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
                placeholder="voce@exemplo.com"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={value => field.onChange(value)}
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
                placeholder="Minimo de 8 caracteres"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={value => field.onChange(value)}
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
                onChangeText={value => field.onChange(value)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="recoveryCode"
            render={({field}) => (
              <TextField
                label="Codigo de recuperacao"
                placeholder="Ex: FORCA2026"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={value => field.onChange(value)}
                autoCapitalize="characters"
                autoCorrect={false}
                error={errors.recoveryCode?.message}
              />
            )}
          />

          <Text style={styles.formHint}>
            Guarde esse codigo em um lugar seguro. Ele sera exigido para redefinir sua senha.
          </Text>

          <Button
            label={pending === 'signup' ? 'Criando conta...' : 'Criar conta'}
            onPress={handleCredentialSignUp}
            disabled={pending !== null}
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
          <Text style={styles.formTitle}>Recuperar acesso</Text>
          <Text style={styles.formDescription}>
            Informe seu e-mail, o codigo de recuperacao e a nova senha.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({field}) => (
              <TextField
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={value => field.onChange(value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="recoveryCode"
            render={({field}) => (
              <TextField
                label="Codigo de recuperacao"
                placeholder="Digite o codigo salvo"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={value => field.onChange(value)}
                autoCapitalize="characters"
                autoCorrect={false}
                error={errors.recoveryCode?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({field}) => (
              <TextField
                label="Nova senha"
                placeholder="Minimo de 8 caracteres"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={value => field.onChange(value)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.newPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmNewPassword"
            render={({field}) => (
              <TextField
                label="Confirmar nova senha"
                placeholder="Repita a nova senha"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChangeText={value => field.onChange(value)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmNewPassword?.message}
              />
            )}
          />

          <Button
            label={pending === 'forgot' ? 'Atualizando senha...' : 'Redefinir senha'}
            onPress={handlePasswordReset}
            disabled={pending !== null}
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
        <Text style={styles.formTitle}>Entrar com conta pessoal</Text>
        <Text style={styles.formDescription}>
          Use seu e-mail e senha para acessar seus treinos mesmo sem Google.
        </Text>

        <Controller
          control={control}
          name="email"
          render={({field}) => (
            <TextField
              label="E-mail"
              placeholder="voce@exemplo.com"
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChangeText={value => field.onChange(value)}
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
              onChangeText={value => field.onChange(value)}
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
              Estamos preparando seu acesso com seguranca. Aguarde.
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
            <TagChip label="Conta local" active accentColor={theme.colors.accentSecondary} />
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
            ? 'Voce pode entrar com Google ou criar uma conta local para continuar usando o app offline neste aparelho.'
            : 'Sem internet agora. Se voce ja tiver uma conta local, pode entrar normalmente e seguir treinando.'}
        </Text>
      </Animated.View>

      <View style={styles.googleCard}>
        <Text style={styles.googleTitle}>Entrada com Google</Text>
        <Text style={styles.googleText}>
          Ideal para quem quer usar a conta Google na primeira entrada e manter a sessao salva.
        </Text>
        <Button
          label={pending === 'google' ? 'Conectando...' : 'Entrar com Google'}
          onPress={handleGoogle}
          disabled={pending !== null || !isOnline}
        />
      </View>

      <View style={styles.localAuthSection}>
        <Text style={styles.localAuthTitle}>Conta por e-mail</Text>
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
