declare module 'react-native-config' {
  export interface NativeConfig {
    LOGGYM_GOOGLE_WEB_CLIENT_ID?: string;
    LOGGYM_GOOGLE_IOS_CLIENT_ID?: string;
    LOGGYM_ENABLE_DEV_LOGIN?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
