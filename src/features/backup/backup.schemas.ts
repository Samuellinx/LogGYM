import {z} from 'zod';

const isoDateSchema = z
  .string()
  .trim()
  .min(10)
  .max(40)
  .refine(value => !Number.isNaN(Date.parse(value)), 'Data ISO inválida.');

const idSchema = z.string().trim().min(1).max(120);
const nullableShortTextSchema = z.string().trim().max(80).nullable();

const backupWorkoutSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(2).max(60),
  focus: z.string().trim().min(2).max(30),
  notes: z.string().trim().max(260),
  accentColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
  scheduledDay: z.string().trim().max(20).nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  archivedAt: isoDateSchema.nullable(),
});

const backupWorkoutExerciseSchema = z.object({
  id: idSchema,
  workoutId: idSchema,
  name: z.string().trim().min(2).max(60),
  muscleGroup: z.string().trim().min(2).max(40),
  baseLoad: z.string().trim().max(60).default(''),
  targetReps: z.string().trim().min(1).max(20),
  note: z.string().trim().max(220),
  orderIndex: z.number().int().min(0).max(999),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const backupWorkoutSessionSchema = z.object({
  id: idSchema,
  workoutId: nullableShortTextSchema,
  workoutName: z.string().trim().min(2).max(80),
  focus: z.string().trim().min(2).max(30),
  performedAt: isoDateSchema,
  finishedAt: isoDateSchema.optional(),
  overallNotes: z.string().trim().max(1000),
  durationMinutes: z.number().int().min(0).max(1440),
  createdAt: isoDateSchema,
});

const backupSessionSetSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  templateExerciseId: z.string().trim().max(120).nullable(),
  exerciseName: z.string().trim().min(2).max(80),
  muscleGroup: z.string().trim().min(2).max(40),
  setIndex: z.number().int().min(0).max(1000),
  load: z.number().min(0).max(10000),
  reps: z.number().int().min(0).max(1000),
  note: z.string().trim().max(220),
  performedAt: isoDateSchema,
  createdAt: isoDateSchema,
});

export const backupFileSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: isoDateSchema,
  user: z.object({
    email: z.string().trim().email().max(254),
    name: z.string().trim().min(1).max(120),
    provider: z.enum(['google', 'dev-local', 'password']),
  }),
  stats: z.object({
    workouts: z.number().int().min(0).max(500),
    workoutExercises: z.number().int().min(0).max(5000),
    workoutSessions: z.number().int().min(0).max(5000),
    sessionSets: z.number().int().min(0).max(50000),
  }),
  data: z.object({
    workouts: z.array(backupWorkoutSchema).max(500),
    workoutExercises: z.array(backupWorkoutExerciseSchema).max(5000),
    workoutSessions: z.array(backupWorkoutSessionSchema).max(5000),
    sessionSets: z.array(backupSessionSetSchema).max(50000),
  }),
});

export type BackupFilePayload = z.infer<typeof backupFileSchema>;
