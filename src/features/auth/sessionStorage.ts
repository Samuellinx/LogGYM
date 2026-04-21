import * as Keychain from 'react-native-keychain';

import type {StoredSession} from '@/types/domain';

const SESSION_SERVICE = 'loggym.session';

export const persistStoredSession = async (session: StoredSession) => {
  await Keychain.setGenericPassword(session.user.email, JSON.stringify(session), {
    service: SESSION_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
};

export const loadStoredSession = async () => {
  const credentials = await Keychain.getGenericPassword({
    service: SESSION_SERVICE,
  });

  if (!credentials) {
    return null;
  }

  try {
    return JSON.parse(credentials.password) as StoredSession;
  } catch {
    await Keychain.resetGenericPassword({service: SESSION_SERVICE});
    return null;
  }
};

export const clearStoredSession = async () => {
  await Keychain.resetGenericPassword({service: SESSION_SERVICE});
};
