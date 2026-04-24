import {z} from 'zod';

import type {WorkoutDocument, WorkoutSessionDocument} from '../types';

const isoDateSchema = z
  .string()
  .trim()
  .min(10)
  .max(40)
  .refine(value => !Number.isNaN(Date.parse(value)), 'Data ISO invalida.');

const idSchema = z.string().trim().min(1).max(120);
const shortTextSchema = z.string().trim().min(1).max(80);

const workoutExerciseInputSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(2).max(60),
  muscleGroup: z.string().trim().min(1).max(40),
  baseLoad: z.string().trim().max(60),
  targetReps: z.string().trim().min(1).max(20),
  note: z.string().trim().max(220),
  orderIndex: z.number().int().min(0).max(64),
});

const workoutSessionSetSchema = z.object({
  load: z.number().finite().min(0).max(10000),
  reps: z.number().int().min(0).max(1000),
  note: z.string().trim().max(220),
});

const workoutSessionExerciseSchema = z.object({
  workoutExerciseId: z.string().trim().max(120),
  exerciseName: z.string().trim().min(1).max(80),
  muscleGroup: z.string().trim().min(1).max(40),
  sets: z.array(workoutSessionSetSchema).min(1).max(20),
});

export const workoutDocumentSchema = z.object({
  id: idSchema,
  userId: idSchema,
  name: z.string().trim().min(2).max(60),
  focus: shortTextSchema.max(30),
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
  createdAt: isoDateSchema,
  exercises: z.array(workoutSessionExerciseSchema).min(1).max(24),
  totalSets: z.number().int().min(1).max(400),
  totalVolume: z.number().finite().min(0).max(5000000),
  topLoad: z.number().finite().min(0).max(10000),
});

export const parseWorkoutDocument = (value: unknown): WorkoutDocument =>
  workoutDocumentSchema.parse(value);

export const parseWorkoutSessionDocument = (value: unknown): WorkoutSessionDocument =>
  workoutSessionDocumentSchema.parse(value);

