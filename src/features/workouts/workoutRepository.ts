import type {
  DashboardData,
  DashboardExerciseSummary,
  ExerciseProgressData,
  PersonalRecord,
  SessionUser,
  TrainingSessionInput,
  WorkoutDetail,
  WorkoutHistoryItem,
  WorkoutInput,
  WorkoutSummary,
} from '@/types/domain';
import {getDatabase} from '@/storage/database';
import {createId} from '@/utils/ids';

type NumberRow = {total: number | null};

type UserRow = {
  id: string;
  email: string;
  name: string;
  photo: string | null;
  given_name: string | null;
  family_name: string | null;
  provider: SessionUser['provider'];
  last_login_at: string;
};

type WorkoutSummaryRow = {
  id: string;
  name: string;
  focus: string;
  notes: string;
  accent_color: string;
  scheduled_day: string | null;
  exercise_count: number | null;
  last_performed_at: string | null;
  updated_at: string;
};

type WorkoutExerciseRow = {
  id: string;
  workout_id: string;
  name: string;
  muscle_group: string;
  base_load: string;
  target_reps: string;
  note: string;
  order_index: number;
};

type WorkoutHistoryRow = {
  id: string;
  workout_id: string | null;
  workout_name: string;
  focus: string;
  performed_at: string;
  overall_notes: string;
  total_sets: number | null;
  total_volume: number | null;
  top_load: number | null;
  exercises: string | null;
};

type RecentExerciseRow = {
  exercise_name: string;
  last_performed_at: string;
  max_load: number | null;
  total_sets: number | null;
};

type RecordRow = {
  exercise_name: string;
  max_load: number | null;
};

type ProgressRow = {
  exercise_name: string;
  workout_name: string;
  performed_at: string;
  load: number;
  reps: number;
  note: string;
};

type MetadataRow = {value: string};
type NamedWorkoutRow = {name: string};
type NamedSessionRow = {workout_name: string};

const legacySeedWorkoutNames = ['Lower Power', 'Pull Volume', 'Upper Strength'];
const legacySeedSessionNames = ['Lower Power', 'Upper Strength'];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mapSessionUser = (row: UserRow): SessionUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  photo: row.photo,
  givenName: row.given_name,
  familyName: row.family_name,
  provider: row.provider,
  lastLoginAt: row.last_login_at,
});

const mapWorkoutSummary = (row: WorkoutSummaryRow): WorkoutSummary => ({
  id: row.id,
  name: row.name,
  focus: row.focus,
  notes: row.notes,
  accentColor: row.accent_color,
  scheduledDay: row.scheduled_day,
  exerciseCount: Number(row.exercise_count ?? 0),
  lastPerformedAt: row.last_performed_at,
  updatedAt: row.updated_at,
});

const mapWorkoutHistory = (row: WorkoutHistoryRow): WorkoutHistoryItem => ({
  id: row.id,
  workoutId: row.workout_id,
  workoutName: row.workout_name,
  focus: row.focus,
  performedAt: row.performed_at,
  overallNotes: row.overall_notes,
  totalSets: Number(row.total_sets ?? 0),
  totalVolume: Number(row.total_volume ?? 0),
  topLoad: Number(row.top_load ?? 0),
  exercises: row.exercises
    ? row.exercises.split(',').map(item => item.trim()).filter(Boolean)
    : [],
});

export const ensureUserRecord = async (user: SessionUser) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(user.email);

  await db.executeAsync(
    `INSERT INTO users (
      id, email, name, photo, given_name, family_name, provider, created_at, last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      photo = excluded.photo,
      given_name = excluded.given_name,
      family_name = excluded.family_name,
      provider = excluded.provider,
      last_login_at = excluded.last_login_at;`,
    [
      user.id,
      normalizedEmail,
      user.name,
      user.photo,
      user.givenName,
      user.familyName,
      user.provider,
      now,
      user.lastLoginAt,
    ],
  );
};

export const findUserByEmail = async (email: string) => {
  const db = getDatabase();
  const normalizedEmail = normalizeEmail(email);
  const result = await db.executeAsync<UserRow>(
    `SELECT
      id,
      email,
      name,
      photo,
      given_name,
      family_name,
      provider,
      last_login_at
    FROM users
    WHERE LOWER(email) = ?
    LIMIT 1;`,
    [normalizedEmail],
  );

  const row = result.rows.item(0);

  return row ? mapSessionUser(row) : null;
};

export const purgeLegacySeedData = async (userId: string) => {
  const db = getDatabase();
  const metadataKey = `seeded:${userId}`;
  const metadata = await db.executeAsync<MetadataRow>(
    'SELECT value FROM metadata WHERE key = ? LIMIT 1;',
    [metadataKey],
  );

  if (metadata.rows.length === 0) {
    return false;
  }

  const [workouts, sessions] = await Promise.all([
    db.executeAsync<NamedWorkoutRow>(
      'SELECT name FROM workouts WHERE user_id = ? ORDER BY name ASC;',
      [userId],
    ),
    db.executeAsync<NamedSessionRow>(
      'SELECT workout_name FROM workout_sessions WHERE user_id = ? ORDER BY workout_name ASC;',
      [userId],
    ),
  ]);

  const workoutNames = workouts.rows._array.map(item => item.name);
  const sessionNames = sessions.rows._array.map(item => item.workout_name);

  const matchesLegacySeed =
    workoutNames.length === legacySeedWorkoutNames.length &&
    sessionNames.length === legacySeedSessionNames.length &&
    workoutNames.every((name, index) => name === legacySeedWorkoutNames[index]) &&
    sessionNames.every((name, index) => name === legacySeedSessionNames[index]);

  await db.transaction(async tx => {
    if (matchesLegacySeed) {
      await tx.executeAsync('DELETE FROM workout_sessions WHERE user_id = ?;', [userId]);
      await tx.executeAsync('DELETE FROM workouts WHERE user_id = ?;', [userId]);
    }

    await tx.executeAsync('DELETE FROM metadata WHERE key = ?;', [metadataKey]);
  });

  return matchesLegacySeed;
};

export const listWorkouts = async (userId: string) => {
  const db = getDatabase();
  const result = await db.executeAsync<WorkoutSummaryRow>(
    `SELECT
      w.id,
      w.name,
      w.focus,
      w.notes,
      w.accent_color,
      w.scheduled_day,
      COUNT(DISTINCT we.id) AS exercise_count,
      MAX(ws.performed_at) AS last_performed_at,
      w.updated_at
    FROM workouts w
    LEFT JOIN workout_exercises we ON we.workout_id = w.id
    LEFT JOIN workout_sessions ws ON ws.workout_id = w.id
    WHERE w.user_id = ? AND w.archived_at IS NULL
    GROUP BY w.id
    ORDER BY COALESCE(MAX(ws.performed_at), w.updated_at) DESC;`,
    [userId],
  );

  return result.rows._array.map(mapWorkoutSummary);
};

export const getWorkoutDetail = async (
  userId: string,
  workoutId: string,
): Promise<WorkoutDetail | null> => {
  const db = getDatabase();
  const workoutResult = await db.executeAsync<WorkoutSummaryRow>(
    `SELECT
      w.id,
      w.name,
      w.focus,
      w.notes,
      w.accent_color,
      w.scheduled_day,
      COUNT(DISTINCT we.id) AS exercise_count,
      MAX(ws.performed_at) AS last_performed_at,
      w.updated_at
    FROM workouts w
    LEFT JOIN workout_exercises we ON we.workout_id = w.id
    LEFT JOIN workout_sessions ws ON ws.workout_id = w.id
    WHERE w.user_id = ? AND w.id = ? AND w.archived_at IS NULL
    GROUP BY w.id
    LIMIT 1;`,
    [userId, workoutId],
  );

  const workoutRow = workoutResult.rows.item(0);

  if (!workoutRow) {
    return null;
  }

  const exercisesResult = await db.executeAsync<WorkoutExerciseRow>(
    `SELECT
      id,
      workout_id,
      name,
      muscle_group,
      base_load,
      target_reps,
      note,
      order_index
    FROM workout_exercises
    WHERE workout_id = ?
    ORDER BY order_index ASC;`,
    [workoutId],
  );

  return {
    ...mapWorkoutSummary(workoutRow),
    exercises: exercisesResult.rows._array.map(row => ({
      id: row.id,
      workoutId: row.workout_id,
      name: row.name,
      muscleGroup: row.muscle_group,
      baseLoad: row.base_load,
      targetReps: row.target_reps,
      note: row.note,
      orderIndex: Number(row.order_index),
    })),
  };
};

export const saveWorkout = async (
  userId: string,
  input: WorkoutInput,
  workoutId?: string,
) => {
  const db = getDatabase();
  const now = new Date().toISOString();
  const resolvedWorkoutId = workoutId ?? createId();

  await db.transaction(async tx => {
    if (workoutId) {
      await tx.executeAsync(
        `UPDATE workouts
        SET name = ?, focus = ?, notes = ?, accent_color = ?, scheduled_day = ?, updated_at = ?
        WHERE id = ? AND user_id = ?;`,
        [
          input.name,
          input.focus,
          input.notes,
          input.accentColor,
          input.scheduledDay ?? null,
          now,
          workoutId,
          userId,
        ],
      );

      await tx.executeAsync(
        'DELETE FROM workout_exercises WHERE workout_id = ?;',
        [workoutId],
      );
    } else {
      await tx.executeAsync(
        `INSERT INTO workouts (
          id, user_id, name, focus, notes, accent_color, scheduled_day, created_at, updated_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
        [
          resolvedWorkoutId,
          userId,
          input.name,
          input.focus,
          input.notes,
          input.accentColor,
          input.scheduledDay ?? null,
          now,
          now,
        ],
      );
    }

    for (const [index, exercise] of input.exercises.entries()) {
      await tx.executeAsync(
        `INSERT INTO workout_exercises (
          id, workout_id, name, muscle_group, base_load, target_reps, note, order_index, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          exercise.id ?? createId(),
          resolvedWorkoutId,
          exercise.name,
          exercise.muscleGroup,
          exercise.baseLoad,
          exercise.targetReps,
          exercise.note,
          index,
          now,
          now,
        ],
      );
    }
  });

  return resolvedWorkoutId;
};

export const importWorkouts = async (
  userId: string,
  inputs: WorkoutInput[],
) => {
  if (inputs.length === 0) {
    throw new Error('Nenhum treino valido foi encontrado para importar.');
  }

  const db = getDatabase();

  await db.transaction(async tx => {
    for (const input of inputs) {
      const now = new Date().toISOString();
      const importedWorkoutId = createId();

      await tx.executeAsync(
        `INSERT INTO workouts (
          id, user_id, name, focus, notes, accent_color, scheduled_day, created_at, updated_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
        [
          importedWorkoutId,
          userId,
          input.name,
          input.focus,
          input.notes,
          input.accentColor,
          input.scheduledDay ?? null,
          now,
          now,
        ],
      );

      for (const [index, exercise] of input.exercises.entries()) {
        await tx.executeAsync(
          `INSERT INTO workout_exercises (
            id, workout_id, name, muscle_group, base_load, target_reps, note, order_index, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            createId(),
            importedWorkoutId,
            exercise.name,
            exercise.muscleGroup,
            exercise.baseLoad,
            exercise.targetReps,
            exercise.note,
            index,
            now,
            now,
          ],
        );
      }
    }
  });
};

export const duplicateWorkout = async (userId: string, workoutId: string) => {
  const workout = await getWorkoutDetail(userId, workoutId);

  if (!workout) {
    throw new Error('Treino nao encontrado para duplicacao.');
  }

  return saveWorkout(userId, {
    name: `${workout.name} Copy`,
    focus: workout.focus,
    notes: workout.notes,
    accentColor: workout.accentColor,
    scheduledDay: workout.scheduledDay,
    exercises: workout.exercises.map(exercise => ({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      baseLoad: exercise.baseLoad,
      targetReps: exercise.targetReps,
      note: exercise.note,
    })),
  });
};

export const deleteWorkout = async (userId: string, workoutId: string) => {
  const db = getDatabase();

  await db.transaction(async tx => {
    await tx.executeAsync('DELETE FROM workout_exercises WHERE workout_id = ?;', [
      workoutId,
    ]);
    await tx.executeAsync(
      'DELETE FROM workouts WHERE id = ? AND user_id = ?;',
      [workoutId, userId],
    );
  });
};

export const saveTrainingSession = async (
  userId: string,
  input: TrainingSessionInput,
) => {
  const db = getDatabase();
  const validExercises = input.exercises
    .map(exercise => ({
      ...exercise,
      sets: exercise.sets.filter(set => set.load > 0 && set.reps > 0),
    }))
    .filter(exercise => exercise.sets.length > 0);

  if (validExercises.length === 0) {
    throw new Error('Adicione pelo menos uma serie valida antes de salvar.');
  }

  const sessionId = createId();
  const createdAt = new Date().toISOString();

  await db.transaction(async tx => {
    await tx.executeAsync(
      `INSERT INTO workout_sessions (
        id, user_id, workout_id, workout_name, focus, performed_at, overall_notes, duration_minutes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        sessionId,
        userId,
        input.workoutId,
        input.workoutName,
        input.focus,
        input.performedAt,
        input.overallNotes,
        0,
        createdAt,
      ],
    );

    let currentIndex = 0;

    for (const exercise of validExercises) {
      for (const set of exercise.sets) {
        await tx.executeAsync(
          `INSERT INTO session_sets (
            id, session_id, template_exercise_id, exercise_name, muscle_group, set_index, load, reps, note, performed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            createId(),
            sessionId,
            exercise.workoutExerciseId,
            exercise.exerciseName,
            exercise.muscleGroup,
            currentIndex,
            set.load,
            set.reps,
            set.note,
            input.performedAt,
            createdAt,
          ],
        );

        currentIndex += 1;
      }
    }
  });

  return sessionId;
};

export const deleteTrainingSession = async (
  userId: string,
  sessionId: string,
) => {
  const db = getDatabase();

  await db.transaction(async tx => {
    await tx.executeAsync(
      `DELETE FROM session_sets
       WHERE session_id IN (
         SELECT id
         FROM workout_sessions
         WHERE id = ? AND user_id = ?
       );`,
      [sessionId, userId],
    );

    await tx.executeAsync(
      'DELETE FROM workout_sessions WHERE id = ? AND user_id = ?;',
      [sessionId, userId],
    );
  });
};

export const listHistory = async (userId: string) => {
  const db = getDatabase();
  const result = await db.executeAsync<WorkoutHistoryRow>(
    `SELECT
      ws.id,
      ws.workout_id,
      ws.workout_name,
      ws.focus,
      ws.performed_at,
      ws.overall_notes,
      COUNT(ss.id) AS total_sets,
      COALESCE(SUM(ss.load * ss.reps), 0) AS total_volume,
      COALESCE(MAX(ss.load), 0) AS top_load,
      GROUP_CONCAT(DISTINCT ss.exercise_name) AS exercises
    FROM workout_sessions ws
    LEFT JOIN session_sets ss ON ss.session_id = ws.id
    WHERE ws.user_id = ?
    GROUP BY ws.id
    ORDER BY ws.performed_at DESC;`,
    [userId],
  );

  return result.rows._array.map(mapWorkoutHistory);
};

export const getDashboardData = async (userId: string): Promise<DashboardData> => {
  const db = getDatabase();
  const [workouts, history, templatesCount, setsCount, recentExercises, records] =
    await Promise.all([
      listWorkouts(userId),
      listHistory(userId),
      db.executeAsync<NumberRow>(
        'SELECT COUNT(*) AS total FROM workouts WHERE user_id = ? AND archived_at IS NULL;',
        [userId],
      ),
      db.executeAsync<NumberRow>(
        `SELECT COUNT(*) AS total
         FROM session_sets ss
         INNER JOIN workout_sessions ws ON ws.id = ss.session_id
         WHERE ws.user_id = ?;`,
        [userId],
      ),
      db.executeAsync<RecentExerciseRow>(
        `SELECT
          ss.exercise_name,
          MAX(ss.performed_at) AS last_performed_at,
          MAX(ss.load) AS max_load,
          COUNT(ss.id) AS total_sets
        FROM session_sets ss
        INNER JOIN workout_sessions ws ON ws.id = ss.session_id
        WHERE ws.user_id = ?
        GROUP BY LOWER(ss.exercise_name)
        ORDER BY MAX(ss.performed_at) DESC
        LIMIT 5;`,
        [userId],
      ),
      db.executeAsync<RecordRow>(
        `SELECT
          ss.exercise_name,
          MAX(ss.load) AS max_load
        FROM session_sets ss
        INNER JOIN workout_sessions ws ON ws.id = ss.session_id
        WHERE ws.user_id = ?
        GROUP BY LOWER(ss.exercise_name)
        ORDER BY MAX(ss.load) DESC
        LIMIT 3;`,
        [userId],
      ),
    ]);

  const weeklyCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const weeklySessions = history.filter(
    item => new Date(item.performedAt).getTime() >= weeklyCutoff,
  ).length;

  const recentExerciseItems: DashboardExerciseSummary[] = recentExercises.rows._array.map(
    item => ({
      exerciseName: item.exercise_name,
      lastPerformedAt: item.last_performed_at,
      maxLoad: Number(item.max_load ?? 0),
      totalSets: Number(item.total_sets ?? 0),
    }),
  );

  const personalRecords: PersonalRecord[] = records.rows._array.map(item => ({
    exerciseName: item.exercise_name,
    maxLoad: Number(item.max_load ?? 0),
  }));

  return {
    weeklySessions,
    totalSessions: history.length,
    totalTemplates: Number(templatesCount.rows.item(0)?.total ?? 0),
    totalTrackedSets: Number(setsCount.rows.item(0)?.total ?? 0),
    lastSession: history[0] ?? null,
    recentExercises: recentExerciseItems,
    personalRecords,
    suggestedTemplates: workouts.slice(0, 3),
  };
};

export const getExerciseProgress = async (
  userId: string,
  exerciseName: string,
): Promise<ExerciseProgressData> => {
  const db = getDatabase();
  const result = await db.executeAsync<ProgressRow>(
    `SELECT
      ss.exercise_name,
      ws.workout_name,
      ss.performed_at,
      ss.load,
      ss.reps,
      ss.note
    FROM session_sets ss
    INNER JOIN workout_sessions ws ON ws.id = ss.session_id
    WHERE ws.user_id = ? AND LOWER(ss.exercise_name) = LOWER(?)
    ORDER BY ss.performed_at ASC;`,
    [userId, exerciseName],
  );

  const points = result.rows._array.map(row => ({
    performedAt: row.performed_at,
    workoutName: row.workout_name,
    load: Number(row.load),
    reps: Number(row.reps),
    volume: Number(row.load) * Number(row.reps),
    note: row.note,
  }));

  const totalVolume = points.reduce((sum, point) => sum + point.volume, 0);
  const totalReps = points.reduce((sum, point) => sum + point.reps, 0);
  const recordLoad = points.reduce(
    (record, point) => Math.max(record, point.load),
    0,
  );

  return {
    exerciseName,
    recordLoad,
    totalVolume,
    averageReps: points.length > 0 ? totalReps / points.length : 0,
    lastPerformedAt: points.at(-1)?.performedAt ?? null,
    points,
  };
};
