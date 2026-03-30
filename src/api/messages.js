// src/api/messages.js
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

/* ==========================
   USER (requires session)
   ========================== */

export function listStaffMe(clubSlug) {
  return httpJson(`/api/clubs/${clubSlug}/me/messages/staff`, { method: "GET" });
}

export function listThreadsMe(clubSlug, q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return httpJson(`/api/clubs/${clubSlug}/me/messages/threads${qs}`, { method: "GET" });
}

export function getThreadMe(clubSlug, threadId) {
  return httpJson(`/api/clubs/${clubSlug}/me/messages/threads/${threadId}`, { method: "GET" });
}

export function sendDmMe(clubSlug, { staff_email, body }) {
  return httpJson(`/api/clubs/${clubSlug}/me/messages/dm`, {
    method: "POST",
    body: { staff_email, body },
  });
}

export function sendMessageMe(clubSlug, threadId, body) {
  return httpJson(`/api/clubs/${clubSlug}/me/messages/threads/${threadId}/messages`, {
    method: "POST",
    body: { body },
  });
}

export function sendGroupMessageMe(clubSlug, groupId, body) {
  return httpJson(`/api/clubs/${clubSlug}/me/messages/groups/${groupId}/messages`, {
    method: "POST",
    body: { body },
  });
}

/* ==========================
   ADMIN (session + staff role)
   ========================== */

export function upsertStaffAdmin(clubSlug, { email, name, active = 1 }) {
  return httpJson(`/api/clubs/${clubSlug}/club/staff`, {
    method: "POST",
    body: { email, name, active },
  });
}

export function listThreadsAdmin(clubSlug, q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return httpJson(`/api/clubs/${clubSlug}/club/messages/threads${qs}`, {
    method: "GET",
  });
}

export function getThreadAdmin(clubSlug, threadId) {
  return httpJson(`/api/clubs/${clubSlug}/club/messages/threads/${threadId}`, {
    method: "GET",
  });
}

export function sendMessageAdmin(clubSlug, threadId, { staff_email, body }) {
  return httpJson(`/api/clubs/${clubSlug}/club/messages/threads/${threadId}/messages`, {
    method: "POST",
    body: { staff_email, body },
  });
}

export function sendGroupMessageAdmin(clubSlug, groupId, { staff_email, body }) {
  return httpJson(`/api/clubs/${clubSlug}/club/messages/groups/${groupId}/messages`, {
    method: "POST",
    body: { staff_email, body },
  });
}

/* ==========================
   Legacy page adapters
   ========================== */

export function getMyRole(clubSlug) {
  return httpJson(`/api/clubs/${clubSlug}/me/role`, { method: "GET" });
}

export async function listStaff(clubSlug) {
  return listStaffMe(clubSlug);
}

export async function listDmThreads(clubSlug, q = "") {
  const result = await listThreadsMe(clubSlug, q);
  return {
    ...(result || {}),
    threads: Array.isArray(result?.threads)
      ? result.threads.filter((thread) => String(thread?.type || "").toLowerCase() === "dm")
      : [],
  };
}

export async function getDmThread(clubSlug, threadId) {
  return getThreadMe(clubSlug, threadId);
}

export async function createDmThread(
  clubSlug,
  { staff_email, first_message }
) {
  return sendDmMe(clubSlug, {
    staff_email,
    body: first_message,
  });
}

export async function sendDmMessage(clubSlug, threadId, body) {
  await sendMessageMe(clubSlug, threadId, body);
  return getThreadMe(clubSlug, threadId);
}

export async function listGroupThreads(clubSlug, q = "") {
  const result = await listThreadsMe(clubSlug, q);
  return {
    ...(result || {}),
    threads: Array.isArray(result?.threads)
      ? result.threads.filter((thread) => String(thread?.type || "").toLowerCase() === "group")
      : [],
  };
}

export async function getGroupThread(clubSlug, groupId) {
  const result = await listGroupThreads(clubSlug);
  const match = Array.isArray(result?.threads)
    ? result.threads.find(
        (thread) => String(thread?.group_id || "") === String(groupId)
      )
    : null;

  if (!match?.id) {
    throw new Error("NOT_FOUND");
  }

  return getThreadMe(clubSlug, match.id);
}

export async function sendGroupMessage(clubSlug, groupId, body) {
  await sendGroupMessageMe(clubSlug, groupId, body);
  return getGroupThread(clubSlug, groupId);
}
