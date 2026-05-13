import {useEffect, useState} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {enableScreens} from 'react-native-screens';

import {OfflineBanner} from '@/components/OfflineBanner';
import {ErrorModal} from '@/components/ErrorModal';
import {RootNavigator} from '@/navigation/RootNavigator';
import {SplashScreen} from '@/screens/SplashScreen';
import {theme} from '@/theme';
import {useAppStore} from '@/store/useAppStore';
import {toUserMessage} from '@/utils/errors';

enableScreens();

const App = () => {
  const bootstrap = useAppStore(state => state.bootstrap);
  const isBootstrapping = useAppStore(state => state.isBootstrapping);
  const isOnline = useAppStore(state => state.isOnline);
  const error = useAppStore(state => state.error);
  const session = useAppStore(state => state.session);
  const setOnline = useAppStore(state => state.setOnline);
  const refreshData = useAppStore(state => state.refreshData);
  const clearError = useAppStore(state => state.clearError);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [hasSplashSettled, setHasSplashSettled] = useState(false);

  useEffect(() => {
    bootstrap().catch(() => {
      // O estado de erro já é tratado dentro do store.
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      const connected =
        Boolean(state.isConnected) && state.isInternetReachable !== false;
      setOnline(connected);
    });

    return unsubscribe;
  }, [bootstrap, setOnline]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setHasSplashSettled(true), 1800);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const errorUtils = (
      globalThis as typeof globalThis & {
        ErrorUtils?: {
          getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
          setGlobalHandler?: (
            handler: (error: unknown, isFatal?: boolean) => void,
          ) => void;
        };
      }
    ).ErrorUtils;
    const previousHandler = errorUtils?.getGlobalHandler?.();

    errorUtils?.setGlobalHandler?.((runtimeFailure, isFatal) => {
      setRuntimeError(
        toUserMessage(
          runtimeFailure,
          isFatal
            ? 'O app encontrou uma falha inesperada.'
            : 'Uma operação falhou antes de ser concluída.',
        ),
      );
      previousHandler?.(runtimeFailure, isFatal);
    });

    return () => {
      if (previousHandler) {
        errorUtils?.setGlobalHandler?.(previousHandler);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOnline || !session) {
      return;
    }

    refreshData().catch(() => {
      // O erro de sincronização já é refletido pelo store.
    });
  }, [isOnline, refreshData, session]);

  const modalError = runtimeError ?? (session ? error : null);

  if (!hasSplashSettled || isBootstrapping || (!session && error)) {
    return (
      <SplashScreen
        error={error}
        onRetry={() => {
          bootstrap().catch(() => {
            // O estado de erro já é tratado dentro do store.
          });
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar
          backgroundColor={theme.colors.background}
          barStyle="light-content"
        />
        <View style={styles.root}>
          <OfflineBanner visible={!isOnline && Boolean(session)} />
          <View style={styles.navigatorWrap}>
            <RootNavigator />
          </View>
          <ErrorModal
            visible={Boolean(modalError)}
            message={
              modalError ??
              'O app encontrou uma falha inesperada. Tente novamente em instantes.'
            }
            onClose={() => {
              setRuntimeError(null);
              clearError();
            }}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navigatorWrap: {
    flex: 1,
  },
});

export default App;
