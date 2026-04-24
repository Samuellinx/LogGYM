import type {User} from 'firebase/auth';
import {z} from 'zod';

import type {
  AuthProvider,
  WorkoutDocument,
  WorkoutSessionDocument,
  WorkoutSessionExerciseDocument,
} from '../types';
import {
  listAllSessionsForUser,
  listAllWorkoutsForUser,
  replaceAllWorkoutsAndSessions,
} from './workouts';

const isoDateSchema = z
  .string()
  .trim()
  .min(10)
  .max(40)
  .refine(value => !Number.isNaN(Date.parse(value)), 'Data ISO invalida.');

const idSchema = z.string().trim().min(1).max(120);
const nullableShortTextSchema = z.string().trim().max(80).nullable();
const MAX_BACKUP_SIZE_BYTES = 5 * 1024 * 1024;
const BACKUP_FILE_EXTENSION = /\.json$/iu;
const BACKUP_MIME_TYPES = new Set(['application/json', 'text/json', '']);

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
  muscleGroup: z.string().trim().min(1).max(40),
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
  focus: z.string().trim().min(1).max(30),
  performedAt: isoDateSchema,
  overallNotes: z.string().trim().max(1000),
  durationMinutes: z.number().int().min(0).max(1440),
  createdAt: isoDateSchema,
});

const backupSessionSetSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  templateExerciseId: z.string().trim().max(120).nullable(),
  exerciseName: z.string().trim().min(1).max(80),
  muscleGroup: z.string().trim().min(1).max(40),
  setIndex: z.number().int().min(0).max(1000),
  load: z.number().min(0).max(10000),
  reps: z.number().int().min(0).max(1000),
  note: z.string().trim().max(220),
  performedAt: isoDateSchema,
  createdAt: isoDateSchema,
});

const backupFileSchema = z.object({
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

type BackupFilePayload = z.infer<typeof backupFileSchema>;

export interface BackupExportResult {
  fileName: string;
  workouts: number;
  workoutExercises: number;
  workoutSessions: number;
  sessionSets: number;
}

export interface BackupImportResult {
  workouts: number;
  workoutExercises: number;
  workoutSessions: number;
  sessionSets: number;
}

const sanitizeEmailForFile = (email: string) =>
  email.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const getBackupFileName = (email: string) => {
  const safeEmail = sanitizeEmailForFile(email) || 'athlete';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  return `loggym-backup-${safeEmail}-${stamp}.json`;
};

const triggerDownload = (fileName: string, contents: string) => {
  const blob = new Blob([contents], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
};

export const getUserAuthProvider = (user: User): AuthProvider => {
  if (user.providerData.some(item => item.providerId === 'google.com')) {
    return 'google';
  }

  if (user.providerData.some(item => item.providerId === 'password')) {
    return 'password';
  }

  return 'password';
};

const getUserDisplayName = (user: User) =>
  user.displayName?.trim() || user.email?.split('@')[0]?.trim() || 'Atleta';

const ensureUniqueIds = (ids: string[], message: string) => {
  if (new Set(ids).size !== ids.length) {
    throw new Error(message);
  }
};

const validateBackupRelations = (payload: BackupFilePayload) => {
  ensureUniqueIds(
    payload.data.workouts.map(item => item.id),
    'O backup esta inconsistente: IDs de treinos duplicados.',
  );
  ensureUniqueIds(
    payload.data.workoutExercises.map(item => item.id),
    'O backup esta inconsistente: IDs de exercicios duplicados.',
  );
  ensureUniqueIds(
    payload.data.workoutSessions.map(item => item.id),
    'O backup esta inconsistente: IDs de sessoes duplicados.',
  );
  ensureUniqueIds(
    payload.data.sessionSets.map(item => item.id),
    'O backup esta inconsistente: IDs de series duplicados.',
  );

  const workoutIds = new Set(payload.data.workouts.map(item => item.id));
  const workoutExerciseIds = new Set(payload.data.workoutExercises.map(item => item.id));
  const sessionIds = new Set(payload.data.workoutSessions.map(item => item.id));

  if (payload.stats.workouts !== payload.data.workouts.length) {
    throw new Error('O backup esta inconsistente: total de treinos invalido.');
  }

  if (payload.stats.workoutExercises !== payload.data.workoutExercises.length) {
    throw new Error('O backup esta inconsistente: total de exercicios invalido.');
  }

  if (payload.stats.workoutSessions !== payload.data.workoutSessions.length) {
    throw new Error('O backup esta inconsistente: total de sessoes invalido.');
  }

  if (payload.stats.sessionSets !== payload.data.sessionSets.length) {
    throw new Error('O backup esta inconsistente: total de series invalido.');
  }

  for (const exercise of payload.data.workoutExercises) {
    if (!workoutIds.has(exercise.workoutId)) {
      throw new Error('O backup esta inconsistente: exercicio sem treino pai valido.');
    }
  }

  for (const session of payload.data.workoutSessions) {
    if (session.workoutId && !workoutIds.has(session.workoutId)) {
      throw new Error('O backup esta inconsistente: sessao aponta para um treino inexistente.');
    }
  }

  for (const set of payload.data.sessionSets) {
    if (!sessionIds.has(set.sessionId)) {
      throw new Error('O backup esta inconsistente: serie sem sessao pai valida.');
    }

    if (set.templateExerciseId && !workoutExerciseIds.has(set.templateExerciseId)) {
      throw new Error(
        'O backup esta inconsistente: serie aponta para um exercicio de treino inexistente.',
      );
    }
  }
};

const buildBackupPayload = async (user: User): Promise<BackupFilePayload> => {
  const [workouts, sessions] = await Promise.all([
    listAllWorkoutsForUser(user.uid),
    listAllSessionsForUser(user.uid),
  ]);

  const workoutExercises = workouts.flatMap(workout =>
    workout.exercises.map(exercise => ({
      id: exercise.id,
      workoutId: workout.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      baseLoad: exercise.baseLoad,
      targetReps: exercise.targetReps,
      note: exercise.note,
      orderIndex: exercise.orderIndex,
      createdAt: workout.createdAt,
      updatedAt: workout.updatedAt,
    })),
  );

  const workoutSessions = sessions.map(session => ({
    id: session.id,
    workoutId: session.workoutId,
    workoutName: session.workoutName,
    focus: session.focus,
    performedAt: session.performedAt,
    overallNotes: session.overallNotes,
    durationMinutes: 0,
    createdAt: session.createdAt,
  }));

  const sessionSets = sessions.flatMap(session =>
    session.exercises.flatMap((exercise, exerciseIndex) =>
      exercise.sets.map((set, setIndex) => ({
        id: `${session.id}-${exerciseIndex}-${setIndex}`,
        sessionId: session.id,
        templateExerciseId: exercise.workoutExerciseId || null,
        exerciseName: exercise.exerciseName,
        muscleGroup: exercise.muscleGroup,
        setIndex,
        load: set.load,
        reps: set.reps,
        note: set.note,
        performedAt: session.performedAt,
        createdAt: session.createdAt,
      })),
    ),
  );

  return backupFileSchema.parse({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    user: {
      email: user.email ?? '',
      name: getUserDisplayName(user),
      provider: getUserAuthProvider(user),
    },
    stats: {
      workouts: workouts.length,
      workoutExercises: workoutExercises.length,
      workoutSessions: workoutSessions.length,
      sessionSets: sessionSets.length,
    },
    data: {
      workouts: workouts.map(workout => ({
        id: workout.id,
        name: workout.name,
        focus: workout.focus,
        notes: workout.notes,
        accentColor: workout.accentColor,
        scheduledDay: workout.scheduledDay,
        createdAt: workout.createdAt,
        updatedAt: workout.updatedAt,
        archivedAt: null,
      })),
      workoutExercises,
      workoutSessions,
      sessionSets,
    },
  });
};

const groupExercisesForSession = (
  sessionId: string,
  sets: BackupFilePayload['data']['sessionSets'],
): WorkoutSessionExerciseDocument[] => {
  const grouped = new Map<string, WorkoutSessionExerciseDocument>();

  for (const set of sets.filter(item => item.sessionId === sessionId)) {
    const key = `${set.templateExerciseId ?? 'custom'}::${set.exerciseName}::${set.muscleGroup}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.sets.push({
        load: set.load,
        reps: set.reps,
        note: set.note,
      });
      continue;
    }

    grouped.set(key, {
      workoutExerciseId: set.templateExerciseId ?? '',
      exerciseName: set.exerciseName,
      muscleGroup: set.muscleGroup,
      sets: [
        {
          load: set.load,
          reps: set.reps,
          note: set.note,
        },
      ],
    });
  }

  for (const exercise of grouped.values()) {
    exercise.sets = exercise.sets.map(item => item);
  }

  return Array.from(grouped.values());
};

const buildWorkoutDocumentsFromBackup = (
  userId: string,
  payload: BackupFilePayload,
): WorkoutDocument[] =>
  payload.data.workouts.map(workout => ({
    id: workout.id,
    userId,
    name: workout.name,
    focus: workout.focus,
    notes: workout.notes,
    accentColor: workout.accentColor,
    scheduledDay: workout.scheduledDay,
    createdAt: workout.createdAt,
    updatedAt: workout.updatedAt,
    exercises: payload.data.workoutExercises
      .filter(exercise => exercise.workoutId === workout.id)
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        baseLoad: exercise.baseLoad,
        targetReps: exercise.targetReps,
        note: exercise.note,
        orderIndex: exercise.orderIndex,
      })),
  }));

const buildSessionDocumentsFromBackup = (
  userId: string,
  payload: BackupFilePayload,
): WorkoutSessionDocument[] =>
  payload.data.workoutSessions.map(session => {
    const exercises = groupExercisesForSession(session.id, payload.data.sessionSets);
    const flattenedSets = exercises.flatMap(exercise => exercise.sets);

    return {
      id: session.id,
      userId,
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      focus: session.focus,
      overallNotes: session.overallNotes,
      performedAt: session.performedAt,
      createdAt: session.createdAt,
      exercises,
      totalSets: flattenedSets.length,
      totalVolume: flattenedSets.reduce((sum, item) => sum + item.load * item.reps, 0),
      topLoad: flattenedSets.reduce((max, item) => Math.max(max, item.load), 0),
    };
  });

export const exportBackupForCurrentUser = async (
  user: User,
): Promise<BackupExportResult> => {
  if (!user.email) {
    throw new Error('Sua conta precisa ter um e-mail valido para exportar a copia.');
  }

  const payload = await buildBackupPayload(user);
  const fileName = getBackupFileName(user.email);

  triggerDownload(fileName, `${JSON.stringify(payload, null, 2)}\n`);

  return {
    fileName,
    workouts: payload.stats.workouts,
    workoutExercises: payload.stats.workoutExercises,
    workoutSessions: payload.stats.workoutSessions,
    sessionSets: payload.stats.sessionSets,
  };
};

export const importBackupFileForCurrentUser = async (
  user: User,
  file: File,
): Promise<BackupImportResult> => {
  if (!user.email) {
    throw new Error('Sua conta precisa ter um e-mail valido para restaurar a copia.');
  }

  if (file.size > MAX_BACKUP_SIZE_BYTES) {
    throw new Error('O backup excede o limite de 5 MB e foi bloqueado por seguranca.');
  }

  if (!BACKUP_FILE_EXTENSION.test(file.name) || !BACKUP_MIME_TYPES.has(file.type)) {
    throw new Error('Selecione um arquivo JSON de backup valido do LogGYM.');
  }

  const contents = await file.text();
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(contents) as unknown;
  } catch {
    throw new Error('O arquivo selecionado nao e um backup valido do LogGYM.');
  }

  const payload = backupFileSchema.parse(parsedJson);
  validateBackupRelations(payload);

  if (
    payload.user.provider !== getUserAuthProvider(user) ||
    payload.user.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    throw new Error(
      'Este backup pertence a outra conta. O LogGYM so permite restaurar backup da mesma conta autenticada.',
    );
  }

  const workouts = buildWorkoutDocumentsFromBackup(user.uid, payload);
  const sessions = buildSessionDocumentsFromBackup(user.uid, payload);

  await replaceAllWorkoutsAndSessions(user.uid, workouts, sessions);

  return {
    workouts: payload.stats.workouts,
    workoutExercises: payload.stats.workoutExercises,
    workoutSessions: payload.stats.workoutSessions,
    sessionSets: payload.stats.sessionSets,
  };
};
