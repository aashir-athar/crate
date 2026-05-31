import * as SQLite from 'expo-sqlite';

import { logger } from '@/lib/logger';

import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

/** Single shared database handle. */
export const db = SQLite.openDatabaseSync('crate.db');

let initialized = false;

/** Create tables + set pragmas. Idempotent; safe to call repeatedly. */
export function initDatabase(): void {
  if (initialized) return;
  try {
    db.execSync('PRAGMA journal_mode = WAL;');
    db.execSync('PRAGMA foreign_keys = ON;');
    db.execSync(SCHEMA_SQL);
    db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    initialized = true;
  } catch (error) {
    logger.error('Database initialization failed', { error: String(error) });
    throw error;
  }
}

// Eagerly initialize so repository imports always find a ready schema.
initDatabase();
