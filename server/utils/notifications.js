import { getSqliteDb } from "../sqlite.js";

export async function createNotification({
  userId,
  type,
  title,
  message,
}) {
  try {
    const db = getSqliteDb();

    db.prepare(
      `INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        created_at
      )
      VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(userId, type, title, message);
  } catch (err) {
    console.error("Notification error", err);
  }
}
