import { getSqliteDb } from '../sqlite.js';

export default function initRegistrationTables() {
  const db = getSqliteDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      kennitala TEXT,
      birth_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      club_slug TEXT,
      course_id TEXT NOT NULL,
      course_title TEXT NOT NULL,
      course_price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    );
  `);

  try {
    const columns = db
      .prepare('PRAGMA table_info(course_registrations)')
      .all()
      .map((column) => String(column.name || ''));

    if (!columns.includes('club_slug')) {
      db.exec(`ALTER TABLE course_registrations ADD COLUMN club_slug TEXT`);
    }
  } catch {
    // ignore migration errors
  }

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_course_registrations_club_slug
      ON course_registrations (club_slug, created_at DESC)
    `);
  } catch {
    // ignore
  }

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_course_registrations_participant_id
      ON course_registrations (participant_id)
    `);
  } catch {
    // ignore
  }

  return true;
}
