// src/api/orders.js

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
   PUBLIC / CHECKOUT
   ========================== */

/**
 * Create order (guest or logged-in).
 * If logged in, backend will attach buyer_email automatically.
 */
export async function createOrder(clubSlug, payload) {
  return httpJson(`/api/clubs/${clubSlug}/orders`, {
    method: "POST",
    body: payload,
  });
}

/**
 * COMPAT ALIAS
 * Some UI imports createOrderApi; keep it working.
 */
export const createOrderApi = createOrder;

/* ==========================
   USER: MY ORDERS (requires session)
   ========================== */

export async function listMyOrders(clubSlug) {
  return httpJson(`/api/clubs/${clubSlug}/me/orders`, { method: "GET" });
}

/* ==========================
   ADMIN: ORDERS (session + staff role)
   ========================== */

export async function listOrdersAdmin(clubSlug) {
  return httpJson(`/api/clubs/${clubSlug}/orders`, {
    method: "GET",
  });
}

export async function getOrderAdmin(clubSlug, orderId) {
  return httpJson(`/api/clubs/${clubSlug}/orders/${orderId}`, {
    method: "GET",
  });
}

export async function updateOrderStatusAdmin(clubSlug, orderId, status) {
  return httpJson(`/api/clubs/${clubSlug}/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function markOrderPaid(clubSlug, orderId, provider = "demo") {
  return httpJson(`/api/clubs/${clubSlug}/orders/${orderId}/payment`, {
    method: "PATCH",
    body: { status: "PAID", provider },
  });
}
