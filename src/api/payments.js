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

export function listMyPayments(clubSlug, status = "") {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return httpJson(`/api/clubs/${clubSlug}/me/payments${qs}`, { method: "GET" });
}

export function getMyPaymentsSummary(clubSlug) {
  return httpJson(`/api/clubs/${clubSlug}/me/payments/summary`, { method: "GET" });
}

export function listClubPaymentsAdmin(clubSlug, status = "") {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return httpJson(`/api/clubs/${clubSlug}/club/payments${qs}`, {
    method: "GET",
  });
}

export function markPaidAdmin(clubSlug, paymentId) {
  return httpJson(`/api/clubs/${clubSlug}/club/payments/${paymentId}/mark-paid`, {
    method: "POST",
  });
}
