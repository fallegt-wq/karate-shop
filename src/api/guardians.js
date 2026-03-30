// src/api/guardians.js
async function httpJson(url, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
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

export async function listAthleteGuardians(clubSlug, athleteId) {
  return httpJson(`/api/clubs/${clubSlug}/me/athletes/${athleteId}/guardians`, {
    method: "GET",
  });
}

export async function addAthleteGuardian(clubSlug, athleteId, payload) {
  return httpJson(`/api/clubs/${clubSlug}/me/athletes/${athleteId}/guardians`, {
    method: "POST",
    body: payload,
  });
}
