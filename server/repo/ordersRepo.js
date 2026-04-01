// server/repo/ordersRepo.js
import crypto from "node:crypto";
import { getSqliteDb, ensureClubBySlug } from "../sqlite.js";

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ raw: String(value) });
  }
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return value && value.includes("@") ? value : null;
}

function normalizeStatus(value, fallback = "NEW") {
  const status = String(value || "").trim().toUpperCase();
  return status || fallback;
}

function normalizePaymentStatus(value, fallback = "UNPAID") {
  const status = String(value || "").trim().toUpperCase();
  return status || fallback;
}

function extractBuyerEmail(body, sessionBuyerEmail = null) {
  const fromSession = normalizeEmail(sessionBuyerEmail);
  if (fromSession) return fromSession;

  const fromBody =
    normalizeEmail(body?.buyer?.email) ||
    normalizeEmail(body?.buyer_email) ||
    normalizeEmail(body?.email);

  return fromBody;
}

function extractTotalAmount(body) {
  const candidates = [
    body?.totals?.total,
    body?.total_amount,
    body?.total,
    body?.amount,
  ];

  for (const candidate of candidates) {
    const amount = Number(candidate);
    if (Number.isFinite(amount)) return amount;
  }

  return 0;
}

function mapOrderRow(row) {
  if (!row) return null;

  const body = safeJsonParse(row.body_json) || {};

  return {
    id: row.id,
    club_id: row.club_id,
    club_slug: row.club_slug,
    order_id: row.order_id,
    status: row.status,
    payment: {
      status: row.payment_status,
      provider: row.payment_provider || null,
    },
    buyer_email: row.buyer_email || null,
    total_amount: Number(row.total_amount || 0),
    body,
    created_at: row.created_at,
  };
}

export async function createOrder(clubSlug, body = {}, sessionBuyerEmail = null) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const orderId =
    String(body?.order_id || body?.orderId || "").trim() || crypto.randomUUID();

  const buyerEmail = extractBuyerEmail(body, sessionBuyerEmail);
  const totalAmount = extractTotalAmount(body);

  const payload = {
    ...body,
    order_id: orderId,
    clubSlug: String(clubSlug || "").trim().toLowerCase(),
    buyer: {
      ...(body?.buyer || {}),
      email: buyerEmail,
    },
  };

  db.prepare(
    `
    INSERT INTO orders (
      club_id,
      club_slug,
      order_id,
      status,
      payment_status,
      payment_provider,
      buyer_email,
      total_amount,
      body_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `
  ).run(
    club.id,
    String(clubSlug || "").trim().toLowerCase(),
    orderId,
    "CREATED",
    "UNPAID",
    null,
    buyerEmail,
    totalAmount,
    safeJsonStringify(payload)
  );

  const row = db
    .prepare(
      `
      SELECT *
      FROM orders
      WHERE club_id = ? AND order_id = ?
    `
    )
    .get(club.id, orderId);

  return mapOrderRow(row);
}

export async function listOrders(clubSlug) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const rows = db
    .prepare(
      `
      SELECT *
      FROM orders
      WHERE club_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
    `
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
      `
      SELECT *
      FROM orders
      WHERE club_id = ?
        AND lower(coalesce(buyer_email, '')) = ?
      ORDER BY datetime(created_at) DESC, id DESC
    `
    )
    .all(club.id, email);

  return rows.map(mapOrderRow);
}

export async function getOrder(clubSlug, orderId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const row = db
    .prepare(
      `
      SELECT *
      FROM orders
      WHERE club_id = ? AND order_id = ?
    `
    )
    .get(club.id, String(orderId || "").trim());

  return mapOrderRow(row);
}

export async function updateOrderStatus(clubSlug, orderId, status) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);
  const nextStatus = normalizeStatus(status, "CREATED");

  const info = db
    .prepare(
      `
      UPDATE orders
      SET status = ?
      WHERE club_id = ? AND order_id = ?
    `
    )
    .run(nextStatus, club.id, String(orderId || "").trim());

  if (info.changes === 0) return null;
  return getOrder(clubSlug, orderId);
}

export async function updateOrderPayment(clubSlug, orderId, { status, provider } = {}) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);
  const paymentStatus = normalizePaymentStatus(status, "UNPAID");
  const paymentProvider = provider ? String(provider).trim() : null;

  const info = db
    .prepare(
      `
      UPDATE orders
      SET payment_status = ?,
          payment_provider = ?
      WHERE club_id = ? AND order_id = ?
    `
    )
    .run(
      paymentStatus,
      paymentProvider,
      club.id,
      String(orderId || "").trim()
    );

  if (info.changes === 0) return null;
  return getOrder(clubSlug, orderId);
}
