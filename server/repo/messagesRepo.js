// server/repo/messagesRepo.js
import { getSqliteDb, ensureClubBySlug } from "../sqlite.js";

/* ==========================
   Helpers
   ========================== */

function nowIso() {
  return new Date().toISOString();
}

export function listStaff(clubSlug) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  return db
    .prepare(
      `SELECT id, email, name, active, created_at
       FROM club_staff
       WHERE club_id = ? AND active = 1
       ORDER BY name ASC, email ASC`
    )
    .all(club.id);
}

export function isActiveStaffForClub(clubSlug, email) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return false;

  const row = db
    .prepare(
      `SELECT 1 AS ok
       FROM club_staff
       WHERE club_id = ? AND lower(email)=lower(?) AND active = 1
       LIMIT 1`
    )
    .get(club.id, e);

  return !!row?.ok;
}

export function upsertStaff(clubSlug, { email, name, active = 1 }) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) throw new Error("Invalid staff email");

  const existing = db
    .prepare(`SELECT * FROM club_staff WHERE club_id=? AND lower(email)=lower(?)`)
    .get(club.id, e);

  if (!existing) {
    const info = db
      .prepare(
        `INSERT INTO club_staff (club_id, email, name, active, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .run(club.id, e, String(name || "").trim(), Number(active ? 1 : 0));
    return db.prepare(`SELECT * FROM club_staff WHERE id=?`).get(info.lastInsertRowid);
  }

  db.prepare(
    `UPDATE club_staff
     SET name = ?, active = ?
     WHERE id = ?`
  ).run(String(name || existing.name || "").trim(), Number(active ? 1 : 0), existing.id);

  return db.prepare(`SELECT * FROM club_staff WHERE id=?`).get(existing.id);
}

/* ==========================
   Access checks (User)
   A user can access:
   - DM thread if they are the user_email
   - Group thread if they have at least one active enrollment in that group
   ========================== */

export function userHasActiveEnrollmentInGroup(clubSlug, userEmail, groupId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const tag = `me:${String(userEmail || "").trim().toLowerCase()}`;
  if (!tag || !tag.includes("@")) return false;

  // user athletes = athletes.phone === tag
  // active enrollment = end_date IS NULL
  const row = db
    .prepare(
      `SELECT 1 AS ok
       FROM enrollments e
       JOIN athletes a ON a.id = e.athlete_id
       WHERE e.club_id = ?
         AND e.group_id = ?
         AND e.end_date IS NULL
         AND a.club_id = ?
         AND a.phone = ?
       LIMIT 1`
    )
    .get(club.id, Number(groupId), club.id, tag);

  return !!row?.ok;
}

export function getThreadById(clubSlug, threadId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  return db
    .prepare(
      `SELECT t.*,
              g.name AS group_name
       FROM message_threads t
       LEFT JOIN groups g ON g.id = t.group_id
       WHERE t.club_id = ? AND t.id = ?`
    )
    .get(club.id, Number(threadId));
}

export function listThreadMessages(clubSlug, threadId, limit = 200) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  return db
    .prepare(
      `SELECT m.*
       FROM message_messages m
       WHERE m.club_id = ? AND m.thread_id = ?
       ORDER BY m.id ASC
       LIMIT ?`
    )
    .all(club.id, Number(threadId), Number(limit));
}

/* ==========================
   Threads: DM
   ========================== */

export function getOrCreateDmThread(clubSlug, userEmail, staffEmail) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const u = String(userEmail || "").trim().toLowerCase();
  const s = String(staffEmail || "").trim().toLowerCase();
  if (!u.includes("@")) throw new Error("Invalid user email");
  if (!s.includes("@")) throw new Error("Invalid staff email");

  // enforce staff exists + active
  const staff = db
    .prepare(`SELECT * FROM club_staff WHERE club_id=? AND lower(email)=lower(?) AND active=1`)
    .get(club.id, s);
  if (!staff) throw new Error("Staff not found or inactive");

  const existing = db
    .prepare(
      `SELECT *
       FROM message_threads
       WHERE club_id = ?
         AND type = 'dm'
         AND lower(user_email) = lower(?)
         AND lower(staff_email) = lower(?)
       LIMIT 1`
    )
    .get(club.id, u, s);

  if (existing) return existing;

  const info = db
    .prepare(
      `INSERT INTO message_threads
       (club_id, type, user_email, staff_email, subject, group_id, created_at, updated_at)
       VALUES (?, 'dm', ?, ?, ?, NULL, datetime('now'), datetime('now'))`
    )
    .run(club.id, u, s, `DM: ${u} ↔ ${s}`);

  return db.prepare(`SELECT * FROM message_threads WHERE id=?`).get(info.lastInsertRowid);
}

/* ==========================
   Threads: GROUP
   ========================== */

export function getOrCreateGroupThread(clubSlug, groupId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const g = db.prepare(`SELECT * FROM groups WHERE club_id=? AND id=?`).get(club.id, Number(groupId));
  if (!g) throw new Error("Group not found");

  const existing = db
    .prepare(
      `SELECT *
       FROM message_threads
       WHERE club_id = ? AND type='group' AND group_id = ?
       LIMIT 1`
    )
    .get(club.id, Number(groupId));

  if (existing) return existing;

  const info = db
    .prepare(
      `INSERT INTO message_threads
       (club_id, type, user_email, staff_email, subject, group_id, created_at, updated_at)
       VALUES (?, 'group', NULL, NULL, ?, ?, datetime('now'), datetime('now'))`
    )
    .run(club.id, `Group: ${g.name}`, Number(groupId));

  return db.prepare(`SELECT * FROM message_threads WHERE id=?`).get(info.lastInsertRowid);
}

/* ==========================
   List threads
   - User: DM threads where user_email matches + group threads where user has enrollment
   - Admin: list all
   ========================== */

export function listThreadsForUser(clubSlug, userEmail, q = "") {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const u = String(userEmail || "").trim().toLowerCase();
  if (!u.includes("@")) throw new Error("Invalid user email");

  const query = String(q || "").trim();
  const like = `%${query}%`;

  // group access: groups where user has active enrollment
  const tag = `me:${u}`;

  const groupIds = db
    .prepare(
      `SELECT DISTINCT e.group_id AS group_id
       FROM enrollments e
       JOIN athletes a ON a.id = e.athlete_id
       WHERE e.club_id = ?
         AND e.end_date IS NULL
         AND a.club_id = ?
         AND a.phone = ?`
    )
    .all(club.id, club.id, tag)
    .map((r) => Number(r.group_id));

  // DM threads
  let dmSql = `
    SELECT t.*,
           NULL AS group_name
    FROM message_threads t
    WHERE t.club_id = ?
      AND t.type='dm'
      AND lower(t.user_email)=lower(?)
  `;
  const dmParams = [club.id, u];

  if (query) {
    dmSql += " AND (t.subject LIKE ? OR t.staff_email LIKE ? OR t.user_email LIKE ?) ";
    dmParams.push(like, like, like);
  }

  // group threads (only those groups)
  let groupThreads = [];
  if (groupIds.length > 0) {
    const placeholders = groupIds.map(() => "?").join(",");
    let gSql = `
      SELECT t.*,
             g.name AS group_name
      FROM message_threads t
      JOIN groups g ON g.id = t.group_id
      WHERE t.club_id = ?
        AND t.type='group'
        AND t.group_id IN (${placeholders})
    `;
    const gParams = [club.id, ...groupIds];

    if (query) {
      gSql += " AND (t.subject LIKE ? OR g.name LIKE ?) ";
      gParams.push(like, like);
    }

    groupThreads = db.prepare(gSql).all(...gParams);
  }

  const dmThreads = db.prepare(dmSql).all(...dmParams);

  const combined = [...dmThreads, ...groupThreads];
  combined.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return combined;
}

export function listThreadsForAdmin(clubSlug, q = "") {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const query = String(q || "").trim();
  const like = `%${query}%`;

  let sql = `
    SELECT t.*,
           g.name AS group_name
    FROM message_threads t
    LEFT JOIN groups g ON g.id = t.group_id
    WHERE t.club_id = ?
  `;
  const params = [club.id];

  if (query) {
    sql += `
      AND (
        t.subject LIKE ? OR
        t.user_email LIKE ? OR
        t.staff_email LIKE ? OR
        g.name LIKE ?
      )
    `;
    params.push(like, like, like, like);
  }

  sql += ` ORDER BY t.updated_at DESC, t.id DESC LIMIT 500`;

  return db.prepare(sql).all(...params);
}

/* ==========================
   Send message (user/staff)
   ========================== */

export function addMessage(clubSlug, { threadId, senderType, senderEmail, body }) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const t = getThreadById(clubSlug, threadId);
  if (!t) throw new Error("Thread not found");

  const st = String(senderType || "").trim().toLowerCase();
  if (st !== "user" && st !== "staff") throw new Error("Invalid sender_type");

  const se = String(senderEmail || "").trim().toLowerCase();
  if (!se.includes("@")) throw new Error("Invalid sender email");

  const b = String(body || "");
  if (!b.trim()) throw new Error("Message body is required");

  const info = db
    .prepare(
      `INSERT INTO message_messages
       (club_id, thread_id, sender_type, sender_email, body, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(club.id, Number(threadId), st, se, b);

  db.prepare(`UPDATE message_threads SET updated_at=datetime('now') WHERE club_id=? AND id=?`).run(
    club.id,
    Number(threadId)
  );

  return db.prepare(`SELECT * FROM message_messages WHERE id=?`).get(info.lastInsertRowid);
}
