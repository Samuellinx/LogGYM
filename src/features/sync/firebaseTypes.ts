import type {AuthProvider} from '@/types/domain';

export type FirebaseWorkoutExerciseDocument = {
  id: string;
  name: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  note: string;
  orderIndex: number;
};

export type FirebaseWorkoutDocument = {
  id: string;
  userId: string;
  name: string;
  focus: string;
  notes: string;
  accentColor: string;
  scheduledDay: string | null;
  exercises: FirebaseWorkoutExerciseDocument[];
  createdAt: string;
  updatedAt: string;
};

export type FirebaseSessionSetDocument = {
  load: number;
  reps: number;
  note: string;
};

export type FirebaseSessionExerciseDocument = {
  workoutExerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: FirebaseSessionSetDocument[];
};

export type FirebaseWorkoutSessionDocument = {
  id: string;
  userId: string;
  workoutId: string | null;
  workoutName: string;
  focus: string;
  overallNotes: string;
  performedAt: string;
  createdAt: string;
  exercises: FirebaseSessionExerciseDocument[];
  totalSets: number;
  totalVolume: number;
  topLoad: number;
};

export type FirebaseUserProfileDocument = {
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

export type SyncQueueEntityType = 'workout' | 'session';

export type SyncQueueOperation =
  | 'upsert_workout'
  | 'delete_workout'
  | 'upsert_session'
  | 'delete_session';

export type SyncQueueItem = {
  id: string;
  userId: string;
  entityType: SyncQueueEntityType;
  entityId: string;
  operation: SyncQueueOperation;
  payload: string | null;
  createdAt: string;
};
