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
  updateProfileAvatar as persistProfileAvatar,
} from '@/features/auth/authService';
import {syncFirebaseUserData} from '@/features/sync/firebaseSyncService';
import {
  deleteAllTrainingDraftAutosaves,
  ensureUserRecord,
  findUserByEmail,
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
  updateProfileAvatar: (avatarId: string) => Promise<void>;
  signOut: () => Promise<void>;
  showError: (message: string) => void;
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

const hydrateStoredAvatar = async (
  user: NonNullable<StoredSession['user']>,
) => {
  const storedUser = await findUserByEmail(user.email);

  if (!storedUser) {
    return user;
  }

  return {
    ...user,
    avatarId: storedUser.avatarId || user.avatarId,
  };
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

      const hydratedUser = await hydrateStoredAvatar(restoredUser);
      await prepareLocalSessionData(hydratedUser);

      let syncError: string | null = null;

      if (shouldSyncRemote(get().isOnline, hydratedUser)) {
        try {
          await syncFirebaseUserData(hydratedUser);
        } catch (error) {
          syncError = toUserMessage(
            error,
            'NÃ£o foi possÃ­vel sincronizar os treinos com a nuvem agora.',
          );
        }
      }

      const data = await loadAllData(hydratedUser.id);

      set({
        ...data,
        session: createSession(hydratedUser),
        isBootstrapping: false,
        error: syncError,
      });
    } catch (error) {
      set({
        error: toUserMessage(error, 'NÃ£o foi possÃ­vel iniciar o aplicativo.'),
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
            'NÃ£o foi possÃ­vel sincronizar os treinos com a nuvem agora.',
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
      const hydratedUser = await hydrateStoredAvatar(user);
      await prepareLocalSessionData(hydratedUser);

      let syncError: string | null = null;

      if (shouldSyncRemote(get().isOnline, hydratedUser)) {
        try {
          await syncFirebaseUserData(hydratedUser);
        } catch (error) {
          syncError = toUserMessage(
            error,
            'Entrou na conta, mas a sincronizaÃ§Ã£o ainda nÃ£o aconteceu.',
          );
        }
      }

      const data = await loadAllData(hydratedUser.id);

      set({
        ...data,
        session: createSession(hydratedUser),
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
        throw new Error('Modo DEV local indisponÃ­vel nesta build.');
      }

      const user = await signInWithDevelopmentAccount();
      const hydratedUser = await hydrateStoredAvatar(user);
      await prepareLocalSessionData(hydratedUser);

      const data = await loadAllData(hydratedUser.id);

      set({
        ...data,
        session: createSession(hydratedUser),
        error: null,
      });
    } catch (error) {
      const message = toUserMessage(
        error,
        'Falha ao abrir a sessÃ£o de desenvolvimento.',
      );
      set({error: message});
      throw new Error(message);
    }
  },

  signInWithCredentials: async (email, password) => {
    try {
      const user = await signInWithEmailAccount({email, password});
      const hydratedUser = await hydrateStoredAvatar(user);
      await prepareLocalSessionData(hydratedUser);

      let syncError: string | null = null;

      if (shouldSyncRemote(get().isOnline, hydratedUser)) {
        try {
          await syncFirebaseUserData(hydratedUser);
        } catch (error) {
          syncError = toUserMessage(
            error,
            'Entrou na conta, mas a sincronizaÃ§Ã£o ainda nÃ£o aconteceu.',
          );
        }
      }

      const data = await loadAllData(hydratedUser.id);

      set({
        ...data,
        session: createSession(hydratedUser),
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
        'Falha ao enviar o e-mail de redefiniÃ§Ã£o.',
      );
      set({error: message});
      throw new Error(message);
    }
  },

  updateProfileAvatar: async avatarId => {
    const session = get().session;

    if (!session) {
      throw new Error('Nenhuma sessão ativa para atualizar o avatar.');
    }

    try {
      const updatedUser = await persistProfileAvatar(session.user, avatarId);
      await ensureUserRecord(updatedUser);

      let syncError: string | null = null;

      if (shouldSyncRemote(get().isOnline, updatedUser)) {
        try {
          await syncFirebaseUserData(updatedUser);
        } catch (error) {
          syncError = toUserMessage(
            error,
            'O avatar foi atualizado, mas a sincronização ainda não aconteceu.',
          );
        }
      }

      set({
        session: createSession(updatedUser),
        error: syncError,
      });
    } catch (error) {
      const message = toUserMessage(
        error,
        'Não foi possível atualizar o avatar do perfil.',
      );
      set({error: message});
      throw new Error(message);
    }
  },

  signOut: async () => {
    const session = get().session;

    if (session) {
      await signOutFromProvider(session.provider);
      await deleteAllTrainingDraftAutosaves(session.user.id);
    }

    set({
      session: null,
      dashboard: null,
      workouts: [],
      history: [],
      error: null,
    });
  },

  showError: message => set({error: message}),
  clearError: () => set({error: null}),
  setOnline: isOnline => set({isOnline}),
}));
