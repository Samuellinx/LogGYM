import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import Config from 'react-native-config';

const parseBooleanFlag = (value?: string) =>
  value?.trim().toLowerCase() === 'true';

const parseHostAndPort = (value?: string) => {
  if (!value) {
    return null;
  }

  const [host, portValue] = value.trim().split(':');
  const port = Number(portValue);

  if (!host || !Number.isInteger(port) || port <= 0) {
    return null;
  }

  return {host, port};
};

let initialized = false;

const getFirebaseEmulatorConfig = () => {
  if (!__DEV__ || !parseBooleanFlag(Config.LOGGYM_FIREBASE_USE_EMULATORS)) {
    return null;
  }

  const authHost = Config.LOGGYM_FIREBASE_AUTH_EMULATOR_HOST?.trim();
  const firestoreHost = parseHostAndPort(
    Config.LOGGYM_FIREBASE_FIRESTORE_EMULATOR_HOST,
  );
  const storageHost = parseHostAndPort(
    Config.LOGGYM_FIREBASE_STORAGE_EMULATOR_HOST,
  );

  if (!authHost || !firestoreHost || !storageHost) {
    return null;
  }

  return {
    authUrl: `http://${authHost}`,
    firestoreHost,
    storageHost,
  };
};

export const initializeFirebaseServices = () => {
  if (initialized) {
    return;
  }

  const emulatorConfig = getFirebaseEmulatorConfig();

  if (emulatorConfig) {
    auth().useEmulator(emulatorConfig.authUrl);
    firestore().useEmulator(
      emulatorConfig.firestoreHost.host,
      emulatorConfig.firestoreHost.port,
    );
    storage().useEmulator(
      emulatorConfig.storageHost.host,
      emulatorConfig.storageHost.port,
    );
  }

  initialized = true;
};

export const getFirebaseAuth = () => {
  initializeFirebaseServices();
  return auth();
};

export const getFirebaseFirestore = () => {
  initializeFirebaseServices();
  return firestore();
};
