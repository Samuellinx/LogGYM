import type {NavigatorScreenParams} from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  Workouts: undefined;
  History: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  WorkoutForm: { workoutId?: string } | undefined;
  WorkoutDetail: { workoutId: string };
  TrainingSession: { workoutId: string };
  ExerciseProgress: { exerciseName: string };
};
