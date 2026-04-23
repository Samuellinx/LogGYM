declare module 'react-native-config' {
  export interface NativeConfig {
    LOGGYM_GOOGLE_WEB_CLIENT_ID?: string;
    LOGGYM_GOOGLE_IOS_CLIENT_ID?: string;
    LOGGYM_ENABLE_DEV_LOGIN?: string;
    LOGGYM_FIREBASE_USE_EMULATORS?: string;
    LOGGYM_FIREBASE_AUTH_EMULATOR_HOST?: string;
    LOGGYM_FIREBASE_FIRESTORE_EMULATOR_HOST?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
