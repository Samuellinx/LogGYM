import type {
  WorkoutDocument,
  WorkoutSessionDocument,
} from '../../src/shared/firestoreDocuments';

export type AuthMode = 'signin' | 'signup' | 'forgot';
export type WorkspaceView = 'dashboard' | 'workouts' | 'history' | 'profile';

export type {
  AuthProvider,
  UserProfileDocument,
  WorkoutDocument,
  WorkoutExerciseInput,
  WorkoutSessionDocument,
  WorkoutSessionExerciseDocument,
  WorkoutSessionSetDocument,
} from '../../src/shared/firestoreDocuments';

export type DashboardPersonalRecord = {
  exerciseName: string;
  maxLoad: number;
};

export type DashboardRecentExercise = {
  exerciseName: string;
  lastPerformedAt: string;
  totalSets: number;
  maxLoad: number;
};

export type DashboardSnapshot = {
  highlightedWorkouts: WorkoutDocument[];
  lastSession: WorkoutSessionDocument | null;
  personalRecords: DashboardPersonalRecord[];
  recentExercises: DashboardRecentExercise[];
  totalSessions: number;
  totalTemplates: number;
  totalTrackedSets: number;
  weeklySessions: number;
};

export type ExerciseProgressPoint = {
  performedAt: string;
  workoutName: string;
  load: number;
  loadLabel?: string;
  reps: number;
  volume: number;
  note: string;
};

export type ExerciseProgressData = {
  exerciseName: string;
  recordLoad: number;
  totalVolume: number;
  averageReps: number;
  lastPerformedAt: string | null;
  points: ExerciseProgressPoint[];
};

export type TrainingDraftSet = {
  id: string;
  seriesNumber: number;
  load: string;
  reps: string;
  note: string;
};

export type TrainingDraftExercise = {
  workoutExerciseId: string;
  orderIndex: number;
  exerciseName: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  hint: string;
  status?: 'not-performed';
  sets: TrainingDraftSet[];
};

export type TrainingDraftExerciseState = {
  pendingExercises: TrainingDraftExercise[];
  completedExercises: TrainingDraftExercise[];
};
