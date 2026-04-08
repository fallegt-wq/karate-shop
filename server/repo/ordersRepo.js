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

function hasColumn(db, tableName, columnName) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return cols.some((c) => String(c.name || "") === columnName);
  } catch {
    return false;
  }
}

function mapOrderRow(row) {
  if (!row) return null;

  const rawBody = row.body_json ?? row.order_json ?? null;
  const body = safeJsonParse(rawBody) || {};

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
    receipt_email: {
      sent_at: row.receipt_email_sent_at || null,
      error: row.receipt_email_error || null,
    },
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

  const bodyJson = safeJsonStringify(payload);

  const orderHasTotalAmount = hasColumn(db, "orders", "total_amount");
  const orderHasBodyJson = hasColumn(db, "orders", "body_json");
  const orderHasOrderJson = hasColumn(db, "orders", "order_json");
  const orderHasReceiptSentAt = hasColumn(db, "orders", "receipt_email_sent_at");
  const orderHasReceiptError = hasColumn(db, "orders", "receipt_email_error");

  const columns = [
    "club_id",
    "club_slug",
    "order_id",
    "status",
    "payment_status",
    "payment_provider",
    "buyer_email",
  ];
  const values = [
    club.id,
    String(clubSlug || "").trim().toLowerCase(),
    orderId,
    "CREATED",
    "UNPAID",
    null,
    buyerEmail,
  ];
  const placeholders = ["?", "?", "?", "?", "?", "?", "?"];

  if (orderHasTotalAmount) {
    columns.push("total_amount");
    values.push(totalAmount);
    placeholders.push("?");
  }

  if (orderHasBodyJson) {
    columns.push("body_json");
    values.push(bodyJson);
    placeholders.push("?");
  }

  if (orderHasOrderJson) {
    columns.push("order_json");
    values.push(bodyJson);
    placeholders.push("?");
  }

  if (orderHasReceiptSentAt) {
    columns.push("receipt_email_sent_at");
    values.push(null);
    placeholders.push("?");
  }

  if (orderHasReceiptError) {
    columns.push("receipt_email_error");
    values.push(null);
    placeholders.push("?");
  }

  columns.push("created_at");
  placeholders.push("datetime('now')");

  db.prepare(
    `
    INSERT INTO orders (
      ${columns.join(", ")}
    )
    VALUES (${placeholders.join(", ")})
    `
  ).run(...values);

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

export async function markOrderReceiptSent(clubSlug, orderId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const info = db
    .prepare(
      `
      UPDATE orders
      SET receipt_email_sent_at = datetime('now'),
          receipt_email_error = NULL
      WHERE club_id = ? AND order_id = ?
      `
    )
    .run(club.id, String(orderId || "").trim());

  if (info.changes === 0) return null;
  return getOrder(clubSlug, orderId);
}

export async function markOrderReceiptFailed(clubSlug, orderId, errorMessage) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const message =
    String(errorMessage || "").trim().slice(0, 1000) || "Unknown email error";

  const info = db
    .prepare(
      `
      UPDATE orders
      SET receipt_email_error = ?
      WHERE club_id = ? AND order_id = ?
      `
    )
    .run(message, club.id, String(orderId || "").trim());

  if (info.changes === 0) return null;
  return getOrder(clubSlug, orderId);
}
