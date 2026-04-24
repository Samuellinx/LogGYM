import {initializeApp} from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
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
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
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

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
});

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

if (env.VITE_FIREBASE_USE_EMULATORS === 'true' && isLocalRuntimeHost) {
  if (env.VITE_FIREBASE_AUTH_EMULATOR_URL) {
    connectAuthEmulator(firebaseAuth, env.VITE_FIREBASE_AUTH_EMULATOR_URL, {
      disableWarnings: true,
    });
  }

  if (
    env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST &&
    env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT
  ) {
    connectFirestoreEmulator(
      firebaseDb,
      env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST,
      Number(env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT),
    );
  }
}
