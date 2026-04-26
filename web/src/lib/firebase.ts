import {initializeApp} from 'firebase/app';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore';
import {z} from 'zod';

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  VITE_FIREBASE_USE_EMULATORS: z.string().optional(),
  VITE_FIREBASE_AUTH_EMULATOR_URL: z.string().optional(),
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: z.string().optional(),
  VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: z.string().optional(),
});

const env = envSchema.parse(import.meta.env);
const isLocalRuntimeHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const parseEmulatorPort = (value?: string) => {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return port;
};

const getWebFirebaseEmulatorConfig = () => {
  if (env.VITE_FIREBASE_USE_EMULATORS !== 'true' || !isLocalRuntimeHost) {
    return null;
  }

  const authUrl = env.VITE_FIREBASE_AUTH_EMULATOR_URL?.trim();
  const firestoreHost = env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST?.trim();
  const firestorePort = parseEmulatorPort(env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT);

  if (!authUrl || !firestoreHost || !firestorePort) {
    return null;
  }

  return {
    authUrl,
    firestoreHost,
    firestorePort,
  };
};

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
});

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const firebaseAuthPersistenceReady = setPersistence(
  firebaseAuth,
  browserLocalPersistence,
).catch(() => undefined);

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const webFirebaseEmulatorConfig = getWebFirebaseEmulatorConfig();

if (webFirebaseEmulatorConfig) {
  connectAuthEmulator(firebaseAuth, webFirebaseEmulatorConfig.authUrl, {
    disableWarnings: true,
  });

  connectFirestoreEmulator(
    firebaseDb,
    webFirebaseEmulatorConfig.firestoreHost,
    webFirebaseEmulatorConfig.firestorePort,
  );
}
