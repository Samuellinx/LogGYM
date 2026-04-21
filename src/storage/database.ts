import {open, type NitroSQLiteConnection} from 'react-native-nitro-sqlite';

import {migrations} from '@/storage/migrations';

const DATABASE_NAME = 'loggym.db';

const startupPragmas = [
  'PRAGMA foreign_keys = ON;',
  'PRAGMA journal_mode = WAL;',
  'PRAGMA synchronous = NORMAL;',
];

let database: NitroSQLiteConnection | null = null;

const ensureMigrationTable = async (db: NitroSQLiteConnection) => {
  await db.executeAsync(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );`,
  );
};

export const getDatabase = () => {
  if (!database) {
    database = open({name: DATABASE_NAME});
  }

  return database;
};

export const initializeDatabase = async () => {
  const db = getDatabase();

  for (const pragma of startupPragmas) {
    await db.executeAsync(pragma);
  }

  await ensureMigrationTable(db);

  for (const migration of migrations) {
    const result = await db.executeAsync<{id: string}>(
      'SELECT id FROM schema_migrations WHERE id = ? LIMIT 1;',
      [migration.id],
    );

    if (result.rows.length > 0) {
      continue;
    }

    await db.transaction(async tx => {
      for (const statement of migration.statements) {
        await tx.executeAsync(statement);
      }

      await tx.executeAsync(
        'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?);',
        [migration.id, new Date().toISOString()],
      );
    });
  }
};

export const closeDatabase = () => {
  if (!database) {
    return;
  }

  database.close();
  database = null;
};
