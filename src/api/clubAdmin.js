async function httpJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// GROUPS
export const listGroups = (clubSlug) =>
  httpJson(`/api/clubs/${clubSlug}/club/groups`);

export const createGroup = (clubSlug, body) =>
  httpJson(`/api/clubs/${clubSlug}/club/groups`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// ATHLETES
export const listAthletes = (clubSlug) =>
  httpJson(`/api/clubs/${clubSlug}/club/athletes`);

export const createAthlete = (clubSlug, body) =>
  httpJson(`/api/clubs/${clubSlug}/club/athletes`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// ENROLLMENTS
export const listEnrollments = (clubSlug) =>
  httpJson(`/api/clubs/${clubSlug}/club/enrollments`);

export const createEnrollment = (clubSlug, body) =>
  httpJson(`/api/clubs/${clubSlug}/club/enrollments`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// PAYMENTS
export const listPayments = (clubSlug) =>
  httpJson(`/api/clubs/${clubSlug}/club/payments`);

export const createPayment = (clubSlug, body) =>
  httpJson(`/api/clubs/${clubSlug}/club/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const markPaymentPaid = (clubSlug, id) =>
  httpJson(`/api/clubs/${clubSlug}/club/payments/${id}/mark-paid`, {
    method: "POST",
  });
