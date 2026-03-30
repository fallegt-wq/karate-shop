// server/repo/clubAdminRepo.js
import { getSqliteDb, ensureClubBySlug } from "../sqlite.js";

/* ==========================
   GROUPS
   ========================== */

export function listGroups(clubSlug) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  return db
    .prepare("SELECT * FROM groups WHERE club_id = ? ORDER BY active DESC, name ASC")
    .all(club.id);
}

export function createGroup(clubSlug, { name, description }) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const info = db
    .prepare("INSERT INTO groups (club_id, name, description) VALUES (?, ?, ?)")
    .run(club.id, name, description);

  return db.prepare("SELECT * FROM groups WHERE id = ?").get(info.lastInsertRowid);
}

/* ==========================
   ATHLETES
   ========================== */

export function listAthletes(clubSlug, q = "") {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);
  const query = String(q || "").trim();

  if (!query) {
    return db
      .prepare(
        "SELECT * FROM athletes WHERE club_id = ? ORDER BY active DESC, last_name, first_name"
      )
      .all(club.id);
  }

  const like = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM athletes
       WHERE club_id = ?
         AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR national_id LIKE ?)
       ORDER BY active DESC, last_name, first_name`
    )
    .all(club.id, like, like, like, like, like);
}

export function createAthlete(clubSlug, data) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const info = db
    .prepare(
      `INSERT INTO athletes
        (club_id, first_name, last_name, national_id, email, phone, birthdate, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      club.id,
      data.first_name,
      data.last_name,
      data.national_id,
      data.email,
      data.phone,
      data.birthdate,
      data.notes
    );

  return db.prepare("SELECT * FROM athletes WHERE id = ?").get(info.lastInsertRowid);
}

/**
 * UPDATE athlete phone (notað fyrir "claim" á athlete inn á innskráðan notanda)
 */
export function updateAthletePhone(clubSlug, athleteId, phone) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const p = String(phone ?? "").trim();
  if (!p) throw new Error("phone is required");

  const info = db
    .prepare(
      `UPDATE athletes
       SET phone = ?
       WHERE club_id = ? AND id = ?`
    )
    .run(p, club.id, Number(athleteId));

  if (info.changes === 0) return null;
  return db.prepare("SELECT * FROM athletes WHERE id = ?").get(Number(athleteId));
}

/* ==========================
   ENROLLMENTS
   ========================== */

export function listEnrollments(clubSlug, athleteId = null) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  let sql = `
    SELECT e.*,
           g.name AS group_name,
           a.first_name, a.last_name
    FROM enrollments e
    JOIN groups g ON g.id = e.group_id
    JOIN athletes a ON a.id = e.athlete_id
    WHERE e.club_id = ?
  `;
  const params = [club.id];

  if (athleteId != null) {
    sql += " AND e.athlete_id = ? ";
    params.push(Number(athleteId));
  }

  sql += " ORDER BY (e.end_date IS NULL) DESC, e.start_date DESC, e.id DESC";

  return db.prepare(sql).all(...params);
}

// move/enroll: lokar fyrri virku skráningu og býr til nýja
export function createEnrollment(
  clubSlug,
  { athlete_id, group_id, reason, close_existing, start_date }
) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const tx = db.transaction(() => {
    if (close_existing) {
      db.prepare(
        `UPDATE enrollments
         SET end_date = COALESCE(end_date, date('now'))
         WHERE club_id = ? AND athlete_id = ? AND end_date IS NULL`
      ).run(club.id, athlete_id);
    }

    const info = db
      .prepare(
        `INSERT INTO enrollments (club_id, athlete_id, group_id, start_date, reason)
         VALUES (?, ?, ?, COALESCE(?, date('now')), ?)`
      )
      .run(club.id, athlete_id, group_id, start_date, reason);

    return db.prepare("SELECT * FROM enrollments WHERE id = ?").get(info.lastInsertRowid);
  });

  return tx();
}

/* ==========================
   PAYMENTS
   ========================== */

export function listPayments(clubSlug, status = "") {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const s = String(status || "").trim(); // unpaid|paid|void or ""
  let sql = `
    SELECT p.*,
           a.first_name, a.last_name
    FROM payments p
    JOIN athletes a ON a.id = p.athlete_id
    WHERE p.club_id = ?
  `;
  const params = [club.id];

  if (s) {
    sql += " AND p.status = ? ";
    params.push(s);
  }

  sql += " ORDER BY (p.status = 'unpaid') DESC, p.due_date DESC, p.id DESC";

  return db.prepare(sql).all(...params);
}

export function listPaymentsForUser(clubSlug, userEmail, status = "") {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const email = String(userEmail || "").trim().toLowerCase();
  const tag = `me:${email}`;
  if (!email.includes("@")) return [];

  const athleteIds = db
    .prepare(
      `SELECT id
       FROM athletes
       WHERE club_id = ? AND phone = ?`
    )
    .all(club.id, tag)
    .map((r) => Number(r.id));

  if (athleteIds.length === 0) return [];

  const s = String(status || "").trim();
  const placeholders = athleteIds.map(() => "?").join(",");
  let sql = `
    SELECT p.*,
           a.first_name, a.last_name
    FROM payments p
    JOIN athletes a ON a.id = p.athlete_id
    WHERE p.club_id = ?
      AND p.athlete_id IN (${placeholders})
  `;
  const params = [club.id, ...athleteIds];

  if (s) {
    sql += " AND p.status = ? ";
    params.push(s);
  }

  sql += " ORDER BY (p.status = 'unpaid') DESC, p.due_date DESC, p.id DESC";
  return db.prepare(sql).all(...params);
}

export function listPaymentsSummaryForUser(clubSlug, userEmail) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const email = String(userEmail || "").trim().toLowerCase();
  const tag = `me:${email}`;
  if (!email.includes("@")) {
    return { total_count: 0, total_amount_isk: 0, by_status: [] };
  }

  const athleteIds = db
    .prepare(
      `SELECT id
       FROM athletes
       WHERE club_id = ? AND phone = ?`
    )
    .all(club.id, tag)
    .map((r) => Number(r.id));

  if (athleteIds.length === 0) {
    return { total_count: 0, total_amount_isk: 0, by_status: [] };
  }

  const placeholders = athleteIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT p.status,
              COUNT(*) AS count,
              SUM(p.amount_isk) AS total_isk
       FROM payments p
       WHERE p.club_id = ?
         AND p.athlete_id IN (${placeholders})
       GROUP BY p.status`
    )
    .all(club.id, ...athleteIds);

  const total = rows.reduce(
    (acc, r) => {
      acc.count += Number(r.count || 0);
      acc.total += Number(r.total_isk || 0);
      return acc;
    },
    { count: 0, total: 0 }
  );

  return {
    total_count: total.count,
    total_amount_isk: total.total,
    by_status: rows.map((r) => ({
      status: r.status,
      count: Number(r.count || 0),
      total_isk: Number(r.total_isk || 0),
    })),
  };
}

export function createPayment(clubSlug, { athlete_id, enrollment_id, title, amount_isk, due_date }) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const info = db
    .prepare(
      `INSERT INTO payments (club_id, athlete_id, enrollment_id, title, amount_isk, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid')`
    )
    .run(club.id, athlete_id, enrollment_id, title, amount_isk, due_date);

  return db.prepare("SELECT * FROM payments WHERE id = ?").get(info.lastInsertRowid);
}

export function markPaymentPaid(clubSlug, paymentId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const info = db
    .prepare(
      `UPDATE payments
       SET status='paid', paid_at=datetime('now')
       WHERE club_id=? AND id=?`
    )
    .run(club.id, Number(paymentId));

  if (info.changes === 0) return null;
  return db.prepare("SELECT * FROM payments WHERE id=?").get(Number(paymentId));
}
