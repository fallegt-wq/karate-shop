// server/repo/ordersRepo.js
import crypto from "node:crypto";
import { getSqliteDb, ensureClubBySlug } from "../sqlite.js";

function safeJsonStringify(x) {
  try {
    return JSON.stringify(x ?? {});
  } catch {
    return JSON.stringify({ raw: String(x) });
  }
}

function safeJsonParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function normalizeEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return e && e.includes("@") ? e : null;
}

function mapOrderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    club_id: row.club_id,
    order_id: row.order_id,
    status: row.status,
    payment: {
      status: row.payment_status,
      provider: row.payment_provider || null,
    },
    buyer_email: row.buyer_email || null,
    body: safeJsonParse(row.body_json) || {},
    created_at: row.created_at,
  };
}

export async function createOrder(clubSlug, body, buyerEmail = null) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const orderId =
    String(body?.order_id || body?.orderId || "").trim() || crypto.randomUUID();

  const buyer_email = normalizeEmail(buyerEmail);

  const payload = {
    ...body,
    order_id: orderId,
    buyer_email: buyer_email, // líka í body fyrir debug
  };

  const info = db
    .prepare(
      `INSERT INTO orders
        (club_id, club_slug, order_id, status, payment_status, payment_provider, buyer_email, body_json, order_json, created_at)
       VALUES (?, ?, ?, 'NEW', 'UNPAID', NULL, ?, ?, ?, datetime('now'))`
    )
    .run(
      club.id,
      String(clubSlug),
      orderId,
      buyer_email,
      safeJsonStringify(payload),
      safeJsonStringify(payload)
    );

  const row = db
    .prepare(`SELECT * FROM orders WHERE order_id = ?`)
    .get(orderId);

  return mapOrderRow(row);
}

export async function listOrders(clubSlug) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const rows = db
    .prepare(
      `SELECT * FROM orders
       WHERE club_id = ?
       ORDER BY datetime(created_at) DESC, id DESC`
    )
    .all(club.id);

  return rows.map(mapOrderRow);
}

export async function listOrdersByBuyer(clubSlug, buyerEmail) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const email = normalizeEmail(buyerEmail);
  if (!email) return [];

  const rows = db
    .prepare(
      `SELECT * FROM orders
       WHERE club_id = ? AND lower(coalesce(buyer_email,'')) = ?
       ORDER BY datetime(created_at) DESC, id DESC`
    )
    .all(club.id, email);

  return rows.map(mapOrderRow);
}

export async function getOrder(clubSlug, orderId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const row = db
    .prepare(
      `SELECT * FROM orders
       WHERE club_id = ? AND order_id = ?`
    )
    .get(club.id, String(orderId));

  return mapOrderRow(row);
}

export async function updateOrderStatus(clubSlug, orderId, status) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const s = String(status || "").trim() || "NEW";

  const info = db
    .prepare(
      `UPDATE orders
       SET status = ?
       WHERE club_id = ? AND order_id = ?`
    )
    .run(s, club.id, String(orderId));

  if (info.changes === 0) return null;
  return getOrder(clubSlug, orderId);
}

export async function updateOrderPayment(clubSlug, orderId, { status, provider }) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const ps = String(status || "").trim().toUpperCase();
  const pv = provider ? String(provider).trim() : null;

  const info = db
    .prepare(
      `UPDATE orders
       SET payment_status = ?, payment_provider = ?
       WHERE club_id = ? AND order_id = ?`
    )
    .run(ps, pv, club.id, String(orderId));

  if (info.changes === 0) return null;
  return getOrder(clubSlug, orderId);
}
