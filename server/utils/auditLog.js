import { getSqliteDb } from "../sqlite.js";

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  metadata = {},
}) {
  try {
    const db = getSqliteDb();

    db.prepare(
      `INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata)
    );
  } catch (err) {
    console.error("Audit log failed", err);
  }
}
