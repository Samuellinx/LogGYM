import {create} from 'zustand';

import type {
  DashboardData,
  StoredSession,
  WorkoutHistoryItem,
  WorkoutSummary,
} from '@/types/domain';
import {initializeDatabase} from '@/storage/database';
import {
  getAuthCapabilities,
  restoreFirebaseSession,
  sendPasswordResetForEmail,
  signInWithDevelopmentAccount,
  signInWithEmailAccount,
  signInWithGoogleAccount,
  signOutFromProvider,
  signUpWithEmailAccount,
} from '@/features/auth/authService';
import {syncFirebaseUserData} from '@/features/sync/firebaseSyncService';
import {
  ensureUserRecord,
  getDashboardData,
  listHistory,
  listWorkouts,
  migrateLegacyUserToSession,
  purgeLegacySeedData,
} from '@/features/workouts/workoutRepository';
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
  ) => Promise<{name: string; email: string}>;
  sendPasswordReset: (email: string) => Promise<void>;
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

const shouldSyncRemote = (
  isOnline: boolean,
  user: NonNullable<StoredSession['user']>,
) => isOnline && user.provider !== 'dev-local';

const prepareLocalSessionData = async (
  user: NonNullable<StoredSession['user']>,
) => {
  await migrateLegacyUserToSession(user);
  await ensureUserRecord(user);
  await purgeLegacySeedData(user.id);
};

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

      const restoredUser = await restoreFirebaseSession();

      if (!restoredUser) {
        set({
          isBootstrapping: false,
          session: null,
          dashboard: null,
          workouts: [],
          history: [],
          error: null,
        });
        return;
      }

      await prepareLocalSessionData(restoredUser);

      let syncError: string | null = null;

      if (shouldSyncRemote(get().isOnline, restoredUser)) {
        try {
          await syncFirebaseUserData(restoredUser);
        } catch (error) {
          syncError = toUserMessage(
            error,
            'Nao foi possivel sincronizar os treinos com a nuvem agora.',
          );
        }
      }

      const data = await loadAllData(restoredUser.id);

      set({
        ...data,
        session: createSession(restoredUser),
        isBootstrapping: false,
        error: syncError,
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

    let syncError: string | null = null;

    try {
      await prepareLocalSessionData(session.user);

      if (shouldSyncRemote(get().isOnline, session.user)) {
        try {
          await syncFirebaseUserData(session.user);
        } catch (error) {
          syncError = toUserMessage(
            error,
            'Nao foi possivel sincronizar os treinos com a nuvem agora.',
          );
        }
      }

      const data = await loadAllData(session.user.id);
      set({...data, isRefreshing: false, error: syncError});
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
      await prepareLocalSessionData(user);

      let syncError: string | null = null;

      if (shouldSyncRemote(get().isOnline, user)) {
        try {
          await syncFirebaseUserData(user);
        } catch (error) {
          syncError = toUserMessage(
            error,
            'Entrou na conta, mas a sincronizacao ainda nao aconteceu.',
          );
        }
      }

      const data = await loadAllData(user.id);

      set({
        ...data,
        session: createSession(user),
        error: syncError,
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
      await prepareLocalSessionData(user);

      const data = await loadAllData(user.id);

      set({
        ...data,
        session: createSession(user),
        error: null,
      });
    } catch (error) {
      const message = toUserMessage(
        error,
        'Falha ao abrir a sessao de desenvolvimento.',
      );
      set({error: message});
      throw new Error(message);
    }
  },

  signInWithCredentials: async (email, password) => {
    try {
      const user = await signInWithEmailAccount({email, password});
      await prepareLocalSessionData(user);

      let syncError: string | null = null;

      if (shouldSyncRemote(get().isOnline, user)) {
        try {
          await syncFirebaseUserData(user);
        } catch (error) {
          syncError = toUserMessage(
            error,
            'Entrou na conta, mas a sincronizacao ainda nao aconteceu.',
          );
        }
      }

      const data = await loadAllData(user.id);

      set({
        ...data,
        session: createSession(user),
        error: syncError,
      });
    } catch (error) {
      const message = toUserMessage(error, 'Falha ao entrar com sua conta.');
      set({error: message});
      throw new Error(message);
    }
  },

  signUpWithCredentials: async (name, email, password) => {
    try {
      const result = await signUpWithEmailAccount({
        name,
        email,
        password,
      });

      set({error: null});
      return result;
    } catch (error) {
      const message = toUserMessage(error, 'Falha ao criar sua conta.');
      set({error: message});
      throw new Error(message);
    }
  },

  sendPasswordReset: async email => {
    try {
      await sendPasswordResetForEmail(email);
      set({error: null});
    } catch (error) {
      const message = toUserMessage(
        error,
        'Falha ao enviar o e-mail de redefinicao.',
      );
      set({error: message});
      throw new Error(message);
    }
  },

  signOut: async () => {
    const session = get().session;

    if (session) {
      await signOutFromProvider(session.provider);
    }

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
