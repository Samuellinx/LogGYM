import {Platform} from 'react-native';
import Config from 'react-native-config';
import auth, {type FirebaseAuthTypes} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';

import {getFirebaseAuth, initializeFirebaseServices} from '@/features/firebase/firebaseClient';
import type {AuthProvider, SessionUser} from '@/types/domain';

const googleWebClientId = Config.LOGGYM_GOOGLE_WEB_CLIENT_ID?.trim();
const googleIosClientId = Config.LOGGYM_GOOGLE_IOS_CLIENT_ID?.trim();

let googleConfigured = false;

const configureGoogleSignin = () => {
  if (googleConfigured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: googleWebClientId || undefined,
    iosClientId:
      Platform.OS === 'ios' ? googleIosClientId || undefined : undefined,
    offlineAccess: false,
    scopes: ['email', 'profile'],
    profileImageSize: 160,
  });

  googleConfigured = true;
};

const getProviderFromFirebaseUser = (user: FirebaseAuthTypes.User): AuthProvider => {
  const providerIds = user.providerData
    .map(provider => provider.providerId)
    .filter(Boolean);

  if (providerIds.includes('google.com')) {
    return 'google';
  }

  if (providerIds.includes('password')) {
    return 'password';
  }

  return 'password';
};

const toIsoDate = (value?: string | null) => {
  if (!value) {
    return new Date().toISOString();
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return new Date().toISOString();
  }

  return timestamp.toISOString();
};

const mapFirebaseUser = (user: FirebaseAuthTypes.User): SessionUser => {
  const name =
    user.displayName?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    'Atleta';

  if (!user.email) {
    throw new Error(
      'Não foi possível identificar o e-mail desta conta. Tente outro método de entrada.',
    );
  }

  return {
    id: user.uid,
    name,
    email: user.email.trim().toLowerCase(),
    photo: user.photoURL,
    givenName: user.displayName?.trim().split(/\s+/)[0] ?? null,
    familyName:
      user.displayName?.trim().split(/\s+/).slice(1).join(' ').trim() || null,
    provider: getProviderFromFirebaseUser(user),
    lastLoginAt: toIsoDate(user.metadata.lastSignInTime),
  };
};

const extractErrorCode = (error: unknown) => {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as {code?: unknown}).code ?? '');
  }

  return '';
};

const mapAuthError = (error: unknown, fallbackMessage: string) => {
  if (isErrorWithCode(error)) {
    const code = String(error.code ?? '');

    if (
      code === '10' ||
      code === 'DEVELOPER_ERROR' ||
      error.message?.includes('DEVELOPER_ERROR')
    ) {
      return new Error(
        'O login Google ainda não foi liberado para esta build. Revise o SHA-1 e o arquivo google-services.json.',
      );
    }

    if (code.toLowerCase().includes('cancel')) {
      return new Error('Operacao cancelada.');
    }
  }

  const code = extractErrorCode(error);

  switch (code) {
    case 'auth/invalid-email':
      return new Error('Use um e-mail válido.');
    case 'auth/email-already-in-use':
      return new Error('Não foi possível concluir o cadastro com os dados informados.');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return new Error('E-mail ou senha inválidos.');
    case 'auth/weak-password':
      return new Error('Escolha uma senha mais forte para continuar.');
    case 'auth/network-request-failed':
      return new Error('Sem conexão com a internet para concluir essa etapa.');
    case 'auth/too-many-requests':
      return new Error('Muitas tentativas seguidas. Aguarde um pouco e tente de novo.');
    case 'auth/user-disabled':
      return new Error('Não foi possível concluir a autenticação desta conta.');
    case 'auth/operation-not-allowed':
      return new Error(
        'Esse método de entrada ainda não foi habilitado no Firebase.',
      );
    default:
      break;
  }

  if (error instanceof Error) {
    const lowered = error.message.toLowerCase();

    if (lowered.includes('cancel')) {
      return new Error('Operacao cancelada.');
    }
  }

  return new Error(fallbackMessage);
};

export const getAuthCapabilities = () => ({
  isGoogleConfigured: Boolean(googleWebClientId),
  hasWebClientId: Boolean(googleWebClientId),
  allowDevLogin: __DEV__ && Config.LOGGYM_ENABLE_DEV_LOGIN === 'true',
});

export const restoreFirebaseSession = async () => {
  initializeFirebaseServices();
  const firebaseAuth = getFirebaseAuth();

  if (firebaseAuth.currentUser) {
    return mapFirebaseUser(firebaseAuth.currentUser);
  }

  const restoredUser = await new Promise<FirebaseAuthTypes.User | null>(
    resolve => {
      let unsubscribe: (() => void) | undefined;

      unsubscribe = firebaseAuth.onAuthStateChanged(user => {
        unsubscribe?.();
        resolve(user);
      });
    },
  );

  return restoredUser ? mapFirebaseUser(restoredUser) : null;
};

export const signInWithGoogleAccount = async () => {
  try {
    initializeFirebaseServices();
    configureGoogleSignin();

    if (!googleWebClientId) {
      throw new Error(
        'O cliente web do Google não foi configurado para esta build.',
      );
    }

    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

    const response = await GoogleSignin.signIn();

    if (response.type !== 'success' || !response.data.idToken) {
      throw new Error('Login com Google cancelado.');
    }

    const credential = auth.GoogleAuthProvider.credential(response.data.idToken);
    const userCredential = await getFirebaseAuth().signInWithCredential(credential);

    return mapFirebaseUser(userCredential.user);
  } catch (error) {
    throw mapAuthError(error, 'Não foi possível entrar com Google agora.');
  }
};

export const signInWithEmailAccount = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    initializeFirebaseServices();

    const userCredential = await getFirebaseAuth().signInWithEmailAndPassword(
      email.trim().toLowerCase(),
      password,
    );

    return mapFirebaseUser(userCredential.user);
  } catch (error) {
    throw mapAuthError(error, 'Não foi possível entrar com e-mail e senha.');
  }
};

export const signUpWithEmailAccount = async ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) => {
  try {
    initializeFirebaseServices();

    const userCredential = await getFirebaseAuth().createUserWithEmailAndPassword(
      email.trim().toLowerCase(),
      password,
    );

    await userCredential.user.updateProfile({
      displayName: name.trim(),
    });

    await getFirebaseAuth().signOut();

    return {
      name: name.trim(),
      email: email.trim().toLowerCase(),
    };
  } catch (error) {
    throw mapAuthError(error, 'Não foi possível criar sua conta agora.');
  }
};

export const sendPasswordResetForEmail = async (email: string) => {
  try {
    initializeFirebaseServices();
    await getFirebaseAuth().sendPasswordResetEmail(email.trim().toLowerCase());
  } catch (error) {
    throw mapAuthError(
      error,
      'Não foi possível enviar o e-mail de redefinição agora.',
    );
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
  initializeFirebaseServices();

  if (provider === 'google') {
    try {
      configureGoogleSignin();
      await GoogleSignin.signOut();
    } catch {
      // O logout local do Firebase continua suficiente para invalidar a sessão do app.
    }
  }

  await getFirebaseAuth().signOut();
};

export const updateProfilePhoto = async (
  currentUser: SessionUser,
  photoDataUrl: string,
) => {
  if (currentUser.provider === 'dev-local') {
    return {
      ...currentUser,
      photo: photoDataUrl,
    };
  }

  try {
    initializeFirebaseServices();
    const firebaseUser = getFirebaseAuth().currentUser;

    if (!firebaseUser) {
      throw new Error('Sua sessão não está pronta para atualizar a foto agora.');
    }

    await firebaseUser.updateProfile({photoURL: photoDataUrl});
    await firebaseUser.reload();

    const reloadedUser = getFirebaseAuth().currentUser;

    if (!reloadedUser) {
      throw new Error('Sua sessão não está pronta para atualizar a foto agora.');
    }

    return mapFirebaseUser(reloadedUser);
  } catch (error) {
    throw mapAuthError(error, 'Não foi possível atualizar a foto de perfil agora.');
  }
};
