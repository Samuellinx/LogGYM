export type AuthMode = 'signin' | 'signup' | 'forgot';
export type WorkspaceView = 'dashboard' | 'workouts' | 'history' | 'profile';
export type AuthProvider = 'google' | 'password' | 'dev-local';

export type UserProfileDocument = {
  uid: string;
  email: string;
  name: string;
  photo: string | null;
  avatarId: string;
  givenName: string | null;
  familyName: string | null;
  provider: AuthProvider;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
};

export type WorkoutExerciseInput = {
  id: string;
  name: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  note: string;
  orderIndex: number;
};

export type WorkoutDocument = {
  id: string;
  userId: string;
  name: string;
  focus: string;
  notes: string;
  accentColor: string;
  scheduledDay: string | null;
  exercises: WorkoutExerciseInput[];
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSessionSetDocument = {
  load: number;
  reps: number;
  note: string;
};

export type WorkoutSessionExerciseDocument = {
  workoutExerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: WorkoutSessionSetDocument[];
};

export type WorkoutSessionDocument = {
  id: string;
  userId: string;
  workoutId: string | null;
  workoutName: string;
  focus: string;
  overallNotes: string;
  performedAt: string;
  createdAt: string;
  exercises: WorkoutSessionExerciseDocument[];
  totalSets: number;
  totalVolume: number;
  topLoad: number;
};

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
  sets: TrainingDraftSet[];
};

export type TrainingDraftExerciseState = {
  pendingExercises: TrainingDraftExercise[];
  completedExercises: TrainingDraftExercise[];
};
