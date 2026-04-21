import {errorCodes, isErrorWithCode, keepLocalCopy, pick, saveDocuments} from '@react-native-documents/picker';
import {Dirs, FileSystem} from 'react-native-file-access';

import {getDatabase} from '@/storage/database';
import type {SessionUser} from '@/types/domain';

import {backupFileSchema, type BackupFilePayload} from './backup.schemas';

const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_DIR = `${Dirs.CacheDir}/loggym-backups`;
const BACKUP_MIME_TYPE = 'application/json';
const MAX_BACKUP_SIZE_BYTES = 5 * 1024 * 1024;

type BackupWorkoutRow = {
  id: string;
  name: string;
  focus: string;
  notes: string;
  accent_color: string;
  scheduled_day: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type BackupWorkoutExerciseRow = {
  id: string;
  workout_id: string;
  name: string;
  muscle_group: string;
  target_reps: string;
  note: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

type BackupWorkoutSessionRow = {
  id: string;
  workout_id: string | null;
  workout_name: string;
  focus: string;
  performed_at: string;
  overall_notes: string;
  duration_minutes: number;
  created_at: string;
};

type BackupSessionSetRow = {
  id: string;
  session_id: string;
  template_exercise_id: string | null;
  exercise_name: string;
  muscle_group: string;
  set_index: number;
  load: number;
  reps: number;
  note: string;
  performed_at: string;
  created_at: string;
};

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

const ensureBackupDirectory = async () => {
  const exists = await FileSystem.exists(BACKUP_DIR);

  if (!exists) {
    await FileSystem.mkdir(BACKUP_DIR);
  }
};

const sanitizeEmailForFile = (email: string) =>
  email.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const getBackupFileName = (user: SessionUser) => {
  const safeEmail = sanitizeEmailForFile(user.email) || 'athlete';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  return `loggym-backup-${safeEmail}-${stamp}.json`;
};

const toFileUri = (path: string) => `file://${path}`;

const decodeFileUriToPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

const isUserCancellation = (error: unknown) =>
  isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;

const validateBackupRelations = (payload: BackupFilePayload) => {
  const workoutIds = new Set(payload.data.workouts.map(item => item.id));
  const sessionIds = new Set(payload.data.workoutSessions.map(item => item.id));

  for (const exercise of payload.data.workoutExercises) {
    if (!workoutIds.has(exercise.workoutId)) {
      throw new Error('O backup esta inconsistente: exercicio sem treino pai valido.');
    }
  }

  for (const set of payload.data.sessionSets) {
    if (!sessionIds.has(set.sessionId)) {
      throw new Error('O backup esta inconsistente: serie sem sessao pai valida.');
    }
  }
};

const buildBackupPayload = async (user: SessionUser): Promise<BackupFilePayload> => {
  const db = getDatabase();

  const [workouts, workoutExercises, workoutSessions, sessionSets] = await Promise.all([
    db.executeAsync<BackupWorkoutRow>(
      `SELECT
        id,
        name,
        focus,
        notes,
        accent_color,
        scheduled_day,
        created_at,
        updated_at,
        archived_at
      FROM workouts
      WHERE user_id = ?
      ORDER BY updated_at DESC;`,
      [user.id],
    ),
    db.executeAsync<BackupWorkoutExerciseRow>(
      `SELECT
        we.id,
        we.workout_id,
        we.name,
        we.muscle_group,
        we.target_reps,
        we.note,
        we.order_index,
        we.created_at,
        we.updated_at
      FROM workout_exercises we
      INNER JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = ?
      ORDER BY we.workout_id ASC, we.order_index ASC;`,
      [user.id],
    ),
    db.executeAsync<BackupWorkoutSessionRow>(
      `SELECT
        id,
        workout_id,
        workout_name,
        focus,
        performed_at,
        overall_notes,
        duration_minutes,
        created_at
      FROM workout_sessions
      WHERE user_id = ?
      ORDER BY performed_at DESC;`,
      [user.id],
    ),
    db.executeAsync<BackupSessionSetRow>(
      `SELECT
        ss.id,
        ss.session_id,
        ss.template_exercise_id,
        ss.exercise_name,
        ss.muscle_group,
        ss.set_index,
        ss.load,
        ss.reps,
        ss.note,
        ss.performed_at,
        ss.created_at
      FROM session_sets ss
      INNER JOIN workout_sessions ws ON ws.id = ss.session_id
      WHERE ws.user_id = ?
      ORDER BY ss.performed_at DESC, ss.set_index ASC;`,
      [user.id],
    ),
  ]);

  return backupFileSchema.parse({
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    user: {
      email: user.email,
      name: user.name,
      provider: user.provider,
    },
    stats: {
      workouts: workouts.rows.length,
      workoutExercises: workoutExercises.rows.length,
      workoutSessions: workoutSessions.rows.length,
      sessionSets: sessionSets.rows.length,
    },
    data: {
      workouts: workouts.rows._array.map(item => ({
        id: item.id,
        name: item.name,
        focus: item.focus,
        notes: item.notes,
        accentColor: item.accent_color,
        scheduledDay: item.scheduled_day,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        archivedAt: item.archived_at,
      })),
      workoutExercises: workoutExercises.rows._array.map(item => ({
        id: item.id,
        workoutId: item.workout_id,
        name: item.name,
        muscleGroup: item.muscle_group,
        targetReps: item.target_reps,
        note: item.note,
        orderIndex: Number(item.order_index),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      workoutSessions: workoutSessions.rows._array.map(item => ({
        id: item.id,
        workoutId: item.workout_id,
        workoutName: item.workout_name,
        focus: item.focus,
        performedAt: item.performed_at,
        overallNotes: item.overall_notes,
        durationMinutes: Number(item.duration_minutes),
        createdAt: item.created_at,
      })),
      sessionSets: sessionSets.rows._array.map(item => ({
        id: item.id,
        sessionId: item.session_id,
        templateExerciseId: item.template_exercise_id,
        exerciseName: item.exercise_name,
        muscleGroup: item.muscle_group,
        setIndex: Number(item.set_index),
        load: Number(item.load),
        reps: Number(item.reps),
        note: item.note,
        performedAt: item.performed_at,
        createdAt: item.created_at,
      })),
    },
  });
};

const readBackupPayloadFromPicker = async () => {
  const [pickedFile] = await pick({
    mode: 'open',
    requestLongTermAccess: false,
    type: [BACKUP_MIME_TYPE],
    allowMultiSelection: false,
  });

  if (!pickedFile.hasRequestedType) {
    throw new Error('Selecione um arquivo JSON valido do LogGYM.');
  }

  if (pickedFile.size && pickedFile.size > MAX_BACKUP_SIZE_BYTES) {
    throw new Error('O backup excede o limite de 5 MB e foi bloqueado por seguranca.');
  }

  const localCopyResponse = await keepLocalCopy({
    destination: 'cachesDirectory',
    files: [
      {
        uri: pickedFile.uri,
        fileName: pickedFile.name ?? 'loggym-backup-import.json',
      },
    ],
  });

  const localCopy = localCopyResponse[0];
  if (localCopy.status !== 'success') {
    throw new Error('Nao foi possivel preparar o arquivo de backup para importacao.');
  }

  const localPath = decodeFileUriToPath(localCopy.localUri);

  try {
    const contents = await FileSystem.readFile(localPath);
    const parsedJson = JSON.parse(contents) as unknown;
    const payload = backupFileSchema.parse(parsedJson);

    validateBackupRelations(payload);

    return payload;
  } finally {
    if (await FileSystem.exists(localPath)) {
      await FileSystem.unlink(localPath);
    }
  }
};

export const exportBackupForCurrentUser = async (
  user: SessionUser,
): Promise<BackupExportResult | null> => {
  const payload = await buildBackupPayload(user);
  const fileName = getBackupFileName(user);

  await ensureBackupDirectory();

  const tempFilePath = `${BACKUP_DIR}/${fileName}`;

  try {
    await FileSystem.writeFile(
      tempFilePath,
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );

    const [savedDocument] = await saveDocuments({
      sourceUris: [toFileUri(tempFilePath)],
      mimeType: BACKUP_MIME_TYPE,
      fileName,
    });

    if (savedDocument.error) {
      throw new Error(`Falha ao salvar o backup: ${savedDocument.error}`);
    }

    return {
      fileName: savedDocument.name ?? fileName,
      workouts: payload.stats.workouts,
      workoutExercises: payload.stats.workoutExercises,
      workoutSessions: payload.stats.workoutSessions,
      sessionSets: payload.stats.sessionSets,
    };
  } catch (error) {
    if (isUserCancellation(error)) {
      return null;
    }

    throw error;
  } finally {
    if (await FileSystem.exists(tempFilePath)) {
      await FileSystem.unlink(tempFilePath);
    }
  }
};

export const importBackupForCurrentUser = async (
  user: SessionUser,
): Promise<BackupImportResult | null> => {
  try {
    const payload = await readBackupPayloadFromPicker();

    if (
      payload.user.provider !== user.provider ||
      payload.user.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new Error(
        'Este backup pertence a outra conta. O LogGYM so permite restaurar backup da mesma conta autenticada.',
      );
    }

    const db = getDatabase();

    await db.transaction(async tx => {
      await tx.executeAsync('DELETE FROM workout_sessions WHERE user_id = ?;', [user.id]);
      await tx.executeAsync('DELETE FROM workouts WHERE user_id = ?;', [user.id]);

      for (const workout of payload.data.workouts) {
        await tx.executeAsync(
          `INSERT INTO workouts (
            id, user_id, name, focus, notes, accent_color, scheduled_day, created_at, updated_at, archived_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            workout.id,
            user.id,
            workout.name,
            workout.focus,
            workout.notes,
            workout.accentColor,
            workout.scheduledDay,
            workout.createdAt,
            workout.updatedAt,
            workout.archivedAt,
          ],
        );
      }

      for (const exercise of payload.data.workoutExercises) {
        await tx.executeAsync(
          `INSERT INTO workout_exercises (
            id, workout_id, name, muscle_group, target_reps, note, order_index, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            exercise.id,
            exercise.workoutId,
            exercise.name,
            exercise.muscleGroup,
            exercise.targetReps,
            exercise.note,
            exercise.orderIndex,
            exercise.createdAt,
            exercise.updatedAt,
          ],
        );
      }

      for (const session of payload.data.workoutSessions) {
        await tx.executeAsync(
          `INSERT INTO workout_sessions (
            id, user_id, workout_id, workout_name, focus, performed_at, overall_notes, duration_minutes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            session.id,
            user.id,
            session.workoutId,
            session.workoutName,
            session.focus,
            session.performedAt,
            session.overallNotes,
            session.durationMinutes,
            session.createdAt,
          ],
        );
      }

      for (const set of payload.data.sessionSets) {
        await tx.executeAsync(
          `INSERT INTO session_sets (
            id, session_id, template_exercise_id, exercise_name, muscle_group, set_index, load, reps, note, performed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            set.id,
            set.sessionId,
            set.templateExerciseId,
            set.exerciseName,
            set.muscleGroup,
            set.setIndex,
            set.load,
            set.reps,
            set.note,
            set.performedAt,
            set.createdAt,
          ],
        );
      }
    });

    return {
      workouts: payload.stats.workouts,
      workoutExercises: payload.stats.workoutExercises,
      workoutSessions: payload.stats.workoutSessions,
      sessionSets: payload.stats.sessionSets,
    };
  } catch (error) {
    if (isUserCancellation(error)) {
      return null;
    }

    throw error;
  }
};
