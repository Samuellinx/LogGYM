import {NavigationContainer, type Theme} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  ChartNoAxesColumn,
  House,
  UserRound,
  ClipboardList,
} from 'lucide-react-native';

import {LoginScreen} from '@/screens/LoginScreen';
import {DashboardScreen} from '@/screens/DashboardScreen';
import {WorkoutsScreen} from '@/screens/WorkoutsScreen';
import {HistoryScreen} from '@/screens/HistoryScreen';
import {ProfileScreen} from '@/screens/ProfileScreen';
import {WorkoutFormScreen} from '@/screens/WorkoutFormScreen';
import {WorkoutDetailScreen} from '@/screens/WorkoutDetailScreen';
import {TrainingSessionScreen} from '@/screens/TrainingSessionScreen';
import {ExerciseProgressScreen} from '@/screens/ExerciseProgressScreen';
import {MainTabParamList, RootStackParamList} from '@/navigation/types';
import {theme} from '@/theme';
import {useAppStore} from '@/store/useAppStore';

const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: theme.colors.accent,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.accentSecondary,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '800',
    },
  },
};

const Tabs = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<{Login: undefined}>();

const tabIcons = {
  Dashboard: House,
  Workouts: ClipboardList,
  History: ChartNoAxesColumn,
  Profile: UserRound,
} satisfies Record<keyof MainTabParamList, typeof House>;

const renderTabIcon = (
  routeName: keyof MainTabParamList,
  color: string,
  size: number,
) => {
  const Icon = tabIcons[routeName];
  return <Icon color={color} size={size} />;
};

const MainTabs = () => (
  <Tabs.Navigator
    screenOptions={({route}) => {
      return {
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0C1017',
          borderTopColor: theme.colors.border,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSoft,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({color, size}) =>
          renderTabIcon(route.name as keyof MainTabParamList, color, size),
      };
    }}>
    <Tabs.Screen name="Dashboard" component={DashboardScreen} />
    <Tabs.Screen name="Workouts" component={WorkoutsScreen} options={{title: 'Treinos'}} />
    <Tabs.Screen name="History" component={HistoryScreen} options={{title: 'Historico'}} />
    <Tabs.Screen name="Profile" component={ProfileScreen} options={{title: 'Perfil'}} />
  </Tabs.Navigator>
);

export const RootNavigator = () => {
  const session = useAppStore(state => state.session);

  return (
    <NavigationContainer theme={navigationTheme}>
      {session ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.text,
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="WorkoutForm"
            component={WorkoutFormScreen}
            options={{title: 'Editor de treino'}}
          />
          <Stack.Screen
            name="WorkoutDetail"
            component={WorkoutDetailScreen}
            options={{title: 'Detalhe do treino'}}
          />
          <Stack.Screen
            name="TrainingSession"
            component={TrainingSessionScreen}
            options={{title: 'Registrar treino'}}
          />
          <Stack.Screen
            name="ExerciseProgress"
            component={ExerciseProgressScreen}
            options={{title: 'Evolucao do exercicio'}}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{headerShown: false}}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};
