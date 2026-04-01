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
  if (!raw) {
    return { first_name: "Óþekkt", last_name: "Iðkandi" };
  }

  const parts = raw.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "-" };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function normalizeEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return value && value.includes("@") ? value : null;
}

function normalizeNationalId(value) {
  const v = String(value || "").trim();
  return v || null;
}

function normalizeBirthdate(value) {
  const v = String(value || "").trim();
  return v || null;
}

function findAthleteByNationalId(clubSlug, nationalId) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);
  const nid = normalizeNationalId(nationalId);
  if (!nid) return null;

  return db
    .prepare(
      `
      SELECT *
      FROM athletes
      WHERE club_id = ?
        AND national_id = ?
      ORDER BY id DESC
      LIMIT 1
    `
    )
    .get(club.id, nid);
}

function findAthleteByNameAndBirthdate(clubSlug, fullName, birthdate) {
  const db = getSqliteDb();
  const club = ensureClubBySlug(clubSlug);
  const bd = normalizeBirthdate(birthdate);
  const { first_name, last_name } = splitName(fullName);

  return db
    .prepare(
      `
      SELECT *
      FROM athletes
      WHERE club_id = ?
        AND lower(first_name) = lower(?)
        AND lower(last_name) = lower(?)
        AND coalesce(birthdate, '') = coalesce(?, '')
      ORDER BY id DESC
      LIMIT 1
    `
    )
    .get(club.id, first_name, last_name, bd);
}

function createOrFindAthlete({
  clubSlug,
  athleteName,
  kennitala,
  birthDate,
  buyerEmail,
  guardianName,
  notes,
}) {
  const byNationalId = findAthleteByNationalId(clubSlug, kennitala);
  if (byNationalId) return byNationalId;

  const byNameAndBirthdate = findAthleteByNameAndBirthdate(
    clubSlug,
    athleteName,
    birthDate
  );
  if (byNameAndBirthdate) return byNameAndBirthdate;

  const { first_name, last_name } = splitName(athleteName);
  const email = normalizeEmail(buyerEmail);

  return createAthlete(clubSlug, {
    first_name,
    last_name,
    national_id: normalizeNationalId(kennitala),
    email,
    phone: email ? `me:${email}` : null,
    birthdate: normalizeBirthdate(birthDate),
    notes: [guardianName ? `Forráðamaður: ${guardianName}` : null, notes || null]
      .filter(Boolean)
      .join(" | "),
  });
}

function createCourseRegistration({
  clubSlug,
  athleteId,
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
        club_slug,
        course_id,
        course_title,
        course_price,
        status,
        payment_status,
        athlete_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, datetime('now'))
    `
    )
    .run(
      0,
      0,
      String(clubSlug || "").trim().toLowerCase(),
      String(courseId || "").trim(),
      String(courseTitle || "").trim(),
      Number(coursePrice || 0),
      Number(athleteId)
    );

  return db
    .prepare(`SELECT * FROM course_registrations WHERE id = ?`)
    .get(info.lastInsertRowid);
}

function markRegistrationPaid(registrationId) {
  const db = getSqliteDb();

  db.prepare(
    `
    UPDATE course_registrations
    SET payment_status = 'paid',
        status = 'paid'
    WHERE id = ?
  `
  ).run(Number(registrationId));

  return db
    .prepare(`SELECT * FROM course_registrations WHERE id = ?`)
    .get(Number(registrationId));
}

function extractRegistrationInput(orderBody, item) {
  const registrations = Array.isArray(orderBody?.registrations)
    ? orderBody.registrations
    : [];

  const match = registrations.find(
    (r) => String(r?.cartId || "") === String(item?.cartId || "")
  );

  return match || {};
}

function isRegistrationItem(item) {
  return String(item?.type || "").toUpperCase() === "REGISTRATION";
}

function ensurePaid(order) {
  const status = String(order?.payment?.status || "").toUpperCase();
  if (status !== "PAID") {
    throw new Error("Order is not paid");
  }
}

function ensureNotFulfilled(order) {
  const status = String(order?.status || "").toUpperCase();
  if (status === "FULFILLED") {
    return false;
  }
  return true;
}

function mapPaymentTitle(item, registrationInput) {
  return (
    registrationInput?.productName ||
    item?.name ||
    item?.courseTitle ||
    "Námskeið"
  );
}

function mapCourseId(item, registrationInput) {
  return (
    registrationInput?.productId ||
    item?.productId ||
    item?.id ||
    ""
  );
}

async function processRegistrationItem(clubSlug, order, item) {
  const orderBody = order?.body || {};
  const registrationInput = extractRegistrationInput(orderBody, item);
  const buyerEmail =
    order?.buyer_email || orderBody?.buyer?.email || null;

  const athleteName = registrationInput?.athleteName;
  const athleteDob = registrationInput?.athleteDob || registrationInput?.birthDate || null;
  const guardianName = registrationInput?.guardianName || "";
  const notes = registrationInput?.notes || "";
  const kennitala =
    registrationInput?.kennitala ||
    registrationInput?.athleteKennitala ||
    null;

  if (!athleteName) {
    throw new Error("Registration item missing athleteName");
  }

  const athlete = createOrFindAthlete({
    clubSlug,
    athleteName,
    kennitala,
    birthDate: athleteDob,
    buyerEmail,
    guardianName,
    notes,
  });

  const registration = createCourseRegistration({
    clubSlug,
    athleteId: athlete.id,
    courseId: mapCourseId(item, registrationInput),
    courseTitle: mapPaymentTitle(item, registrationInput),
    coursePrice: Number(item?.price || 0),
  });

  const payment = createPayment(clubSlug, {
    athlete_id: athlete.id,
    enrollment_id: null,
    title: mapPaymentTitle(item, registrationInput),
    amount_isk: Number(item?.price || 0),
    due_date: null,
  });

  const db = getSqliteDb();
  db.prepare(
    `
    UPDATE payments
    SET status = 'paid',
        paid_at = datetime('now'),
        method = ?,
        reference = ?
    WHERE id = ?
  `
  ).run(
    order?.payment?.provider || "order_checkout",
    String(order?.order_id || ""),
    Number(payment.id)
  );

  const paidRegistration = markRegistrationPaid(registration.id);

  return {
    athlete,
    registration: paidRegistration,
    payment: db.prepare(`SELECT * FROM payments WHERE id = ?`).get(Number(payment.id)),
  };
}

export async function processOrderAfterPayment(clubSlug, orderId) {
  const order = await getOrder(clubSlug, orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  ensurePaid(order);

  const shouldContinue = ensureNotFulfilled(order);
  if (!shouldContinue) {
    return {
      ok: true,
      alreadyProcessed: true,
      order,
      results: [],
    };
  }

  const orderBody =
    order?.body && typeof order.body === "object"
      ? order.body
      : safeJsonParse(order?.body_json) || {};

  const items = Array.isArray(orderBody?.items) ? orderBody.items : [];
  const registrationItems = items.filter(isRegistrationItem);

  const results = [];

  for (const item of registrationItems) {
    const result = await processRegistrationItem(clubSlug, order, item);
    results.push(result);
  }

  await updateOrderStatus(clubSlug, orderId, "FULFILLED");

  const updatedOrder = await getOrder(clubSlug, orderId);

  return {
    ok: true,
    alreadyProcessed: false,
    order: updatedOrder,
    results,
  };
}

export async function markOrderPaidAndProcess(clubSlug, orderId, provider = "demo") {
  const updated = await updateOrderPayment(clubSlug, orderId, {
    status: "PAID",
    provider,
  });

  if (!updated) {
    throw new Error("Order not found");
  }

  return processOrderAfterPayment(clubSlug, orderId);
}
