import {Platform} from 'react-native';
import Config from 'react-native-config';
import {
  GoogleSignin,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';

import type {AuthProvider, SessionUser} from '@/types/domain';

const googleWebClientId = Config.LOGGYM_GOOGLE_WEB_CLIENT_ID?.trim();
const googleIosClientId = Config.LOGGYM_GOOGLE_IOS_CLIENT_ID?.trim();

let googleConfigured = false;

const configureGoogleSignin = () => {
  if (googleConfigured) {
    return;
  }

  // The current app only needs basic profile data on Android.
  // Avoid passing a web client ID here unless we actually need idToken / offlineAccess.
  const shouldAttachWebClientId = Platform.OS !== 'android';

  GoogleSignin.configure({
    webClientId:
      shouldAttachWebClientId && googleWebClientId
        ? googleWebClientId
        : undefined,
    iosClientId: googleIosClientId || undefined,
    offlineAccess: false,
    scopes: ['email', 'profile'],
    profileImageSize: 160,
  });

  googleConfigured = true;
};

const mapGoogleUser = (
  user: {
    id: string;
    name: string | null;
    email: string;
    photo: string | null;
    familyName: string | null;
    givenName: string | null;
  },
  provider: AuthProvider,
): SessionUser => ({
  id: user.id,
  name: user.name ?? user.email.split('@')[0] ?? 'Atleta',
  email: user.email,
  photo: user.photo,
  familyName: user.familyName,
  givenName: user.givenName,
  provider,
  lastLoginAt: new Date().toISOString(),
});

export const getAuthCapabilities = () => ({
  isGoogleConfigured:
    Platform.OS === 'android'
      ? true
      : Boolean(googleWebClientId || googleIosClientId),
  hasWebClientId: Boolean(googleWebClientId),
  allowDevLogin: __DEV__ && Config.LOGGYM_ENABLE_DEV_LOGIN !== 'false',
});

const mapGoogleError = (error: unknown) => {
  if (isErrorWithCode(error)) {
    const code = String(error.code ?? '');
    const message = error.message ?? '';
    const loweredMessage = message.toLowerCase();

    if (code === '10' || message.includes('DEVELOPER_ERROR')) {
      return new Error(
        'Nao foi possivel concluir a entrada com Google neste aparelho. Tente novamente em instantes.',
      );
    }

    if (loweredMessage.includes('cancel')) {
      return new Error('Login com Google cancelado.');
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('cancel')) {
      return new Error('Login com Google cancelado.');
    }
  }

  return new Error('Nao foi possivel entrar com Google agora.');
};

export const signInWithGoogleAccount = async () => {
  try {
    configureGoogleSignin();
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

    const response = await GoogleSignin.signIn();

    if (response.type !== 'success') {
      throw new Error('Login com Google cancelado.');
    }

    return mapGoogleUser(response.data.user, 'google');
  } catch (error) {
    throw mapGoogleError(error);
  }
};

export const trySilentGoogleSession = async () => {
  try {
    configureGoogleSignin();
    const response = await GoogleSignin.signInSilently();

    if (response.type !== 'success') {
      return null;
    }

    return mapGoogleUser(response.data.user, 'google');
  } catch {
    return null;
  }
};

export const signInWithDevelopmentAccount = async () => {
  const capabilities = getAuthCapabilities();

  if (!capabilities.allowDevLogin) {
    throw new Error('Login local de desenvolvimento desativado.');
  }

  return {
    id: 'dev-local-athlete',
    name: 'Atleta DEV',
    email: 'dev@loggym.local',
    photo: null,
    familyName: 'DEV',
    givenName: 'Atleta',
    provider: 'dev-local' as const,
    lastLoginAt: new Date().toISOString(),
  };
};

export const signOutFromProvider = async (provider: AuthProvider) => {
  if (provider !== 'google') {
    return;
  }

  try {
    configureGoogleSignin();
    await GoogleSignin.signOut();
  } catch {
    // Logout local ja atende o requisito de sessao; falha remota nao deve bloquear o app.
  }
};
