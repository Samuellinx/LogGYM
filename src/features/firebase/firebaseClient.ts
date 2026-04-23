import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
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

export const initializeFirebaseServices = () => {
  if (initialized) {
    return;
  }

  if (parseBooleanFlag(Config.LOGGYM_FIREBASE_USE_EMULATORS)) {
    const authHost = Config.LOGGYM_FIREBASE_AUTH_EMULATOR_HOST?.trim();
    const firestoreHost = parseHostAndPort(
      Config.LOGGYM_FIREBASE_FIRESTORE_EMULATOR_HOST,
    );

    if (authHost) {
      auth().useEmulator(`http://${authHost}`);
    }

    if (firestoreHost) {
      firestore().useEmulator(firestoreHost.host, firestoreHost.port);
    }
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
