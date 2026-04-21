export interface Migration {
  id: string;
  statements: string[];
}

export const migrations: Migration[] = [
  {
    id: '001_init',
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        photo TEXT,
        given_name TEXT,
        family_name TEXT,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        focus TEXT NOT NULL,
        notes TEXT NOT NULL,
        accent_color TEXT NOT NULL,
        scheduled_day TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );`,
      `CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        workout_id TEXT NOT NULL,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        target_reps TEXT NOT NULL,
        note TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        workout_id TEXT,
        workout_name TEXT NOT NULL,
        focus TEXT NOT NULL,
        performed_at TEXT NOT NULL,
        overall_notes TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );`,
      `CREATE TABLE IF NOT EXISTS session_sets (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        template_exercise_id TEXT,
        exercise_name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        set_index INTEGER NOT NULL,
        load REAL NOT NULL,
        reps INTEGER NOT NULL,
        note TEXT NOT NULL,
        performed_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_user_updated ON workouts(user_id, updated_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id, order_index ASC);`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_performed ON workout_sessions(user_id, performed_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_sets_session ON session_sets(session_id);`,
      `CREATE INDEX IF NOT EXISTS idx_sets_exercise ON session_sets(exercise_name, performed_at DESC);`,
    ],
  },
];
