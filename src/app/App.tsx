import {useEffect} from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {enableScreens} from 'react-native-screens';

import {OfflineBanner} from '@/components/OfflineBanner';
import {RootNavigator} from '@/navigation/RootNavigator';
import {SplashScreen} from '@/screens/SplashScreen';
import {theme} from '@/theme';
import {useAppStore} from '@/store/useAppStore';

enableScreens();

const App = () => {
  const bootstrap = useAppStore(state => state.bootstrap);
  const isBootstrapping = useAppStore(state => state.isBootstrapping);
  const isOnline = useAppStore(state => state.isOnline);
  const error = useAppStore(state => state.error);
  const session = useAppStore(state => state.session);
  const setOnline = useAppStore(state => state.setOnline);
  const refreshData = useAppStore(state => state.refreshData);

  useEffect(() => {
    bootstrap().catch(() => {
      // O estado de erro ja e tratado dentro do store.
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      const connected =
        Boolean(state.isConnected) && state.isInternetReachable !== false;
      setOnline(connected);
    });

    return unsubscribe;
  }, [bootstrap, setOnline]);

  useEffect(() => {
    if (!isOnline || !session) {
      return;
    }

    refreshData().catch(() => {
      // O erro de sincronizacao ja e refletido pelo store.
    });
  }, [isOnline, refreshData, session]);

  if (isBootstrapping || (!session && error)) {
    return (
      <SplashScreen
        error={error}
        onRetry={() => {
          bootstrap().catch(() => {
            // O estado de erro ja e tratado dentro do store.
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
          {error && session ? (
            <Text style={styles.errorLabel}>
              Algumas informacoes nao foram atualizadas agora. Tente novamente em instantes.
            </Text>
          ) : null}
          <View style={styles.navigatorWrap}>
            <RootNavigator />
          </View>
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
  errorLabel: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.warning,
    ...theme.typography.caption,
  },
});

export default App;
