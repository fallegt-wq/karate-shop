// server/validationClub.js

function isObj(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

export function validateCreateGroup(body) {
  if (!isObj(body)) throw new Error("Body must be an object");
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Missing name");
  const description = body.description != null ? String(body.description) : null;
  return { name, description };
}

export function validateCreateAthlete(body) {
  if (!isObj(body)) throw new Error("Body must be an object");
  const first_name = String(body.first_name || "").trim();
  const last_name = String(body.last_name || "").trim();
  if (!first_name) throw new Error("Missing first_name");
  if (!last_name) throw new Error("Missing last_name");

  const national_id = body.national_id != null ? String(body.national_id) : null;
  const email = body.email != null ? String(body.email) : null;
  const phone = body.phone != null ? String(body.phone) : null;
  const birthdate = body.birthdate != null ? String(body.birthdate) : null;
  const notes = body.notes != null ? String(body.notes) : null;

  return { first_name, last_name, national_id, email, phone, birthdate, notes };
}

export function validateCreateEnrollment(body) {
  if (!isObj(body)) throw new Error("Body must be an object");

  const athlete_id = Number(body.athlete_id);
  const group_id = Number(body.group_id);

  if (!Number.isInteger(athlete_id) || athlete_id <= 0) throw new Error("Invalid athlete_id");
  if (!Number.isInteger(group_id) || group_id <= 0) throw new Error("Invalid group_id");

  const reason = body.reason != null ? String(body.reason) : null;
  const close_existing = body.close_existing === false ? false : true;
  const start_date = body.start_date != null ? String(body.start_date) : null;

  return { athlete_id, group_id, reason, close_existing, start_date };
}

export function validateCreatePayment(body) {
  if (!isObj(body)) throw new Error("Body must be an object");

  const athlete_id = Number(body.athlete_id);
  if (!Number.isInteger(athlete_id) || athlete_id <= 0) throw new Error("Invalid athlete_id");

  const title = String(body.title || "").trim();
  if (!title) throw new Error("Missing title");

  const amount_isk = Number(body.amount_isk);
  if (!Number.isInteger(amount_isk) || amount_isk < 0) throw new Error("Invalid amount_isk");

  const enrollment_id =
    body.enrollment_id != null ? Number(body.enrollment_id) : null;
  if (enrollment_id != null && (!Number.isInteger(enrollment_id) || enrollment_id <= 0)) {
    throw new Error("Invalid enrollment_id");
  }

  const due_date = body.due_date != null ? String(body.due_date) : null;

  return { athlete_id, enrollment_id, title, amount_isk, due_date };
}
