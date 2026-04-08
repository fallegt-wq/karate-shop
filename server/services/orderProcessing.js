// server/services/orderProcessing.js
import { getSqliteDb, ensureClubBySlug } from "../sqlite.js";
import { createAthlete, createPayment } from "../repo/clubAdminRepo.js";
import {
  getOrder,
  updateOrderPayment,
  updateOrderStatus,
  markOrderReceiptSent,
  markOrderReceiptFailed,
} from "../repo/ordersRepo.js";
import { sendOrderReceiptEmail } from "../utils/email.js";

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

  return db
    .prepare(
      `
      SELECT *
      FROM course_registrations
      WHERE club_slug = ?
        AND order_id = ?
        AND course_id = ?
        AND athlete_id = ?
      LIMIT 1
    `
    )
    .get(club.slug, String(orderId), String(courseId), Number(athleteId));
}

function createOrFindAthlete({
  clubSlug,
  athleteName,
  kennitala,
  birthDate,
  buyerEmail,
}) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);

  const { first_name, last_name } = splitName(athleteName);

  const existing = db
    .prepare(
      `
      SELECT *
      FROM athletes
      WHERE club_id = ?
        AND lower(first_name) = lower(?)
        AND lower(last_name) = lower(?)
      LIMIT 1
    `
    )
    .get(club.id, first_name, last_name);

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

function createCourseRegistration({
  clubSlug,
  athleteId,
  orderId,
  paymentId,
  courseId,
  courseTitle,
  coursePrice,
}) {
  const db = getSqliteDb();

  const info = db
    .prepare(
      `
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
    `
    )
    .run(
      athleteId,
      clubSlug,
      courseId,
      courseTitle,
      coursePrice,
      orderId,
      paymentId
    );

  return db
    .prepare(`SELECT * FROM course_registrations WHERE id = ?`)
    .get(info.lastInsertRowid);
}

function processRegistrationItem(clubSlug, order, item) {
  const db = getSqliteDb();

  const orderBody = order.body || {};
  const registrations = Array.isArray(orderBody.registrations)
    ? orderBody.registrations
    : [];
  const reg =
    registrations.find(
      (r) => String(r?.cartId || "") === String(item?.cartId || "")
    ) || {};

  const athlete = createOrFindAthlete({
    clubSlug,
    athleteName: reg.athleteName,
    kennitala: reg.kennitala,
    birthDate: reg.athleteDob,
    buyerEmail: order.buyer_email,
  });

  const existing = findExistingRegistration(
    clubSlug,
    order.order_id,
    item.productId,
    athlete.id
  );

  if (existing) {
    return {
      skipped: true,
      reason: "already_exists",
      registration: existing,
    };
  }

  const payment = createPayment(clubSlug, {
    athlete_id: athlete.id,
    enrollment_id: null,
    title: item.name,
    amount_isk: item.price,
    due_date: null,
  });

  db.prepare(
    `
    UPDATE payments
    SET status = 'paid',
        paid_at = datetime('now'),
        reference = ?,
        method = ?
    WHERE id = ?
  `
  ).run(
    order.order_id,
    order?.payment?.provider || "stripe",
    payment.id
  );

  const registration = createCourseRegistration({
    clubSlug,
    athleteId: athlete.id,
    orderId: order.order_id,
    paymentId: payment.id,
    courseId: item.productId,
    courseTitle: item.name,
    coursePrice: item.price,
  });

  return {
    athlete,
    payment,
    registration,
  };
}

export async function processOrderAfterPayment(clubSlug, orderId) {
  const db = getSqliteDb();

  const tx = db.transaction(() => {
    const order = getOrder(clubSlug, orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (String(order?.status || "").toUpperCase() === "FULFILLED") {
      return {
        ok: true,
        alreadyProcessed: true,
        order,
        results: [],
      };
    }

    const items = Array.isArray(order?.body?.items) ? order.body.items : [];
    const regItems = items.filter(
      (i) => String(i?.type || "").toUpperCase() === "REGISTRATION"
    );

    const results = [];

    for (const item of regItems) {
      const result = processRegistrationItem(clubSlug, order, item);
      results.push(result);
    }

    updateOrderStatus(clubSlug, orderId, "FULFILLED");

    return {
      ok: true,
      alreadyProcessed: false,
      order: getOrder(clubSlug, orderId),
      results,
    };
  });

  return tx();
}

async function ensureReceiptEmailSent(clubSlug, order) {
  if (!order) {
    return { ok: false, skipped: true, reason: "missing_order" };
  }

  const alreadySent = Boolean(order?.receipt_email?.sent_at);
  if (alreadySent) {
    return { ok: true, skipped: true, reason: "already_sent" };
  }

  const buyerEmail = String(order?.buyer_email || "").trim();
  if (!buyerEmail || !buyerEmail.includes("@")) {
    return { ok: false, skipped: true, reason: "missing_buyer_email" };
  }

  try {
    const sendResult = await sendOrderReceiptEmail(order);

    if (sendResult?.ok) {
      await markOrderReceiptSent(clubSlug, order.order_id);
    }

    return sendResult;
  } catch (error) {
    const message = error?.message || "Email send failed";
    await markOrderReceiptFailed(clubSlug, order.order_id, message);
    console.error("Receipt email error", error);

    return {
      ok: false,
      skipped: false,
      reason: "send_failed",
      error: message,
    };
  }
}

export async function markOrderPaidAndProcess(
  clubSlug,
  orderId,
  provider = "stripe"
) {
  await updateOrderPayment(clubSlug, orderId, {
    status: "PAID",
    provider,
  });

  const result = await processOrderAfterPayment(clubSlug, orderId);
  const latestOrder = await getOrder(clubSlug, orderId);

  await ensureReceiptEmailSent(clubSlug, latestOrder);

  return {
    ...result,
    order: await getOrder(clubSlug, orderId),
  };
}
