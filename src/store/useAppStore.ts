import {create} from 'zustand';

import type {DashboardData, StoredSession, WorkoutHistoryItem, WorkoutSummary} from '@/types/domain';
import {initializeDatabase} from '@/storage/database';
import {clearStoredSession, loadStoredSession, persistStoredSession} from '@/features/auth/sessionStorage';
import {getAuthCapabilities, signInWithDevelopmentAccount, signInWithGoogleAccount, signOutFromProvider, trySilentGoogleSession} from '@/features/auth/authService';
import {
  resetCredentialPassword,
  signInWithCredentialAccount,
  signUpWithCredentialAccount,
} from '@/features/auth/localAuthService';
import {ensureUserRecord, getDashboardData, listHistory, listWorkouts, purgeLegacySeedData} from '@/features/workouts/workoutRepository';
import {toUserMessage} from '@/utils/errors';

interface AppStoreState {
  isBootstrapping: boolean;
  isRefreshing: boolean;
  isOnline: boolean;
  error: string | null;
  session: StoredSession | null;
  dashboard: DashboardData | null;
  workouts: WorkoutSummary[];
  history: WorkoutHistoryItem[];
  bootstrap: () => Promise<void>;
  refreshData: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithDev: () => Promise<void>;
  signInWithCredentials: (email: string, password: string) => Promise<void>;
  signUpWithCredentials: (
    name: string,
    email: string,
    password: string,
    recoveryCode: string,
  ) => Promise<void>;
  resetPasswordWithRecovery: (
    email: string,
    recoveryCode: string,
    newPassword: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setOnline: (isOnline: boolean) => void;
}

const loadAllData = async (userId: string) => {
  const [dashboard, workouts, history] = await Promise.all([
    getDashboardData(userId),
    listWorkouts(userId),
    listHistory(userId),
  ]);

  return {dashboard, workouts, history};
};

const createSession = (user: NonNullable<StoredSession['user']>): StoredSession => ({
  provider: user.provider,
  signedInAt: new Date().toISOString(),
  user,
});

export const useAppStore = create<AppStoreState>((set, get) => ({
  isBootstrapping: true,
  isRefreshing: false,
  isOnline: true,
  error: null,
  session: null,
  dashboard: null,
  workouts: [],
  history: [],

  bootstrap: async () => {
    set({isBootstrapping: true, error: null});

    try {
      await initializeDatabase();

      let storedSession = await loadStoredSession();

      if (!storedSession) {
        const restoredGoogleUser = await trySilentGoogleSession();

        if (restoredGoogleUser) {
          storedSession = createSession(restoredGoogleUser);
          await persistStoredSession(storedSession);
        }
      }

      if (!storedSession) {
        set({
          isBootstrapping: false,
          session: null,
          dashboard: null,
          workouts: [],
          history: [],
        });
        return;
      }

      await ensureUserRecord(storedSession.user);
      await purgeLegacySeedData(storedSession.user.id);

      const data = await loadAllData(storedSession.user.id);

      set({
        ...data,
        session: storedSession,
        isBootstrapping: false,
      });
    } catch (error) {
      set({
        error: toUserMessage(error, 'Nao foi possivel iniciar o aplicativo.'),
        isBootstrapping: false,
      });
    }
  },

  refreshData: async () => {
    const session = get().session;

    if (!session) {
      return;
    }

    set({isRefreshing: true, error: null});

    try {
      const data = await loadAllData(session.user.id);
      set({...data, isRefreshing: false});
    } catch (error) {
      set({
        isRefreshing: false,
        error: toUserMessage(error, 'Falha ao atualizar os dados do treino.'),
      });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      const user = await signInWithGoogleAccount();
      const session = createSession(user);

      await ensureUserRecord(user);
      await purgeLegacySeedData(user.id);
      await persistStoredSession(session);

      const data = await loadAllData(user.id);

      set({
        ...data,
        session,
        error: null,
      });
    } catch (error) {
      const message = toUserMessage(error, 'Falha ao entrar com Google.');
      set({error: message});
      throw new Error(message);
    }
  },

  signInWithDev: async () => {
    try {
      const capabilities = getAuthCapabilities();

      if (!capabilities.allowDevLogin) {
        throw new Error('Modo DEV local indisponivel nesta build.');
      }

      const user = await signInWithDevelopmentAccount();
      const session = createSession(user);

      await ensureUserRecord(user);
      await purgeLegacySeedData(user.id);
      await persistStoredSession(session);

      const data = await loadAllData(user.id);

      set({
        ...data,
        session,
        error: null,
      });
    } catch (error) {
      const message = toUserMessage(error, 'Falha ao abrir a sessao de desenvolvimento.');
      set({error: message});
      throw new Error(message);
    }
  },

  signInWithCredentials: async (email, password) => {
    try {
      const user = await signInWithCredentialAccount({email, password});
      const session = createSession(user);

      await ensureUserRecord(user);
      await purgeLegacySeedData(user.id);
      await persistStoredSession(session);

      const data = await loadAllData(user.id);

      set({
        ...data,
        session,
        error: null,
      });
    } catch (error) {
      const message = toUserMessage(error, 'Falha ao entrar com sua conta.');
      set({error: message});
      throw new Error(message);
    }
  },

  signUpWithCredentials: async (name, email, password, recoveryCode) => {
    try {
      const user = await signUpWithCredentialAccount({
        name,
        email,
        password,
        recoveryCode,
      });
      const session = createSession(user);

      await ensureUserRecord(user);
      await persistStoredSession(session);

      const data = await loadAllData(user.id);

      set({
        ...data,
        session,
        error: null,
      });
    } catch (error) {
      const message = toUserMessage(error, 'Falha ao criar sua conta.');
      set({error: message});
      throw new Error(message);
    }
  },

  resetPasswordWithRecovery: async (email, recoveryCode, newPassword) => {
    try {
      await resetCredentialPassword({
        email,
        recoveryCode,
        newPassword,
      });

      set({error: null});
    } catch (error) {
      const message = toUserMessage(error, 'Falha ao redefinir sua senha.');
      set({error: message});
      throw new Error(message);
    }
  },

  signOut: async () => {
    const session = get().session;

    if (session) {
      await signOutFromProvider(session.provider);
    }

    await clearStoredSession();

    set({
      session: null,
      dashboard: null,
      workouts: [],
      history: [],
      error: null,
    });
  },

  clearError: () => set({error: null}),
  setOnline: isOnline => set({isOnline}),
}));
