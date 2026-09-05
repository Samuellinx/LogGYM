import {z} from 'zod';

import {getFirebaseFirestore} from '@/features/firebase/firebaseClient';
import type {
  FirebaseWorkoutDocument,
  FirebaseWorkoutSessionDocument,
} from '@/features/sync/firebaseTypes';
import type {SessionUser} from '@/types/domain';
import {
  workoutDocumentSchema,
  workoutSessionDocumentSchema,
} from '@/shared/firestoreDocuments';
import {
  buildFirebaseUserProfileDocument,
  clearSyncQueueItems,
  getAllSessionDocumentsForSync,
  getAllWorkoutDocumentsForSync,
  listSyncQueue,
  replaceLocalDataFromRemote,
} from '@/features/workouts/workoutRepository';
import {getDatabase} from '@/storage/database';

const metadataValueRow = z.object({
  value: z.string(),
});

const getMetadataKey = (userId: string) => `firebase.sync.seeded:${userId}`;

const getUserDoc = (userId: string) =>
  getFirebaseFirestore().collection('users').doc(userId);

const getWorkoutCollection = (userId: string) =>
  getUserDoc(userId).collection('workouts');

const getSessionCollection = (userId: string) =>
  getUserDoc(userId).collection('sessions');

const getSeedStatus = async (userId: string) => {
  const db = getDatabase();
  const result = await db.executeAsync<z.infer<typeof metadataValueRow>>(
    'SELECT value FROM metadata WHERE key = ? LIMIT 1;',
    [getMetadataKey(userId)],
  );
  const row = result.rows.item(0);

  if (!row) {
    return null;
  }

  const parsed = metadataValueRow.safeParse(row);
  return parsed.success ? parsed.data.value : null;
};

const setSeedStatus = async (userId: string, value: string) => {
  const db = getDatabase();
  await db.executeAsync(
    `INSERT INTO metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [getMetadataKey(userId), value],
  );
};

const maybeSeedRemoteFromLocal = async (userId: string) => {
  const seedStatus = await getSeedStatus(userId);

  if (seedStatus) {
    return;
  }

  const [remoteWorkoutSnapshot, remoteSessionSnapshot] = await Promise.all([
    getWorkoutCollection(userId).limit(1).get(),
    getSessionCollection(userId).limit(1).get(),
  ]);

  if (!remoteWorkoutSnapshot.empty || !remoteSessionSnapshot.empty) {
    await setSeedStatus(userId, 'remote');
    return;
  }

  const [localWorkouts, localSessions] = await Promise.all([
    getAllWorkoutDocumentsForSync(userId),
    getAllSessionDocumentsForSync(userId),
  ]);

  if (localWorkouts.length === 0 && localSessions.length === 0) {
    await setSeedStatus(userId, 'empty');
    return;
  }

  const firestore = getFirebaseFirestore();

  for (const workout of localWorkouts) {
    const batch = firestore.batch();
    batch.set(getWorkoutCollection(userId).doc(workout.id), workout);
    await batch.commit();
  }

  for (const session of localSessions) {
    const batch = firestore.batch();
    batch.set(getSessionCollection(userId).doc(session.id), session);
    await batch.commit();
  }

  await setSeedStatus(userId, 'seeded');
};

const flushSyncQueue = async (userId: string) => {
  const queue = await listSyncQueue(userId);

  if (queue.length === 0) {
    return;
  }

  const workoutCollection = getWorkoutCollection(userId);
  const sessionCollection = getSessionCollection(userId);
  const completedItemIds: string[] = [];

  const parseQueuedPayload = <T>(payload: string | null, schema: z.ZodSchema<T>) => {
    if (!payload) {
      return null;
    }

    try {
      const parsedJson = JSON.parse(payload) as unknown;
      const parsedPayload = schema.safeParse(parsedJson);
      return parsedPayload.success ? parsedPayload.data : null;
    } catch {
      return null;
    }
  };

  for (const item of queue) {
    switch (item.operation) {
      case 'upsert_workout': {
        const parsed = parseQueuedPayload(item.payload, workoutDocumentSchema);

        if (!parsed) {
          completedItemIds.push(item.id);
          break;
        }

        await workoutCollection.doc(item.entityId).set(parsed);
        completedItemIds.push(item.id);
        break;
      }
      case 'delete_workout':
        await workoutCollection.doc(item.entityId).delete();
        completedItemIds.push(item.id);
        break;
      case 'upsert_session': {
        const parsed = parseQueuedPayload(item.payload, workoutSessionDocumentSchema);

        if (!parsed) {
          completedItemIds.push(item.id);
          break;
        }

        await sessionCollection.doc(item.entityId).set(parsed);
        completedItemIds.push(item.id);
        break;
      }
      case 'delete_session':
        await sessionCollection.doc(item.entityId).delete();
        completedItemIds.push(item.id);
        break;
      default:
        completedItemIds.push(item.id);
        break;
    }
  }

  await clearSyncQueueItems(completedItemIds);
};

const loadRemoteWorkouts = async (userId: string): Promise<FirebaseWorkoutDocument[]> => {
  const snapshot = await getWorkoutCollection(userId).orderBy('updatedAt', 'desc').get();
  const documents: FirebaseWorkoutDocument[] = [];

  snapshot.docs.forEach(documentSnapshot => {
    const parsed = workoutDocumentSchema.safeParse({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    });

    if (parsed.success) {
      documents.push(parsed.data);
    }
  });

  return documents;
};

const loadRemoteSessions = async (
  userId: string,
): Promise<FirebaseWorkoutSessionDocument[]> => {
  const snapshot = await getSessionCollection(userId)
    .orderBy('performedAt', 'desc')
    .get();
  const documents: FirebaseWorkoutSessionDocument[] = [];

  snapshot.docs.forEach(documentSnapshot => {
    const parsed = workoutSessionDocumentSchema.safeParse({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    });

    if (parsed.success) {
      documents.push(parsed.data);
    }
  });

  return documents;
};

export const syncFirebaseUserData = async (user: SessionUser) => {
  if (user.provider === 'dev-local') {
    return;
  }

  const userProfile = buildFirebaseUserProfileDocument(user);
  await getUserDoc(user.id).set(userProfile, {merge: true});
  await maybeSeedRemoteFromLocal(user.id);
  await flushSyncQueue(user.id);

  const [workouts, sessions] = await Promise.all([
    loadRemoteWorkouts(user.id),
    loadRemoteSessions(user.id),
  ]);

  await replaceLocalDataFromRemote({
    userId: user.id,
    workouts,
    sessions,
  });
};
