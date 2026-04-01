import { getSqliteDb } from "../sqlite.js";

function getColumnInfo(db, tableName) {
  try {
    return db.prepare(`PRAGMA table_info(${tableName})`).all();
  } catch {
    return [];
  }
}

function hasColumn(db, tableName, columnName) {
  return getColumnInfo(db, tableName).some(
    (column) => String(column.name || "") === String(columnName)
  );
}

function rebuildCourseRegistrationsTable(db) {
  db.exec(`
    BEGIN;

    CREATE TABLE IF NOT EXISTS course_registrations_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      participant_id INTEGER,
      athlete_id INTEGER,
      club_slug TEXT,
      course_id TEXT NOT NULL,
      course_title TEXT NOT NULL,
      course_price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      order_id TEXT,
      payment_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      FOREIGN KEY (athlete_id) REFERENCES athletes(id)
    );

    INSERT INTO course_registrations_new (
      id,
      user_id,
      participant_id,
      athlete_id,
      club_slug,
      course_id,
      course_title,
      course_price,
      status,
      payment_status,
      order_id,
      payment_id,
      created_at
    )
    SELECT
      id,
      COALESCE(user_id, 0),
      participant_id,
      NULL,
      club_slug,
      course_id,
      course_title,
      COALESCE(course_price, 0),
      COALESCE(status, 'pending'),
      COALESCE(payment_status, 'unpaid'),
      NULL,
      NULL,
      COALESCE(created_at, CURRENT_TIMESTAMP)
    FROM course_registrations;

    DROP TABLE course_registrations;

    ALTER TABLE course_registrations_new RENAME TO course_registrations;

    COMMIT;
  `);
}

export default function initRegistrationTables() {
  const db = getSqliteDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      full_name TEXT NOT NULL,
      kennitala TEXT,
      birth_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      participant_id INTEGER,
      athlete_id INTEGER,
      club_slug TEXT,
      course_id TEXT NOT NULL,
      course_title TEXT NOT NULL,
      course_price INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      order_id TEXT,
      payment_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      FOREIGN KEY (athlete_id) REFERENCES athletes(id)
    );
  `);

  try {
    const columns = getColumnInfo(db, "course_registrations");
    const names = columns.map((column) => String(column.name || ""));
    const participantColumn = columns.find(
      (column) => String(column.name || "") === "participant_id"
    );

    const needsRebuild =
      !names.includes("athlete_id") ||
      !names.includes("order_id") ||
      !names.includes("payment_id") ||
      (participantColumn && Number(participantColumn.notnull || 0) === 1);

    if (needsRebuild) {
      rebuildCourseRegistrationsTable(db);
    }
  } catch {
    // ignore migration errors
  }

  try {
    if (!hasColumn(db, "course_registrations", "club_slug")) {
      db.exec(`ALTER TABLE course_registrations ADD COLUMN club_slug TEXT`);
    }
  } catch {
    // ignore
  }

  try {
    if (!hasColumn(db, "course_registrations", "athlete_id")) {
      db.exec(`ALTER TABLE course_registrations ADD COLUMN athlete_id INTEGER`);
    }
  } catch {
    // ignore
  }

  try {
    if (!hasColumn(db, "course_registrations", "order_id")) {
      db.exec(`ALTER TABLE course_registrations ADD COLUMN order_id TEXT`);
    }
  } catch {
    // ignore
  }

  try {
    if (!hasColumn(db, "course_registrations", "payment_id")) {
      db.exec(`ALTER TABLE course_registrations ADD COLUMN payment_id INTEGER`);
    }
  } catch {
    // ignore
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

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_course_registrations_athlete_id
      ON course_registrations (athlete_id)
    `);
  } catch {
    // ignore
  }

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_course_registrations_order_id
      ON course_registrations (order_id)
    `);
  } catch {
    // ignore
  }

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_course_registrations_payment_status
      ON course_registrations (payment_status, created_at DESC)
    `);
  } catch {
    // ignore
  }

  return true;
}
