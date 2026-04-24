import type {User} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import type {
  WorkoutDocument,
  WorkoutSessionDocument,
} from '../types';
import {
  parseWorkoutDocument,
  parseWorkoutSessionDocument,
  workoutDocumentSchema,
  workoutSessionDocumentSchema,
} from './documentSchemas';
import {firebaseDb} from './firebase';

const getWorkoutCollection = (userId: string) =>
  collection(firebaseDb, 'users', userId, 'workouts');

const getSessionCollection = (userId: string) =>
  collection(firebaseDb, 'users', userId, 'sessions');
const MAX_IMPORTED_WORKOUTS = 100;
const MAX_IMPORTED_EXERCISES = 1200;

export const watchWorkouts = (
  userId: string,
  listener: (workouts: WorkoutDocument[]) => void,
) =>
  onSnapshot(
    query(getWorkoutCollection(userId), orderBy('updatedAt', 'desc')),
    snapshot => {
      listener(
        snapshot.docs
          .map(documentSnapshot =>
            workoutDocumentSchema.safeParse({
              id: documentSnapshot.id,
              ...(documentSnapshot.data() as Omit<WorkoutDocument, 'id'>),
            }),
          )
          .filter(result => result.success)
          .map(result => result.data),
      );
    },
  );

export const watchRecentSessions = (
  userId: string,
  listener: (sessions: WorkoutSessionDocument[]) => void,
) =>
  onSnapshot(
    query(getSessionCollection(userId), orderBy('performedAt', 'desc')),
    snapshot => {
      listener(
        snapshot.docs
          .map(documentSnapshot =>
            workoutSessionDocumentSchema.safeParse({
              id: documentSnapshot.id,
              ...(documentSnapshot.data() as Omit<WorkoutSessionDocument, 'id'>),
            }),
          )
          .filter(result => result.success)
          .map(result => result.data),
      );
    },
  );

export const saveWorkoutFromPanel = async (
  user: User,
  workout: WorkoutDocument,
) => {
  const validatedWorkout = parseWorkoutDocument({
    ...workout,
    userId: user.uid,
  });

  await setDoc(
    doc(firebaseDb, 'users', user.uid, 'workouts', validatedWorkout.id),
    validatedWorkout,
  );
};

export const saveTrainingSessionFromPanel = async (
  userId: string,
  session: WorkoutSessionDocument,
) => {
  const validatedSession = parseWorkoutSessionDocument({
    ...session,
    userId,
  });

  await setDoc(
    doc(firebaseDb, 'users', userId, 'sessions', validatedSession.id),
    validatedSession,
  );
};

export const deleteWorkoutFromPanel = async (userId: string, workoutId: string) => {
  const batch = writeBatch(firebaseDb);
  batch.delete(doc(firebaseDb, 'users', userId, 'workouts', workoutId));
  await batch.commit();
};

export const deleteSessionFromPanel = async (userId: string, sessionId: string) => {
  await deleteDoc(doc(firebaseDb, 'users', userId, 'sessions', sessionId));
};

export const listAllWorkoutsForUser = async (userId: string) => {
  const snapshot = await getDocs(query(getWorkoutCollection(userId), orderBy('updatedAt', 'desc')));

  return snapshot.docs
    .map(documentSnapshot =>
      workoutDocumentSchema.safeParse({
        id: documentSnapshot.id,
        ...(documentSnapshot.data() as Omit<WorkoutDocument, 'id'>),
      }),
    )
    .filter(result => result.success)
    .map(result => result.data);
};

export const listAllSessionsForUser = async (userId: string) => {
  const snapshot = await getDocs(query(getSessionCollection(userId), orderBy('performedAt', 'desc')));

  return snapshot.docs
    .map(documentSnapshot =>
      workoutSessionDocumentSchema.safeParse({
        id: documentSnapshot.id,
        ...(documentSnapshot.data() as Omit<WorkoutSessionDocument, 'id'>),
      }),
    )
    .filter(result => result.success)
    .map(result => result.data);
};

export const refreshWorkspaceData = async (userId: string) => {
  const [workouts, sessions] = await Promise.all([
    listAllWorkoutsForUser(userId),
    listAllSessionsForUser(userId),
  ]);

  return {workouts, sessions};
};

const commitInChunks = async (
  userId: string,
  workouts: WorkoutDocument[],
  sessions: WorkoutSessionDocument[],
) => {
  const [existingWorkouts, existingSessions] = await Promise.all([
    getDocs(getWorkoutCollection(userId)),
    getDocs(getSessionCollection(userId)),
  ]);

  let batch = writeBatch(firebaseDb);
  let operationCount = 0;

  const flushBatch = async () => {
    if (operationCount === 0) {
      return;
    }

    await batch.commit();
    batch = writeBatch(firebaseDb);
    operationCount = 0;
  };

  const queueDelete = async (path: 'workouts' | 'sessions', id: string) => {
    batch.delete(doc(firebaseDb, 'users', userId, path, id));
    operationCount += 1;

    if (operationCount >= 400) {
      await flushBatch();
    }
  };

  const queueSet = async (
    path: 'workouts' | 'sessions',
    id: string,
    payload: WorkoutDocument | WorkoutSessionDocument,
  ) => {
    batch.set(doc(firebaseDb, 'users', userId, path, id), payload);
    operationCount += 1;

    if (operationCount >= 400) {
      await flushBatch();
    }
  };

  for (const documentSnapshot of existingWorkouts.docs) {
    await queueDelete('workouts', documentSnapshot.id);
  }

  for (const documentSnapshot of existingSessions.docs) {
    await queueDelete('sessions', documentSnapshot.id);
  }

  for (const workout of workouts) {
    await queueSet('workouts', workout.id, workout);
  }

  for (const session of sessions) {
    await queueSet('sessions', session.id, session);
  }

  await flushBatch();
};

export const replaceAllWorkoutsAndSessions = async (
  userId: string,
  workouts: WorkoutDocument[],
  sessions: WorkoutSessionDocument[],
) => {
  const validatedWorkouts = workouts.map(workout =>
    parseWorkoutDocument({...workout, userId}),
  );
  const validatedSessions = sessions.map(session =>
    parseWorkoutSessionDocument({...session, userId}),
  );

  await commitInChunks(userId, validatedWorkouts, validatedSessions);
};

export const importWorkoutsForUser = async (
  user: User,
  workouts: WorkoutDocument[],
) => {
  const validatedWorkouts = workouts.map(workout =>
    parseWorkoutDocument({...workout, userId: user.uid}),
  );
  const totalExercises = validatedWorkouts.reduce(
    (sum, workout) => sum + workout.exercises.length,
    0,
  );

  if (validatedWorkouts.length > MAX_IMPORTED_WORKOUTS) {
    throw new Error(
      `O arquivo excede o limite de ${MAX_IMPORTED_WORKOUTS} treinos por importacao.`,
    );
  }

  if (totalExercises > MAX_IMPORTED_EXERCISES) {
    throw new Error(
      `O arquivo excede o limite de ${MAX_IMPORTED_EXERCISES} exercicios por importacao.`,
    );
  }

  let batch = writeBatch(firebaseDb);
  let operationCount = 0;

  const flushBatch = async () => {
    if (operationCount === 0) {
      return;
    }

    await batch.commit();
    batch = writeBatch(firebaseDb);
    operationCount = 0;
  };

  for (const workout of validatedWorkouts) {
    batch.set(doc(firebaseDb, 'users', user.uid, 'workouts', workout.id), workout);
    operationCount += 1;

    if (operationCount >= 400) {
      await flushBatch();
    }
  }

  await flushBatch();
};

export const listRecentSessionsForUser = async (userId: string, amount = 5) => {
  const snapshot = await getDocs(
    query(getSessionCollection(userId), orderBy('performedAt', 'desc'), limit(amount)),
  );

  return snapshot.docs
    .map(documentSnapshot =>
      workoutSessionDocumentSchema.safeParse({
        id: documentSnapshot.id,
        ...(documentSnapshot.data() as Omit<WorkoutSessionDocument, 'id'>),
      }),
    )
    .filter(result => result.success)
    .map(result => result.data);
};
