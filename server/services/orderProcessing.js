// server/services/orderProcessing.js
import { getSqliteDb, ensureClubBySlug } from "../sqlite.js";
import { createAthlete, createPayment } from "../repo/clubAdminRepo.js";
import { getOrder, updateOrderPayment, updateOrderStatus } from "../repo/ordersRepo.js";

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function splitName(fullName) {
  const raw = String(fullName || "").trim();
  if (!raw) return { first_name: "Óþekkt", last_name: "Iðkandi" };

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first_name: parts[0], last_name: "-" };

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function normalizeEmail(email) {
  const v = String(email || "").trim().toLowerCase();
  return v.includes("@") ? v : null;
}

function findExistingRegistration(clubSlug, orderId, courseId, athleteId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  return db.prepare(`
    SELECT * FROM course_registrations
    WHERE club_slug = ?
      AND order_id = ?
      AND course_id = ?
      AND athlete_id = ?
    LIMIT 1
  `).get(
    club.slug,
    String(orderId),
    String(courseId),
    Number(athleteId)
  );
}

function createOrFindAthlete({ clubSlug, athleteName, kennitala, birthDate, buyerEmail }) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const { first_name, last_name } = splitName(athleteName);

  const existing = db.prepare(`
    SELECT * FROM athletes
    WHERE club_id = ?
      AND lower(first_name)=lower(?)
      AND lower(last_name)=lower(?)
    LIMIT 1
  `).get(club.id, first_name, last_name);

  if (existing) return existing;

  return createAthlete(clubSlug, {
    first_name,
    last_name,
    national_id: kennitala || null,
    email: normalizeEmail(buyerEmail),
    phone: buyerEmail ? `me:${buyerEmail}` : null,
    birthdate: birthDate || null,
    notes: null,
  });
}

function createCourseRegistration({ clubSlug, athleteId, orderId, paymentId, courseId, courseTitle, coursePrice }) {
  const db = getSqliteDb();

  const info = db.prepare(`
    INSERT INTO course_registrations (
      user_id,
      participant_id,
      athlete_id,
      club_slug,
      course_id,
      course_title,
      course_price,
      status,
      payment_status,
      order_id,
      payment_id,
      created_at
    )
    VALUES (0, NULL, ?, ?, ?, ?, ?, 'paid', 'paid', ?, ?, datetime('now'))
  `).run(
    athleteId,
    clubSlug,
    courseId,
    courseTitle,
    coursePrice,
    orderId,
    paymentId
  );

  return db.prepare(`SELECT * FROM course_registrations WHERE id = ?`)
    .get(info.lastInsertRowid);
}

async function processRegistrationItem(clubSlug, order, item) {
  const db = getSqliteDb();

  const orderBody = order.body || {};
  const registrations = orderBody.registrations || [];
  const reg = registrations.find(r => r.cartId === item.cartId) || {};

  const athlete = createOrFindAthlete({
    clubSlug,
    athleteName: reg.athleteName,
    kennitala: reg.kennitala,
    birthDate: reg.athleteDob,
    buyerEmail: order.buyer_email,
  });

  // DUPLICATE CHECK
  const existing = findExistingRegistration(
    clubSlug,
    order.order_id,
    item.productId,
    athlete.id
  );

  if (existing) {
    return { skipped: true, reason: "already_exists", registration: existing };
  }

  const payment = createPayment(clubSlug, {
    athlete_id: athlete.id,
    enrollment_id: null,
    title: item.name,
    amount_isk: item.price,
    due_date: null,
  });

  db.prepare(`
    UPDATE payments
    SET status='paid', paid_at=datetime('now'), reference=?
    WHERE id=?
  `).run(order.order_id, payment.id);

  const registration = createCourseRegistration({
    clubSlug,
    athleteId: athlete.id,
    orderId: order.order_id,
    paymentId: payment.id,
    courseId: item.productId,
    courseTitle: item.name,
    coursePrice: item.price,
  });

  return { athlete, payment, registration };
}

export async function processOrderAfterPayment(clubSlug, orderId) {
  const db = getSqliteDb();

  const tx = db.transaction(() => {
    const order = getOrder(clubSlug, orderId);
    if (!order) throw new Error("Order not found");

    if (order.status === "FULFILLED") {
      return { ok: true, alreadyProcessed: true, order };
    }

    const items = order.body?.items || [];
    const regItems = items.filter(i => i.type === "REGISTRATION");

    const results = [];

    for (const item of regItems) {
      const r = processRegistrationItem(clubSlug, order, item);
      results.push(r);
    }

    updateOrderStatus(clubSlug, orderId, "FULFILLED");

    return {
      ok: true,
      order: getOrder(clubSlug, orderId),
      results,
    };
  });

  return tx();
}

export async function markOrderPaidAndProcess(clubSlug, orderId, provider = "stripe") {
  await updateOrderPayment(clubSlug, orderId, {
    status: "PAID",
    provider,
  });

  return processOrderAfterPayment(clubSlug, orderId);
}
