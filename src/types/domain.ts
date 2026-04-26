export type AuthProvider = 'google' | 'dev-local' | 'password';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  avatarId: string;
  givenName: string | null;
  familyName: string | null;
  provider: AuthProvider;
  lastLoginAt: string;
}

export interface StoredSession {
  provider: AuthProvider;
  signedInAt: string;
  user: SessionUser;
}

export interface WorkoutExerciseDraft {
  id?: string;
  name: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  note: string;
}

export interface WorkoutInput {
  name: string;
  focus: string;
  notes: string;
  accentColor: string;
  scheduledDay?: string | null;
  exercises: WorkoutExerciseDraft[];
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  name: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  note: string;
  orderIndex: number;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  focus: string;
  notes: string;
  accentColor: string;
  scheduledDay: string | null;
  exerciseCount: number;
  lastPerformedAt: string | null;
  updatedAt: string;
}

export interface WorkoutDetail extends WorkoutSummary {
  exercises: WorkoutExercise[];
}

export interface SessionSetInput {
  load: number;
  reps: number;
  note: string;
}

export interface TrainingExerciseInput {
  workoutExerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: SessionSetInput[];
}

export interface TrainingSessionInput {
  workoutId: string;
  workoutName: string;
  focus: string;
  overallNotes: string;
  performedAt: string;
  exercises: TrainingExerciseInput[];
}

export interface WorkoutHistoryItem {
  id: string;
  workoutId: string | null;
  workoutName: string;
  focus: string;
  performedAt: string;
  overallNotes: string;
  totalSets: number;
  totalVolume: number;
  topLoad: number;
  exercises: string[];
}

export interface DashboardExerciseSummary {
  exerciseName: string;
  lastPerformedAt: string;
  maxLoad: number;
  totalSets: number;
}

export interface PersonalRecord {
  exerciseName: string;
  maxLoad: number;
}

export interface DashboardData {
  weeklySessions: number;
  totalSessions: number;
  totalTemplates: number;
  totalTrackedSets: number;
  lastSession: WorkoutHistoryItem | null;
  recentExercises: DashboardExerciseSummary[];
  personalRecords: PersonalRecord[];
  suggestedTemplates: WorkoutSummary[];
}

export interface ProgressPoint {
  performedAt: string;
  workoutName: string;
  load: number;
  reps: number;
  volume: number;
  note: string;
}

export interface ExerciseProgressData {
  exerciseName: string;
  recordLoad: number;
  totalVolume: number;
  averageReps: number;
  lastPerformedAt: string | null;
  points: ProgressPoint[];
}
