import { type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'rendix.db';

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      technician_name TEXT NOT NULL,
      destination TEXT NOT NULL,
      reason TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      advance_amount REAL NOT NULL DEFAULT 0.0,
      currency TEXT NOT NULL DEFAULT 'PEN',
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      document_type TEXT NOT NULL,
      date TEXT NOT NULL,
      vendor_name TEXT,
      ruc TEXT,
      series TEXT,
      number TEXT,
      currency TEXT NOT NULL DEFAULT 'PEN',
      taxable_base REAL,
      igv REAL,
      total_amount REAL NOT NULL,
      photo_uri TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
