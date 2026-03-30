// server/repo/guardiansRepo.js
import { getSqliteDb, ensureClubBySlug } from "../sqlite.js";

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function listGuardiansForAthlete(clubSlug, athleteId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const stmt = db.prepare(`
    SELECT
      g.id,
      g.email,
      g.name,
      g.national_id,
      g.phone,
      ga.relationship
    FROM guardian_athletes ga
    JOIN guardians g ON g.id = ga.guardian_id
    WHERE ga.club_id = ? AND ga.athlete_id = ?
    ORDER BY g.email ASC
  `);

  return stmt.all(club.id, Number(athleteId));
}

/**
 * Upsert guardian by (club_id, email), then link to athlete
 * payload: { email, relationship, name?, national_id?, phone? }
 */
export function addGuardianToAthlete(clubSlug, athleteId, payload) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const email = normEmail(payload?.email);
  if (!email || !email.includes("@")) throw new Error("Missing/invalid email");

  const relationship = String(payload?.relationship || "forráðamaður").trim();

  // Upsert guardian
  const getG = db.prepare(`SELECT * FROM guardians WHERE club_id = ? AND email = ?`);
  let guardian = getG.get(club.id, email);

  if (!guardian) {
    const ins = db.prepare(`
      INSERT INTO guardians (club_id, email, name, national_id, phone)
      VALUES (?, ?, ?, ?, ?)
    `);
    ins.run(
      club.id,
      email,
      payload?.name ? String(payload.name) : null,
      payload?.national_id ? String(payload.national_id) : null,
      payload?.phone ? String(payload.phone) : null
    );
    guardian = getG.get(club.id, email);
  } else {
    // Update only if provided
    db.prepare(`
      UPDATE guardians
      SET
        name = COALESCE(?, name),
        national_id = COALESCE(?, national_id),
        phone = COALESCE(?, phone)
      WHERE id = ?
    `).run(
      payload?.name ? String(payload.name) : null,
      payload?.national_id ? String(payload.national_id) : null,
      payload?.phone ? String(payload.phone) : null,
      guardian.id
    );
    guardian = db.prepare(`SELECT * FROM guardians WHERE id = ?`).get(guardian.id);
  }

  // Link guardian -> athlete (create if missing)
  db.prepare(`
    INSERT OR IGNORE INTO guardian_athletes (club_id, guardian_id, athlete_id, relationship)
    VALUES (?, ?, ?, ?)
  `).run(club.id, guardian.id, Number(athleteId), relationship);

  // Ensure relationship matches latest input
  db.prepare(`
    UPDATE guardian_athletes
    SET relationship = ?
    WHERE club_id = ? AND guardian_id = ? AND athlete_id = ?
  `).run(relationship, club.id, guardian.id, Number(athleteId));

  return {
    guardian_id: guardian.id,
    athlete_id: Number(athleteId),
    email: guardian.email,
    relationship,
  };
}

/** Verify athlete is claimed by this user (phone tag me:<email>) */
export function isAthleteClaimedByEmail(clubSlug, athleteId, email) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);
  const tag = `me:${normEmail(email)}`;

  const row = db
    .prepare(
      `SELECT id
       FROM athletes
       WHERE club_id = ?
         AND id = ?
         AND lower(coalesce(phone,'')) = ?`
    )
    .get(club.id, Number(athleteId), tag);

  return !!row;
}
