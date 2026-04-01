// server/sqlite.js
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { SQLITE_DB_PATH } from "./db.js";

let _db = null;

export function getSqliteDb() {
  if (_db) return _db;

  const dbDir = path.dirname(SQLITE_DB_PATH);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(SQLITE_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  _db = db;
  return _db;
}

export const db = getSqliteDb();

function addColumnIfMissing(db, tableName, columnName, ddl) {
  try {
    const cols = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((c) => String(c.name || ""));

    if (!cols.includes(columnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${ddl}`);
    }
  } catch {
    // ignore migration errors
  }
}

export function initIðkendaSchema() {
  const db = getSqliteDb();

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
      UNIQUE (club_id, name)
    );

    CREATE TABLE IF NOT EXISTS athletes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      national_id TEXT,
      email TEXT,
      phone TEXT,
      birthdate TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      athlete_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      start_date TEXT NOT NULL DEFAULT (date('now')),
      end_date TEXT,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      athlete_id INTEGER NOT NULL,
      enrollment_id INTEGER,
      title TEXT NOT NULL,
      amount_isk INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid',
      due_date TEXT,
      paid_at TEXT,
      method TEXT,
      reference TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
      FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      club_slug TEXT,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW',
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      payment_provider TEXT,
      buyer_email TEXT,
      total_amount INTEGER NOT NULL DEFAULT 0,
      body_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT,
      entity_type TEXT,
      entity_id TEXT,
      metadata TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      type TEXT,
      title TEXT,
      message TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_login_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS club_staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
      UNIQUE (club_id, email)
    );

    CREATE TABLE IF NOT EXISTS message_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      user_email TEXT,
      staff_email TEXT,
      subject TEXT,
      group_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS message_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      thread_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
      FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_groups_club ON groups(club_id);
    CREATE INDEX IF NOT EXISTS idx_athletes_club ON athletes(club_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_active ON enrollments(club_id, athlete_id, end_date);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(club_id, status);

    CREATE INDEX IF NOT EXISTS idx_staff_club ON club_staff(club_id, active);
    CREATE INDEX IF NOT EXISTS idx_threads_club ON message_threads(club_id, type, updated_at);
    CREATE INDEX IF NOT EXISTS idx_threads_dm ON message_threads(club_id, type, user_email, staff_email);
    CREATE INDEX IF NOT EXISTS idx_threads_group ON message_threads(club_id, type, group_id);
    CREATE INDEX IF NOT EXISTS idx_msgs_thread ON message_messages(club_id, thread_id, id);
    CREATE INDEX IF NOT EXISTS idx_auth_login_codes_expires ON auth_login_codes(expires_at);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
  `);

  try {
    const clubCols = db
      .prepare("PRAGMA table_info(clubs)")
      .all()
      .map((c) => String(c.name || ""));

    function addClubCol(name, ddl) {
      if (!clubCols.includes(name)) {
        db.exec(`ALTER TABLE clubs ADD COLUMN ${ddl}`);
      }
    }

    addClubCol("template_id", "template_id TEXT NOT NULL DEFAULT 'combat'");
    addClubCol("logo_text", "logo_text TEXT");
    addClubCol("primary_color", "primary_color TEXT NOT NULL DEFAULT '#ffffff'");
    addClubCol("text_color", "text_color TEXT NOT NULL DEFAULT '#0a0a0a'");
    addClubCol("accent_color", "accent_color TEXT NOT NULL DEFAULT '#00ff66'");
    addClubCol("hero_image", "hero_image TEXT");
  } catch {
    // ignore
  }

  ensureDemoClubs(db);

  try {
    addColumnIfMissing(db, "orders", "club_id", "club_id INTEGER");
    addColumnIfMissing(db, "orders", "club_slug", "club_slug TEXT");
    addColumnIfMissing(db, "orders", "order_id", "order_id TEXT");
    addColumnIfMissing(db, "orders", "status", "status TEXT DEFAULT 'NEW'");
    addColumnIfMissing(db, "orders", "payment_status", "payment_status TEXT DEFAULT 'UNPAID'");
    addColumnIfMissing(db, "orders", "payment_provider", "payment_provider TEXT");
    addColumnIfMissing(db, "orders", "buyer_email", "buyer_email TEXT");
    addColumnIfMissing(db, "orders", "total_amount", "total_amount INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(db, "orders", "body_json", "body_json TEXT");
    addColumnIfMissing(db, "orders", "created_at", "created_at TEXT DEFAULT (datetime('now'))");

    db.exec(`
      INSERT INTO clubs (slug, name)
      SELECT DISTINCT o.club_slug, o.club_slug
      FROM orders o
      LEFT JOIN clubs c ON c.slug = o.club_slug
      WHERE o.club_slug IS NOT NULL AND c.id IS NULL;
    `);

    db.exec(`
      UPDATE orders
      SET club_id = (
        SELECT id FROM clubs WHERE clubs.slug = orders.club_slug
      )
      WHERE club_id IS NULL AND club_slug IS NOT NULL
    `);
  } catch {
    // ignore
  }

  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(club_id, buyer_email)");
  } catch {
    // ignore
  }

  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id)");
  } catch {
    // ignore
  }

  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(club_id, payment_status)");
  } catch {
    // ignore
  }

  return true;
}

function ensureDemoClubs(db) {
  const insert = db.prepare(`
    INSERT INTO clubs (slug, name, template_id, logo_text, primary_color, text_color, accent_color, hero_image)
    VALUES (@slug, @name, @template_id, @logo_text, @primary_color, @text_color, @accent_color, @hero_image)
  `);

  const demos = [
    {
      slug: "demo-club",
      name: "Demo Sportfélag",
      template_id: "team",
      logo_text: "DEMO",
      primary_color: "#ffffff",
      text_color: "#0a0a0a",
      accent_color: "#00ff66",
      hero_image:
        "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=2400&q=80",
    },
    {
      slug: "dojo",
      name: "Dojo Reykjavík",
      template_id: "combat",
      logo_text: "DOJO",
      primary_color: "#0b0b0b",
      text_color: "#ffffff",
      accent_color: "#ff2d2d",
      hero_image:
        "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=2400&q=80",
    },
    {
      slug: "ballet",
      name: "Ballet Studio",
      template_id: "artistic",
      logo_text: "BALLET",
      primary_color: "#ffffff",
      text_color: "#111111",
      accent_color: "#7c4dff",
      hero_image:
        "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=2400&q=80",
    },
  ];

  for (const c of demos) {
    const ok = db.prepare("SELECT 1 FROM clubs WHERE slug = ?").get(c.slug);
    if (!ok) insert.run(c);
  }
}

export function ensureClubBySlug(clubSlug) {
  const db = getSqliteDb();
  const slug = String(clubSlug || "").trim().toLowerCase();

  const get = db.prepare("SELECT * FROM clubs WHERE slug = ?");
  let club = get.get(slug);

  if (!club) {
    const ins = db.prepare(`
      INSERT INTO clubs (slug, name, template_id, logo_text, primary_color, text_color, accent_color, hero_image)
      VALUES (?, ?, 'combat', NULL, '#ffffff', '#0a0a0a', '#00ff66', NULL)
    `);
    ins.run(slug, slug);
    club = get.get(slug);
  }

  return club;
}

export function getClubPublicBySlug(clubSlug) {
  const slug = String(clubSlug || "").trim().toLowerCase();
  return db
    .prepare(
      `
      SELECT
        slug AS club_slug,
        name AS club_name,
        template_id,
        logo_text,
        primary_color,
        text_color,
        accent_color,
        hero_image
      FROM clubs
      WHERE slug = ?
    `
    )
    .get(slug);
}

export function listClubsPublic() {
  return db
    .prepare(
      `
      SELECT
        slug AS club_slug,
        name AS club_name,
        template_id,
        logo_text,
        primary_color,
        text_color,
        accent_color,
        hero_image
      FROM clubs
      ORDER BY name ASC
    `
    )
    .all();
}
