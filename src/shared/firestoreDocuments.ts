import {z} from 'zod';

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
  loadLabel?: string;
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
  finishedAt?: string | null;
  createdAt: string;
  exercises: WorkoutSessionExerciseDocument[];
  totalSets: number;
  totalVolume: number;
  topLoad: number;
};

export type FirebaseWorkoutExerciseDocument = WorkoutExerciseInput;
export type FirebaseWorkoutDocument = WorkoutDocument;
export type FirebaseSessionSetDocument = WorkoutSessionSetDocument;
export type FirebaseSessionExerciseDocument = WorkoutSessionExerciseDocument;
export type FirebaseWorkoutSessionDocument = WorkoutSessionDocument;
export type FirebaseUserProfileDocument = UserProfileDocument;

export const isoDateSchema = z
  .string()
  .trim()
  .min(10)
  .max(40)
  .refine(value => !Number.isNaN(Date.parse(value)), 'Data ISO inválida.');

export const idSchema = z.string().trim().min(1).max(120);

export const workoutExerciseInputSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(2).max(60),
  muscleGroup: z.string().trim().min(1).max(40),
  baseLoad: z.string().trim().max(60),
  targetReps: z.string().trim().min(1).max(20),
  note: z.string().trim().max(220),
  orderIndex: z.number().int().min(0).max(64),
});

export const workoutSessionSetSchema = z.object({
  load: z.number().finite().min(0).max(10000),
  loadLabel: z.string().trim().max(8).optional(),
  reps: z.number().int().min(0).max(1000),
  note: z.string().trim().max(220),
});

export const workoutSessionExerciseSchema = z.object({
  workoutExerciseId: z.string().trim().max(120),
  exerciseName: z.string().trim().min(1).max(80),
  muscleGroup: z.string().trim().min(1).max(40),
  sets: z.array(workoutSessionSetSchema).min(1).max(20),
});

export const workoutDocumentSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().trim().min(2).max(60),
  focus: z.string().trim().min(1).max(30),
  notes: z.string().trim().max(260),
  accentColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
  scheduledDay: z.string().trim().max(20).nullable(),
  exercises: z.array(workoutExerciseInputSchema).min(1).max(12),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const workoutSessionDocumentSchema = z.object({
  id: idSchema,
  userId: idSchema,
  workoutId: z.string().trim().max(120).nullable(),
  workoutName: z.string().trim().min(2).max(80),
  focus: z.string().trim().min(1).max(30),
  overallNotes: z.string().trim().max(1200),
  performedAt: isoDateSchema,
  finishedAt: isoDateSchema.nullable().optional(),
  createdAt: isoDateSchema,
  exercises: z.array(workoutSessionExerciseSchema).min(1).max(24),
  totalSets: z.number().int().min(1).max(400),
  totalVolume: z.number().finite().min(0).max(5000000),
  topLoad: z.number().finite().min(0).max(10000),
});

export const parseWorkoutDocument = (value: unknown): WorkoutDocument =>
  workoutDocumentSchema.parse(value);

export const parseWorkoutSessionDocument = (
  value: unknown,
): WorkoutSessionDocument => workoutSessionDocumentSchema.parse(value);
