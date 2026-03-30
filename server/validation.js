// server/validation.js
// Minimal, practical validation for Backend 2.0 (server assigns id + createdAt)

function isObj(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

export function validateCreateOrder(body) {
  if (!isObj(body)) throw new Error("Order must be an object");

  // buyer (recommended)
  if (!isObj(body.buyer)) throw new Error("Missing buyer");
  if (!String(body.buyer.name || "").trim()) throw new Error("Missing buyer.name");
  if (!String(body.buyer.email || "").trim()) throw new Error("Missing buyer.email");

  // items (required)
  if (!Array.isArray(body.items)) throw new Error("items must be an array");
  if (body.items.length < 1) throw new Error("items cannot be empty");

  // lightweight item checks
  for (const it of body.items) {
    if (!isObj(it)) throw new Error("Each item must be an object");
    if (!String(it.name || "").trim()) throw new Error("Item missing name");
    // price is optional-ish but should be a number if present
    if (it.price != null && Number.isNaN(Number(it.price))) {
      throw new Error("Item price must be a number");
    }
  }

  // registrations optional
  if (body.registrations != null && !Array.isArray(body.registrations)) {
    throw new Error("registrations must be an array");
  }

  // totals optional (server can accept missing)
  if (body.totals != null && !isObj(body.totals)) {
    throw new Error("totals must be an object");
  }

  // fristundastyrkur optional
  if (body.fristundastyrkur != null && !isObj(body.fristundastyrkur)) {
    throw new Error("fristundastyrkur must be an object");
  }

  return true;
}

// Dashboard dropdown statuses (keep simple)
const ALLOWED_STATUS = new Set([
  "PENDING",
  "PAID",
  "CANCELLED",
  "DEMO_NOT_PAID",
]);

export function validateStatus(status) {
  const s = String(status || "").trim();
  if (!s) throw new Error("Missing status");
  if (!ALLOWED_STATUS.has(s)) {
    throw new Error(`Invalid status. Allowed: ${Array.from(ALLOWED_STATUS).join(", ")}`);
  }
  return s;
}
