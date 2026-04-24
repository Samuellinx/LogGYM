import {FirebaseError} from 'firebase/app';
import type {User} from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';

import {firebaseAuth, googleProvider} from './firebase';

const toAuthMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof FirebaseError)) {
    return new Error(fallback);
  }

  switch (error.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new Error('O login foi cancelado antes de ser concluido.');
    case 'auth/popup-blocked':
      return new Error('Libere pop-ups no navegador para continuar com o login.');
    case 'auth/network-request-failed':
      return new Error('Nao foi possivel conectar agora. Verifique sua internet.');
    case 'auth/unauthorized-domain':
      return new Error('Este endereco ainda nao esta autorizado para login.');
    case 'auth/operation-not-allowed':
      return new Error('Este metodo de acesso nao esta disponivel no momento.');
    case 'auth/too-many-requests':
      return new Error('Muitas tentativas em pouco tempo. Aguarde e tente novamente.');
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return new Error('E-mail ou senha invalidos.');
    case 'auth/email-already-in-use':
      return new Error('Nao foi possivel concluir o cadastro com os dados informados.');
    case 'auth/weak-password':
      return new Error('Use uma senha mais forte para continuar.');
    case 'auth/user-disabled':
      return new Error('Nao foi possivel concluir a autenticacao desta conta.');
    default:
      return new Error(fallback);
  }
};

export const observeAuthState = (listener: (user: User | null) => void) =>
  onAuthStateChanged(firebaseAuth, listener);

export const signInWithGooglePopup = async () => {
  try {
    await signInWithPopup(firebaseAuth, googleProvider);
  } catch (error) {
    throw toAuthMessage(error, 'Nao foi possivel entrar com Google agora.');
  }
};

export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  } catch (error) {
    throw toAuthMessage(error, 'Nao foi possivel entrar com e-mail agora.');
  }
};

export const signUpWithEmailPassword = async (
  name: string,
  email: string,
  password: string,
) => {
  try {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      email.trim().toLowerCase(),
      password,
    );

    await updateProfile(credential.user, {
      displayName: name.trim(),
    });
  } catch (error) {
    throw toAuthMessage(error, 'Nao foi possivel criar a conta agora.');
  }
};

export const sendResetPasswordEmail = async (email: string) => {
  try {
    await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase());
  } catch (error) {
    throw toAuthMessage(error, 'Nao foi possivel enviar o link agora.');
  }
};

export const signOutFromPanel = async () => {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    throw toAuthMessage(error, 'Nao foi possivel sair da conta agora.');
  }
};
