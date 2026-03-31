import { getSqliteDb } from "../sqlite.js";

function getCurrentUserId(req) {
  const email = String(req.user?.email || "").trim().toLowerCase();
  if (!email) return null;
  return email;
}

export function registerParticipantRoutes(app, requireSession) {
  app.get("/api/participants", requireSession, (req, res) => {
    try {
      const db = getSqliteDb();
      const currentUserId = getCurrentUserId(req);

      if (!currentUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const rows = db
        .prepare(`
          SELECT
            id,
            user_id as userId,
            full_name as fullName,
            kennitala,
            birth_date as birthDate,
            created_at as createdAt
          FROM participants
          WHERE user_id = ?
          ORDER BY id DESC
        `)
        .all(currentUserId);

      return res.json(rows);
    } catch (e) {
      return res.status(500).json({
        error: "SERVER_ERROR",
        message: e?.message || "Failed to fetch participants",
      });
    }
  });

  app.post("/api/participants", requireSession, (req, res) => {
    try {
      const db = getSqliteDb();
      const currentUserId = getCurrentUserId(req);

      if (!currentUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { fullName, kennitala, birthDate } = req.body || {};

      if (!fullName || !String(fullName).trim()) {
        return res.status(400).json({ error: "fullName is required" });
      }

      const result = db
        .prepare(`
          INSERT INTO participants (
            user_id,
            full_name,
            kennitala,
            birth_date
          ) VALUES (?, ?, ?, ?)
        `)
        .run(
          currentUserId,
          String(fullName).trim(),
          kennitala ? String(kennitala).trim() : null,
          birthDate || null
        );

      const created = db
        .prepare(`
          SELECT
            id,
            user_id as userId,
            full_name as fullName,
            kennitala,
            birth_date as birthDate,
            created_at as createdAt
          FROM participants
          WHERE id = ?
        `)
        .get(result.lastInsertRowid);

      return res.status(201).json(created);
    } catch (e) {
      return res.status(500).json({
        error: "SERVER_ERROR",
        message: e?.message || "Failed to create participant",
      });
    }
  });

  app.post("/api/registrations", requireSession, (req, res) => {
    try {
      const db = getSqliteDb();
      const currentUserId = getCurrentUserId(req);

      if (!currentUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        participantId,
        courseId,
        courseTitle,
        coursePrice,
        clubSlug,
      } = req.body || {};

      if (!participantId) {
        return res.status(400).json({ error: "participantId is required" });
      }

      if (!courseId || !String(courseId).trim()) {
        return res.status(400).json({ error: "courseId is required" });
      }

      if (!courseTitle || !String(courseTitle).trim()) {
        return res.status(400).json({ error: "courseTitle is required" });
      }

      const participant = db
        .prepare(`
          SELECT id, user_id, full_name, kennitala
          FROM participants
          WHERE id = ? AND user_id = ?
        `)
        .get(Number(participantId), currentUserId);

      if (!participant) {
        return res.status(404).json({ error: "Participant not found" });
      }

      const normalizedClubSlug = String(clubSlug || "").trim().toLowerCase() || null;

      const result = db
        .prepare(`
          INSERT INTO course_registrations (
            user_id,
            participant_id,
            club_slug,
            course_id,
            course_title,
            course_price,
            status,
            payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'unpaid')
        `)
        .run(
          currentUserId,
          Number(participantId),
          normalizedClubSlug,
          String(courseId).trim(),
          String(courseTitle).trim(),
          Number(coursePrice || 0)
        );

      const created = db
        .prepare(`
          SELECT
            cr.id,
            cr.user_id as userId,
            cr.participant_id as participantId,
            cr.club_slug as clubSlug,
            cr.course_id as courseId,
            cr.course_title as courseTitle,
            cr.course_price as coursePrice,
            cr.status,
            cr.payment_status as paymentStatus,
            cr.created_at as createdAt,
            p.full_name as participantName,
            p.kennitala as participantKennitala
          FROM course_registrations cr
          JOIN participants p ON p.id = cr.participant_id
          WHERE cr.id = ?
        `)
        .get(result.lastInsertRowid);

      return res.status(201).json(created);
    } catch (e) {
      return res.status(500).json({
        error: "SERVER_ERROR",
        message: e?.message || "Failed to create registration",
      });
    }
  });

  app.post("/api/clubs/:clubSlug/registrations", requireSession, (req, res) => {
    try {
      req.body = {
        ...(req.body || {}),
        clubSlug: req.params.clubSlug,
      };

      const db = getSqliteDb();
      const currentUserId = getCurrentUserId(req);

      if (!currentUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        participantId,
        courseId,
        courseTitle,
        coursePrice,
        clubSlug,
      } = req.body || {};

      if (!participantId) {
        return res.status(400).json({ error: "participantId is required" });
      }

      if (!courseId || !String(courseId).trim()) {
        return res.status(400).json({ error: "courseId is required" });
      }

      if (!courseTitle || !String(courseTitle).trim()) {
        return res.status(400).json({ error: "courseTitle is required" });
      }

      const participant = db
        .prepare(`
          SELECT id, user_id, full_name, kennitala
          FROM participants
          WHERE id = ? AND user_id = ?
        `)
        .get(Number(participantId), currentUserId);

      if (!participant) {
        return res.status(404).json({ error: "Participant not found" });
      }

      const normalizedClubSlug = String(clubSlug || "").trim().toLowerCase() || null;

      const result = db
        .prepare(`
          INSERT INTO course_registrations (
            user_id,
            participant_id,
            club_slug,
            course_id,
            course_title,
            course_price,
            status,
            payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'unpaid')
        `)
        .run(
          currentUserId,
          Number(participantId),
          normalizedClubSlug,
          String(courseId).trim(),
          String(courseTitle).trim(),
          Number(coursePrice || 0)
        );

      const created = db
        .prepare(`
          SELECT
            cr.id,
            cr.user_id as userId,
            cr.participant_id as participantId,
            cr.club_slug as clubSlug,
            cr.course_id as courseId,
            cr.course_title as courseTitle,
            cr.course_price as coursePrice,
            cr.status,
            cr.payment_status as paymentStatus,
            cr.created_at as createdAt,
            p.full_name as participantName,
            p.kennitala as participantKennitala
          FROM course_registrations cr
          JOIN participants p ON p.id = cr.participant_id
          WHERE cr.id = ?
        `)
        .get(result.lastInsertRowid);

      return res.status(201).json(created);
    } catch (e) {
      return res.status(500).json({
        error: "SERVER_ERROR",
        message: e?.message || "Failed to create registration",
      });
    }
  });
}
