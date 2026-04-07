import initRegistrationTables from "./db/initRegistrationTables.js";
import { registerParticipantRoutes } from "./routes/participants.js";
import "dotenv/config";
import { registerAdminRegistrationsRoutes } from "./routes/adminRegistrations.js";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOrder,
  listOrders,
  listOrdersByBuyer,
  getOrder,
  updateOrderStatus,
} from "./repo/ordersRepo.js";

import {
  initIðkendaSchema,
  getClubPublicBySlug,
  listClubsPublic,
  getSqliteDb,
} from "./sqlite.js";

import {
  listGroups,
  createGroup,
  listAthletes,
  createAthlete,
  updateAthletePhone,
  listEnrollments,
  createEnrollment,
  listPayments,
  createPayment,
  markPaymentPaid,
  listPaymentsForUser,
  listPaymentsSummaryForUser,
} from "./repo/clubAdminRepo.js";

import {
  listStaff,
  upsertStaff,
  listThreadsForUser,
  listThreadsForAdmin,
  getThreadById,
  listThreadMessages,
  getOrCreateDmThread,
  getOrCreateGroupThread,
  addMessage,
  isActiveStaffForClub,
  userHasActiveEnrollmentInGroup,
} from "./repo/messagesRepo.js";

import {
  validateCreateGroup,
  validateCreateAthlete,
  validateCreateEnrollment,
  validateCreatePayment,
} from "./validationClub.js";
import { logAudit } from "./utils/auditLog.js";
import stripe from "./utils/stripe.js";
import { markOrderPaidAndProcess } from "./services/orderProcessing.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const clientDistPath = path.join(projectRoot, "dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

const PORT = Number(process.env.PORT || 5174);
const FRONTEND_URL = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_COOKIE_NAME = String(process.env.SESSION_COOKIE_NAME || "session");
const SESSION_COOKIE_SAMESITE = String(process.env.SESSION_COOKIE_SAMESITE || "Lax");
const SESSION_COOKIE_MAX_AGE_MS = Number(
  process.env.SESSION_COOKIE_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30
);
const COOKIE_SECURE = String(process.env.SESSION_COOKIE_SECURE || "").trim();
const SESSION_COOKIE_SECURE =
  COOKIE_SECURE === ""
    ? IS_PRODUCTION
    : ["1", "true", "yes"].includes(COOKIE_SECURE.toLowerCase());
const TRUST_PROXY = Number(process.env.TRUST_PROXY || (IS_PRODUCTION ? 1 : 0));
const CORS_ORIGIN = process.env.CORS_ORIGIN || FRONTEND_URL;

if (TRUST_PROXY > 0) {
  app.set("trust proxy", TRUST_PROXY);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!IS_PRODUCTION) return callback(null, true);
      return callback(null, origin === CORS_ORIGIN);
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  if (req.path === "/api/stripe/webhook") return next();
  return express.json({ limit: "1mb" })(req, res, next);
});

// Init SQLite schema
initIðkendaSchema();
initRegistrationTables();

const bootstrapDb = getSqliteDb();
const dojoClub = bootstrapDb
  .prepare("SELECT id FROM clubs WHERE slug = ?")
  .get("dojo");

if (dojoClub) {
  bootstrapDb
    .prepare(`
      INSERT OR IGNORE INTO club_staff (club_id, email, name, active)
      VALUES (?, ?, ?, 1)
    `)
    .run(dojoClub.id, "fallegt@gmail.com", "Admin");
}

/* ==========================
   SIMPLE COOKIE PARSER (NO DEPENDENCY)
   ========================== */

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;

  header.split(";").forEach((part) => {
    const [k, ...rest] = part.split("=");
    if (!k || rest.length === 0) return;
    out[k.trim()] = decodeURIComponent(rest.join("=").trim());
  });

  return out;
}

/* ==========================
   DEMO AUTH (MAGIC CODE)
   ========================== */

const authDb = getSqliteDb();
const upsertLoginCodeStmt = authDb.prepare(`
  INSERT INTO auth_login_codes (email, code, expires_at)
  VALUES (?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    code = excluded.code,
    expires_at = excluded.expires_at,
    created_at = datetime('now')
`);
const getLoginCodeStmt = authDb.prepare(`
  SELECT email, code, expires_at
  FROM auth_login_codes
  WHERE email = ?
`);
const deleteLoginCodeStmt = authDb.prepare(`
  DELETE FROM auth_login_codes
  WHERE email = ?
`);
const pruneExpiredLoginCodesStmt = authDb.prepare(`
  DELETE FROM auth_login_codes
  WHERE expires_at < ?
`);
const insertSessionStmt = authDb.prepare(`
  INSERT INTO auth_sessions (token, email, created_at, expires_at)
  VALUES (?, ?, ?, ?)
`);
const getSessionStmt = authDb.prepare(`
  SELECT token, email, created_at, expires_at
  FROM auth_sessions
  WHERE token = ?
`);
const deleteSessionStmt = authDb.prepare(`
  DELETE FROM auth_sessions
  WHERE token = ?
`);
const pruneExpiredSessionsStmt = authDb.prepare(`
  DELETE FROM auth_sessions
  WHERE expires_at IS NOT NULL AND expires_at < ?
`);

function nowMs() {
  return Date.now();
}

function createCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createToken() {
  return crypto.randomUUID();
}

function pruneExpiredAuthRows() {
  const now = nowMs();
  pruneExpiredLoginCodesStmt.run(now);
  pruneExpiredSessionsStmt.run(now);
}

function writeSession(token, email) {
  const createdAt = new Date().toISOString();
  const expiresAt = nowMs() + SESSION_COOKIE_MAX_AGE_MS;
  insertSessionStmt.run(token, email, createdAt, expiresAt);
  return { email, createdAt, expiresAt };
}

function readSession(token) {
  if (!token) return null;
  pruneExpiredSessionsStmt.run(nowMs());
  return getSessionStmt.get(token) || null;
}

function setSessionCookie(res, token) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${SESSION_COOKIE_SAMESITE}`,
    `Max-Age=${Math.max(0, Math.floor(SESSION_COOKIE_MAX_AGE_MS / 1000))}`,
  ];

  if (SESSION_COOKIE_SECURE) {
    parts.push("Secure");
  }

  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${SESSION_COOKIE_SAMESITE}`,
    "Max-Age=0",
  ];

  if (SESSION_COOKIE_SECURE) {
    parts.push("Secure");
  }

  res.setHeader("Set-Cookie", parts.join("; "));
}

function normalizeStatusForDashboard(value) {
  const status = String(value || "").trim().toUpperCase();

  if (["PAID", "FULFILLED", "COMPLETED", "DONE"].includes(status)) return "PAID";
  if (["PENDING", "NEW", "OPEN", "CREATED"].includes(status)) return "PENDING";
  if (["CANCELLED", "CANCELED", "FAILED", "REFUNDED"].includes(status)) {
    return "CANCELLED";
  }

  return status || "UNKNOWN";
}

function formatAmountForDashboard(value) {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("is-IS", {
      style: "currency",
      currency: "ISK",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} kr.`;
  }
}

/* ==========================
   STRIPE WEBHOOK
   ========================== */

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "STRIPE_NOT_CONFIGURED" });
  }

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error", err);
    return res.sendStatus(400);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = String(session?.metadata?.orderId || "").trim();

      if (orderId) {
        const db = getSqliteDb();
        const orderRow = db
          .prepare(
            `
            SELECT club_slug, order_id
            FROM orders
            WHERE order_id = ?
            LIMIT 1
          `
          )
          .get(orderId);

        if (orderRow?.club_slug) {
          await markOrderPaidAndProcess(orderRow.club_slug, orderId, "stripe");
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error", err);
    res.status(500).json({ error: "WEBHOOK_ERROR" });
  }
});

function requireSession(req, res, next) {
  pruneExpiredAuthRows();
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  const session = readSession(token);

  if (!session) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  req.user = session;
  next();
}

function requireClubStaff(req, res, next) {
  try {
    const email = String(req.user?.email || "").trim().toLowerCase();
    const clubSlug = String(req.params.clubSlug || "").trim().toLowerCase();

    if (!email) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const ok = isActiveStaffForClub(clubSlug, email);

    if (!ok) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    req.clubRole = "staff";
    next();
  } catch (e) {
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: e?.message || "Failed",
    });
  }
}

registerAdminRegistrationsRoutes(app, requireSession, requireClubStaff);
registerParticipantRoutes(app, requireSession);

/* ==========================
   HEALTH
   ========================== */

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "karate-shop-api" });
});

/* ==========================
   CLUB PUBLIC (NEW, SAFE)
   ========================== */

app.get("/api/clubs", (req, res) => {
  try {
    const clubs = listClubsPublic();
    res.json({ clubs });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.get("/api/clubs/:clubSlug/public", (req, res) => {
  try {
    const club = getClubPublicBySlug(req.params.clubSlug);
    if (!club) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ club });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

/* ==========================
   AUTH API
   ========================== */

app.post("/api/auth/request-code", (req, res) => {
  try {
    pruneExpiredAuthRows();
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "INVALID_EMAIL" });
    }

    const code = createCode();
    const expiresAt = nowMs() + 1000 * 60 * 10;
    upsertLoginCodeStmt.run(email, code, expiresAt);

    console.log(`[LOGIN CODE] ${email}: ${code}`);
    const returnCode = String(process.env.RETURN_LOGIN_CODE || "") === "1";
    res.json(returnCode ? { ok: true, code } : { ok: true });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.post("/api/auth/verify-code", (req, res) => {
  try {
    pruneExpiredAuthRows();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    const entry = getLoginCodeStmt.get(email);
    if (!entry) return res.status(401).json({ error: "INVALID_CODE" });
    if (Number(entry.expires_at) < nowMs()) {
      deleteLoginCodeStmt.run(email);
      return res.status(401).json({ error: "CODE_EXPIRED" });
    }
    if (entry.code !== code) return res.status(401).json({ error: "INVALID_CODE" });

    deleteLoginCodeStmt.run(email);

    const token = createToken();
    writeSession(token, email);
    setSessionCookie(res, token);

    res.json({ user: { email } });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];
    if (token) deleteSessionStmt.run(token);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.get("/api/me", requireSession, (req, res) => {
  res.json({ user: { email: req.user.email } });
});

app.get("/api/clubs/:clubSlug/me/role", requireSession, (req, res) => {
  try {
    const email = String(req.user.email || "").trim().toLowerCase();
    const isStaff = isActiveStaffForClub(req.params.clubSlug, email);
    res.json({ role: isStaff ? "staff" : "user" });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

/* ==========================
   MY ATHLETES (ACCOUNT)
   ========================== */

const TAG = "me:";

app.get("/api/clubs/:clubSlug/me/athletes", requireSession, (req, res) => {
  try {
    const { clubSlug } = req.params;
    const tag = TAG + String(req.user.email || "").toLowerCase();
    const all = listAthletes(clubSlug, "");
    const mine = (all || []).filter((a) => String(a.phone || "") === tag);
    res.json({ athletes: mine });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/me/athletes", requireSession, (req, res) => {
  try {
    const { clubSlug } = req.params;
    const tag = TAG + String(req.user.email || "").toLowerCase();

    const raw = {
      first_name: req.body?.first_name,
      last_name: req.body?.last_name,
      kennitala: req.body?.kennitala,
      phone: tag,
      email: null,
    };

    const data = validateCreateAthlete(raw);
    const row = createAthlete(clubSlug, data);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid athlete" });
  }
});

app.get("/api/clubs/:clubSlug/me/payments", requireSession, (req, res) => {
  try {
    const email = String(req.user.email || "").trim().toLowerCase();
    const status = String(req.query.status || "");
    const payments = listPaymentsForUser(req.params.clubSlug, email, status);
    res.json({ payments });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.get("/api/clubs/:clubSlug/me/payments/summary", requireSession, (req, res) => {
  try {
    const email = String(req.user.email || "").trim().toLowerCase();
    const summary = listPaymentsSummaryForUser(req.params.clubSlug, email);
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

/* ==========================
   ACCOUNT CLAIM
   session based
   ========================== */

app.post("/api/clubs/:clubSlug/club/athletes/:athleteId/claim", requireSession, (req, res) => {
  try {
    const { clubSlug, athleteId } = req.params;
    const email = String(req.user?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Missing/invalid email" });
    }

    const athlete = listAthletes(clubSlug, "").find(
      (row) => String(row?.id || "") === String(athleteId)
    );
    if (!athlete) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const tag = TAG + email;
    const currentPhone = String(athlete.phone || "");
    if (currentPhone.startsWith(TAG) && currentPhone !== tag) {
      return res.status(409).json({
        error: "ALREADY_CLAIMED",
        message: "Athlete is already claimed by another account",
      });
    }

    const updated = updateAthletePhone(clubSlug, athleteId, tag);
    if (!updated) return res.status(404).json({ error: "NOT_FOUND" });

    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

/* ==========================
   ORDERS
   ========================== */

app.post("/api/clubs/:clubSlug/orders", async (req, res) => {
  try {
    let buyerEmail = null;
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];
    const session = readSession(token);

    if (session?.email) {
      buyerEmail = String(session.email || "").trim().toLowerCase();
    }

    const row = await createOrder(req.params.clubSlug, req.body, buyerEmail);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid order" });
  }
});

app.post("/api/clubs/:clubSlug/checkout/stripe", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: "STRIPE_NOT_CONFIGURED",
        message: "Stripe is not configured",
      });
    }

    const clubSlug = String(req.params.clubSlug || "").trim().toLowerCase();
    const payload = req.body || {};
    const buyerEmail = String(payload?.buyer?.email || "").trim().toLowerCase();
    const buyerName = String(payload?.buyer?.name || "").trim();
    const totalAmount = Number(payload?.totals?.total || 0);

    if (!buyerEmail || !buyerEmail.includes("@")) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Buyer email is required",
      });
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Invalid total amount",
      });
    }

    const order = await createOrder(clubSlug, payload, buyerEmail);

    const successUrl =
      `${FRONTEND_URL}/c/${clubSlug}/registration/success?orderId=${encodeURIComponent(order.order_id)}`;

    const cancelUrl =
      `${FRONTEND_URL}/c/${clubSlug}/checkout?cancelled=true`;

    const session = await stripe.checkout.sessions.create({
     payment_method_types: ["card"],
      mode: "payment",
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: "isk",
            product_data: {
              name: buyerName
                ? `Skráning - ${buyerName}`
                : "Skráning",
            },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId: String(order.order_id),
        clubSlug,
      },
    });

    res.json({
      url: session.url,
      orderId: order.order_id,
    });
  } catch (err) {
    console.error("Stripe checkout error", err);
    res.status(500).json({
      error: "STRIPE_ERROR",
      message: "Stripe error",
    });
  }
});

app.get("/api/clubs/:clubSlug/me/orders", requireSession, async (req, res) => {
  try {
    const email = String(req.user.email || "").trim().toLowerCase();
    const orders = await listOrdersByBuyer(req.params.clubSlug, email);
    res.json({ orders });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.get("/api/clubs/:clubSlug/orders", requireSession, requireClubStaff, async (req, res) => {
  try {
    res.json({ orders: await listOrders(req.params.clubSlug) });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.get("/api/clubs/:clubSlug/orders/:orderId", requireSession, requireClubStaff, async (req, res) => {
  try {
    const row = await getOrder(req.params.clubSlug, req.params.orderId);
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.patch("/api/clubs/:clubSlug/orders/:orderId/status", requireSession, requireClubStaff, async (req, res) => {
  try {
    const row = await updateOrderStatus(req.params.clubSlug, req.params.orderId, req.body?.status);
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });

    await logAudit({
      userId: req.user?.id || req.user?.email || null,
      action: "ORDER_STATUS_UPDATED",
      entityType: "order",
      entityId: req.params.orderId,
      metadata: {
        status: req.body?.status,
      },
    });

    res.json(row);
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid status" });
  }
});

app.get("/api/clubs/:clubSlug/admin/dashboard", requireSession, requireClubStaff, async (req, res) => {
  try {
    const clubSlug = req.params.clubSlug;
    const orders = await listOrders(clubSlug);
    const payments = listPayments(clubSlug, "");
    const threads = listThreadsForAdmin(clubSlug, "");

    const today = new Date().toISOString().slice(0, 10);
    const ordersToday = orders.filter((order) =>
      String(order?.created_at || "").startsWith(today)
    ).length;

    const revenueMonthValue = orders
      .filter((order) => normalizeStatusForDashboard(order?.status) === "PAID")
      .reduce((sum, order) => {
        return sum + Number(order?.total_amount || 0);
      }, 0);

    const recentOrders = orders.slice(0, 5).map((order) => ({
      id: order.id,
      title: `Pöntun #${order.id}`,
      meta: order.buyer_email || order.body?.buyer?.name || "Óþekktur kaupandi",
      badge: String(order.status || "UNKNOWN"),
    }));

    const recentMessages = threads.slice(0, 5).map((thread) => ({
      id: thread.id,
      title: thread.subject || `Þráður #${thread.id}`,
      meta: thread.user_email || thread.staff_email || "Samtal",
      badge: thread.type || "thread",
    }));

    const recentActivity = recentOrders.concat(recentMessages).slice(0, 6);

    res.json({
      stats: {
        ordersToday,
        revenueMonth: formatAmountForDashboard(revenueMonthValue),
        unreadMessages: threads.length,
        pendingPayments: payments.filter((payment) =>
          String(payment?.status || "").toLowerCase() !== "paid"
        ).length,
      },
      recentOrders,
      recentMessages,
      recentActivity,
    });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.patch("/api/clubs/:clubSlug/orders/:orderId/payment", async (req, res) => {
  try {
    const { status, provider } = req.body || {};
    if (String(status || "").toUpperCase() !== "PAID") {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Only PAID is allowed in demo" });
    }

    const result = await markOrderPaidAndProcess(
      req.params.clubSlug,
      req.params.orderId,
      provider || "demo"
    );

    res.json(result.order);
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid payment" });
  }
});

/* ==========================
   USER: list latest notifications
   ========================== */

app.get("/api/clubs/:clubSlug/notifications", requireSession, (req, res) => {
  try {
    const db = getSqliteDb();
    const userId = String(req.user?.id || req.user?.email || "").trim();

    const notifications = db
      .prepare(
        `SELECT
          id,
          user_id,
          type,
          title,
          message,
          read,
          created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT 50`
      )
      .all(userId);

    res.json({ notifications });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

/* ==========================
   CLUB ADMIN
   staff session based
   ========================== */

app.get("/api/clubs/:clubSlug/club/groups", requireSession, requireClubStaff, (req, res) => {
  try {
    res.json({ groups: listGroups(req.params.clubSlug) });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/club/groups", requireSession, requireClubStaff, (req, res) => {
  try {
    const data = validateCreateGroup(req.body);
    res.status(201).json(createGroup(req.params.clubSlug, data));
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid group" });
  }
});

app.get("/api/clubs/:clubSlug/club/athletes", requireSession, requireClubStaff, (req, res) => {
  try {
    res.json({ athletes: listAthletes(req.params.clubSlug, String(req.query.q || "")) });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/club/athletes", requireSession, requireClubStaff, (req, res) => {
  try {
    const data = validateCreateAthlete(req.body);
    res.status(201).json(createAthlete(req.params.clubSlug, data));
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid athlete" });
  }
});

app.get("/api/clubs/:clubSlug/club/enrollments", requireSession, requireClubStaff, (req, res) => {
  try {
    const athleteId = req.query.athlete_id != null ? Number(req.query.athlete_id) : null;
    res.json({ enrollments: listEnrollments(req.params.clubSlug, athleteId) });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/club/enrollments", requireSession, requireClubStaff, (req, res) => {
  try {
    const data = validateCreateEnrollment(req.body);
    res.status(201).json(createEnrollment(req.params.clubSlug, data));
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid enrollment" });
  }
});

app.get("/api/clubs/:clubSlug/club/payments", requireSession, requireClubStaff, (req, res) => {
  try {
    res.json({ payments: listPayments(req.params.clubSlug, String(req.query.status || "")) });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/club/payments", requireSession, requireClubStaff, (req, res) => {
  try {
    const data = validateCreatePayment(req.body);
    res.status(201).json(createPayment(req.params.clubSlug, data));
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid payment" });
  }
});

app.post("/api/clubs/:clubSlug/club/payments/:paymentId/mark-paid", requireSession, requireClubStaff, (req, res) => {
  try {
    const row = markPaymentPaid(req.params.clubSlug, req.params.paymentId);
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Invalid payment" });
  }
});

/* ==========================
   MESSAGES API
   ========================== */

app.get("/api/clubs/:clubSlug/me/messages/staff", requireSession, (req, res) => {
  try {
    res.json({ staff: listStaff(req.params.clubSlug) });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.get("/api/clubs/:clubSlug/me/messages/threads", requireSession, (req, res) => {
  try {
    const email = String(req.user.email || "").trim().toLowerCase();
    const q = String(req.query.q || "");
    res.json({ threads: listThreadsForUser(req.params.clubSlug, email, q) });
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

app.get("/api/clubs/:clubSlug/me/messages/threads/:threadId", requireSession, (req, res) => {
  try {
    const clubSlug = req.params.clubSlug;
    const threadId = Number(req.params.threadId);
    const email = String(req.user.email || "").trim().toLowerCase();

    const t = getThreadById(clubSlug, threadId);
    if (!t) return res.status(404).json({ error: "NOT_FOUND" });

    if (t.type === "dm") {
      if (String(t.user_email || "").toLowerCase() !== email) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }
    } else if (t.type === "group") {
      const ok = userHasActiveEnrollmentInGroup(clubSlug, email, t.group_id);
      if (!ok) return res.status(403).json({ error: "FORBIDDEN" });
    }

    res.json({ thread: t, messages: listThreadMessages(clubSlug, threadId) });
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/me/messages/dm", requireSession, (req, res) => {
  try {
    const clubSlug = req.params.clubSlug;
    const email = String(req.user.email || "").trim().toLowerCase();
    const staffEmail = String(req.body?.staff_email || "").trim().toLowerCase();
    const body = String(req.body?.body || "");

    const thread = getOrCreateDmThread(clubSlug, email, staffEmail);
    const msg = addMessage(clubSlug, {
      threadId: thread.id,
      senderType: "user",
      senderEmail: email,
      body,
    });

    res.status(201).json({ thread, message: msg });
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/me/messages/threads/:threadId/messages", requireSession, (req, res) => {
  try {
    const clubSlug = req.params.clubSlug;
    const threadId = Number(req.params.threadId);
    const email = String(req.user.email || "").trim().toLowerCase();
    const body = String(req.body?.body || "");

    const t = getThreadById(clubSlug, threadId);
    if (!t) return res.status(404).json({ error: "NOT_FOUND" });

    if (t.type === "dm") {
      if (String(t.user_email || "").toLowerCase() !== email) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }
    } else if (t.type === "group") {
      const ok = userHasActiveEnrollmentInGroup(clubSlug, email, t.group_id);
      if (!ok) return res.status(403).json({ error: "FORBIDDEN" });
    }

    const msg = addMessage(clubSlug, {
      threadId,
      senderType: "user",
      senderEmail: email,
      body,
    });

    res.status(201).json({ message: msg });
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/me/messages/groups/:groupId/messages", requireSession, (req, res) => {
  try {
    const clubSlug = req.params.clubSlug;
    const groupId = Number(req.params.groupId);
    const email = String(req.user.email || "").trim().toLowerCase();
    const body = String(req.body?.body || "");

    const ok = userHasActiveEnrollmentInGroup(clubSlug, email, groupId);
    if (!ok) return res.status(403).json({ error: "FORBIDDEN" });

    const thread = getOrCreateGroupThread(clubSlug, groupId);
    const msg = addMessage(clubSlug, {
      threadId: thread.id,
      senderType: "user",
      senderEmail: email,
      body,
    });

    res.status(201).json({ thread, message: msg });
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

/* ==========================
   ADMIN / STAFF
   session + active staff
   ========================== */

app.post("/api/clubs/:clubSlug/club/staff", requireSession, requireClubStaff, (req, res) => {
  try {
    const row = upsertStaff(req.params.clubSlug, req.body || {});
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

app.get("/api/clubs/:clubSlug/club/messages/threads", requireSession, requireClubStaff, (req, res) => {
  try {
    const q = String(req.query.q || "");
    res.json({ threads: listThreadsForAdmin(req.params.clubSlug, q) });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", message: e?.message || "Failed" });
  }
});

app.get("/api/clubs/:clubSlug/club/messages/threads/:threadId", requireSession, requireClubStaff, (req, res) => {
  try {
    const clubSlug = req.params.clubSlug;
    const threadId = Number(req.params.threadId);

    const t = getThreadById(clubSlug, threadId);
    if (!t) return res.status(404).json({ error: "NOT_FOUND" });

    res.json({ thread: t, messages: listThreadMessages(clubSlug, threadId) });
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/club/messages/threads/:threadId/messages", requireSession, requireClubStaff, (req, res) => {
  try {
    const clubSlug = req.params.clubSlug;
    const threadId = Number(req.params.threadId);
    const staffEmail = String(req.user?.email || "").trim().toLowerCase();
    const body = String(req.body?.body || "");

    const msg = addMessage(clubSlug, {
      threadId,
      senderType: "staff",
      senderEmail: staffEmail,
      body,
    });

    res.status(201).json({ message: msg });
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

app.post("/api/clubs/:clubSlug/club/messages/groups/:groupId/messages", requireSession, requireClubStaff, (req, res) => {
  try {
    const clubSlug = req.params.clubSlug;
    const groupId = Number(req.params.groupId);
    const staffEmail = String(req.user?.email || "").trim().toLowerCase();
    const body = String(req.body?.body || "");

    const thread = getOrCreateGroupThread(clubSlug, groupId);
    const msg = addMessage(clubSlug, {
      threadId: thread.id,
      senderType: "staff",
      senderEmail: staffEmail,
      body,
    });

    res.status(201).json({ thread, message: msg });
  } catch (e) {
    res.status(400).json({ error: "BAD_REQUEST", message: e?.message || "Failed" });
  }
});

if (IS_PRODUCTION && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    if (!fs.existsSync(clientIndexPath)) {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
}

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
