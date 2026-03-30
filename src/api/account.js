// src/api/account.js
async function httpJson(url, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // IMPORTANT: session cookie
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      `Request failed (${res.status} ${res.statusText})`;
    throw new Error(msg);
  }

  return json;
}

/* ==========================
   AUTH / ME
   ========================== */

export async function getMe() {
  return httpJson("/api/me", { method: "GET" });
}

/* ==========================
   MY ATHLETES (requires session)
   ========================== */

export async function listMyAthletes(clubSlug) {
  return httpJson(`/api/clubs/${clubSlug}/me/athletes`, { method: "GET" });
}

export async function createMyAthlete(clubSlug, { first_name, last_name, kennitala }) {
  return httpJson(`/api/clubs/${clubSlug}/me/athletes`, {
    method: "POST",
    body: { first_name, last_name, kennitala },
  });
}

/* ==========================
   CLAIM (session-based account flow)
   - We fetch claimables via the existing club athlete list
   - Claiming now relies on the signed-in session, not a browser admin key
   ========================== */

export async function listClubAthletesAdmin(clubSlug, q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return httpJson(`/api/clubs/${clubSlug}/club/athletes${qs}`, {
    method: "GET",
  });
}

export async function claimAthleteAdmin(clubSlug, athleteId) {
  return httpJson(`/api/clubs/${clubSlug}/club/athletes/${athleteId}/claim`, {
    method: "POST",
  });
}
