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

export const observeAuthState = (listener: (user: User | null) => void) =>
  onAuthStateChanged(firebaseAuth, listener);

export const signInWithGooglePopup = async () => {
  await signInWithPopup(firebaseAuth, googleProvider);
};

export const signInWithEmailPassword = async (email: string, password: string) => {
  await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
};

export const signUpWithEmailPassword = async (
  name: string,
  email: string,
  password: string,
) => {
  const credential = await createUserWithEmailAndPassword(
    firebaseAuth,
    email.trim(),
    password,
  );

  await updateProfile(credential.user, {
    displayName: name.trim(),
  });
};

export const sendResetPasswordEmail = async (email: string) => {
  await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase());
};

export const signOutFromPanel = async () => {
  await signOut(firebaseAuth);
};
