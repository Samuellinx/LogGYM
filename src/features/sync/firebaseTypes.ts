export type {
  FirebaseSessionExerciseDocument,
  FirebaseSessionSetDocument,
  FirebaseUserProfileDocument,
  FirebaseWorkoutDocument,
  FirebaseWorkoutExerciseDocument,
  FirebaseWorkoutSessionDocument,
} from '@/shared/firestoreDocuments';

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
