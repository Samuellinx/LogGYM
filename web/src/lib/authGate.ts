export type AuthView = 'loading' | 'auth' | 'workspace';

type AuthGateState = {
  isAuthReady: boolean;
  user: {uid: string} | null;
};

export const resolveAuthView = ({isAuthReady, user}: AuthGateState): AuthView => {
  if (!isAuthReady) {
    return 'loading';
  }

  return user ? 'workspace' : 'auth';
};
