import type {User} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

import type {WorkoutDocument, WorkoutSessionDocument} from '../types';
import {firebaseDb} from './firebase';

const getWorkoutCollection = (userId: string) =>
  collection(firebaseDb, 'users', userId, 'workouts');

const getSessionCollection = (userId: string) =>
  collection(firebaseDb, 'users', userId, 'sessions');

export const watchWorkouts = (
  userId: string,
  listener: (workouts: WorkoutDocument[]) => void,
) =>
  onSnapshot(
    query(getWorkoutCollection(userId), orderBy('updatedAt', 'desc')),
    snapshot => {
      listener(
        snapshot.docs.map(documentSnapshot => ({
          id: documentSnapshot.id,
          ...(documentSnapshot.data() as Omit<WorkoutDocument, 'id'>),
        })),
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
        snapshot.docs.map(documentSnapshot => ({
          id: documentSnapshot.id,
          ...(documentSnapshot.data() as Omit<WorkoutSessionDocument, 'id'>),
        })),
      );
    },
  );

export const saveWorkoutFromPanel = async (
  user: User,
  workout: WorkoutDocument,
) => {
  await setDoc(doc(firebaseDb, 'users', user.uid, 'workouts', workout.id), workout, {
    merge: true,
  });
};

export const deleteWorkoutFromPanel = async (userId: string, workoutId: string) => {
  await deleteDoc(doc(firebaseDb, 'users', userId, 'workouts', workoutId));
};
