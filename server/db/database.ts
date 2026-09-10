import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDatabaseConnection, defaultDatabasePath } from './connection.js';
import { migrations } from './migrations/index.js';
import { runMigrations } from './migrations/migrationRunner.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(moduleDir, './schema.sql');

const legacySqliteEnabled = process.env.LEGACY_SQLITE_ENABLED === 'true' || (process.env.NODE_ENV || 'development') !== 'production';
export const db = createDatabaseConnection(legacySqliteEnabled ? (process.env.WIDGETFLOW_DB_PATH || defaultDatabasePath) : ':memory:');

export function initializeDatabase(connection = db) {
  connection.exec(fs.readFileSync(schemaPath, 'utf8'));
  return runMigrations(connection, migrations);
}

export const initDatabase = initializeDatabase;
