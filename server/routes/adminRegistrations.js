import { getSqliteDb } from "../sqlite.js";

const ALLOWED_STATUS = new Set(["pending", "confirmed", "assigned", "cancelled"]);
const ALLOWED_PAYMENT_STATUS = new Set(["unpaid", "paid", "refunded"]);

function mapRegistrationRow(row) {
  return {
    id: row.id,
    participantName: row.full_name,
    participantKennitala: row.kennitala,
    courseTitle: row.course_title,
    coursePrice: row.course_price,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  };
}

export function registerAdminRegistrationsRoutes(app, requireSession, requireClubStaff) {
  app.get(
    "/api/clubs/:clubSlug/admin/registrations",
    requireSession,
    requireClubStaff,
    (req, res) => {
      try {
        const db = getSqliteDb();
        const clubSlug = String(req.params.clubSlug || "").trim().toLowerCase();

        const columns = db
          .prepare("PRAGMA table_info(course_registrations)")
          .all()
          .map((column) => String(column.name || ""));

        const hasClubSlug = columns.includes("club_slug");

        const sql = hasClubSlug
          ? `
            SELECT
              cr.id,
              p.full_name,
              p.kennitala,
              cr.course_title,
              cr.course_price,
              cr.status,
              cr.payment_status,
              cr.created_at
            FROM course_registrations cr
            JOIN participants p ON p.id = cr.participant_id
            WHERE cr.club_slug = ?
            ORDER BY datetime(cr.created_at) DESC, cr.id DESC
          `
          : `
            SELECT
              cr.id,
              p.full_name,
              p.kennitala,
              cr.course_title,
              cr.course_price,
              cr.status,
              cr.payment_status,
              cr.created_at
            FROM course_registrations cr
            JOIN participants p ON p.id = cr.participant_id
            ORDER BY datetime(cr.created_at) DESC, cr.id DESC
          `;

        const rows = hasClubSlug
          ? db.prepare(sql).all(clubSlug)
          : db.prepare(sql).all();

        res.json({
          registrations: rows.map(mapRegistrationRow),
        });
      } catch (e) {
        res.status(500).json({
          error: "SERVER_ERROR",
          message: e?.message || "Failed to load registrations",
        });
      }
    }
  );

  app.patch(
    "/api/clubs/:clubSlug/admin/registrations/:registrationId",
    requireSession,
    requireClubStaff,
    (req, res) => {
      try {
        const db = getSqliteDb();
        const registrationId = Number(req.params.registrationId);

        if (!Number.isInteger(registrationId) || registrationId <= 0) {
          return res.status(400).json({
            error: "BAD_REQUEST",
            message: "Invalid registration id",
          });
        }

        const existing = db
          .prepare(`
            SELECT
              cr.id,
              p.full_name,
              p.kennitala,
              cr.course_title,
              cr.course_price,
              cr.status,
              cr.payment_status,
              cr.created_at
            FROM course_registrations cr
            JOIN participants p ON p.id = cr.participant_id
            WHERE cr.id = ?
          `)
          .get(registrationId);

        if (!existing) {
          return res.status(404).json({ error: "NOT_FOUND" });
        }

        const nextStatus =
          req.body?.status != null ? String(req.body.status).trim().toLowerCase() : null;

        const nextPaymentStatus =
          req.body?.paymentStatus != null
            ? String(req.body.paymentStatus).trim().toLowerCase()
            : null;

        if (nextStatus !== null && !ALLOWED_STATUS.has(nextStatus)) {
          return res.status(400).json({
            error: "BAD_REQUEST",
            message: "Invalid status",
          });
        }

        if (nextPaymentStatus !== null && !ALLOWED_PAYMENT_STATUS.has(nextPaymentStatus)) {
          return res.status(400).json({
            error: "BAD_REQUEST",
            message: "Invalid payment status",
          });
        }

        db.prepare(`
          UPDATE course_registrations
          SET
            status = COALESCE(?, status),
            payment_status = COALESCE(?, payment_status)
          WHERE id = ?
        `).run(nextStatus, nextPaymentStatus, registrationId);

        const updated = db
          .prepare(`
            SELECT
              cr.id,
              p.full_name,
              p.kennitala,
              cr.course_title,
              cr.course_price,
              cr.status,
              cr.payment_status,
              cr.created_at
            FROM course_registrations cr
            JOIN participants p ON p.id = cr.participant_id
            WHERE cr.id = ?
          `)
          .get(registrationId);

        res.json({
          registration: mapRegistrationRow(updated),
        });
      } catch (e) {
        res.status(500).json({
          error: "SERVER_ERROR",
          message: e?.message || "Failed to update registration",
        });
      }
    }
  );
}
