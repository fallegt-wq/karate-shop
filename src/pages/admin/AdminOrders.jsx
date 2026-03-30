import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

function formatAmount(value) {
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

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat("is-IS", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return String(value);
  }
}

function getOrderBody(order) {
  return order?.body && typeof order.body === "object" ? order.body : {};
}

function getOrderGrant(order) {
  const grant = getOrderBody(order)?.fristundastyrkur;
  return grant && typeof grant === "object" ? grant : null;
}

function getOrderRegistrations(order) {
  const registrations = getOrderBody(order)?.registrations;
  return Array.isArray(registrations) ? registrations : [];
}

function getOrderSummary(order) {
  const body = getOrderBody(order);
  const items = Array.isArray(body.items) ? body.items : [];

  if (order?.item_summary || order?.note || order?.notes) {
    return order.item_summary || order.note || order.notes;
  }

  if (items.length > 0) {
    return items
      .map((item) => item?.name || item?.title || item?.sku)
      .filter(Boolean)
      .join(", ");
  }

  return "Engin lýsing skráð á þessa pöntun.";
}

function getOrderAmount(order) {
  const body = getOrderBody(order);
  return (
    order?.total_amount ||
    order?.total ||
    order?.amount ||
    body?.totals?.total ||
    body?.total ||
    0
  );
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toUpperCase();

  if (["PAID", "FULFILLED", "COMPLETED", "DONE"].includes(status)) return "PAID";
  if (["PENDING", "NEW", "OPEN", "CREATED"].includes(status)) return "PENDING";
  if (["CANCELLED", "CANCELED", "FAILED", "REFUNDED"].includes(status)) return "CANCELLED";

  return status || "UNKNOWN";
}

function statusLabel(status) {
  const value = normalizeStatus(status);

  if (value === "PAID") return "Greitt / lokið";
  if (value === "PENDING") return "Í vinnslu";
  if (value === "CANCELLED") return "Hætt við";

  return value;
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "PAID") return "bg-green-100 text-green-800";
  if (value === "PENDING") return "bg-amber-100 text-amber-800";
  if (value === "CANCELLED") return "bg-red-100 text-red-800";

  return "bg-gray-100 text-gray-700";
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        {value}
      </div>
      {subtitle ? (
        <div className="mt-2 text-sm text-gray-600">{subtitle}</div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="text-base font-semibold text-zinc-900">{title}</div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-2xl border border-dashed bg-gray-50 p-6 text-center">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
      <div className="mx-auto mt-2 max-w-xl text-sm text-gray-600">{body}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function OrderRow({ order, onSelect }) {
  const grant = getOrderGrant(order);
  const registrations = getOrderRegistrations(order);

  return (
    <button
      type="button"
      onClick={() => onSelect(order)}
      className="block w-full rounded-xl border p-4 text-left transition hover:bg-gray-50"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold text-zinc-900">
              Pöntun #{order.id}
            </div>
            <span
              className={[
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                statusClass(order.status),
              ].join(" ")}
            >
              {statusLabel(order.status)}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-700">
            {order.buyer_name || "Óþekktur kaupandi"}
          </div>

          {order.buyer_email ? (
            <div className="mt-1 text-sm text-gray-500">{order.buyer_email}</div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            {grant?.requested ? (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                Frístundastyrkur
              </span>
            ) : null}
            {registrations.length > 0 ? (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {registrations.length} skráning
                {registrations.length === 1 ? "" : "ar"}
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-sm text-gray-500">
            Stofnað: {formatDate(order.created_at || order.createdAt)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-900">Samantekt</div>
          <div className="mt-1 text-sm text-gray-600">{getOrderSummary(order)}</div>
        </div>

        <div className="xl:w-40 xl:text-right">
          <div className="text-sm text-gray-500">Upphæð</div>
          <div className="mt-1 text-lg font-bold text-zinc-900">
            {formatAmount(getOrderAmount(order))}
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b py-3 md:grid-cols-[180px_minmax(0,1fr)] md:gap-4">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="min-w-0 text-sm text-zinc-900">{value || "—"}</div>
    </div>
  );
}

function OrderDetails({
  order,
  onClose,
  actionLoading,
  actionError,
  onMarkPaid,
  onCancelOrder,
}) {
  if (!order) return null;

  const grant = getOrderGrant(order);
  const registrations = getOrderRegistrations(order);

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-base font-semibold text-zinc-900">
            Pöntun #{order.id}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Detail view fyrir næstu admin skref
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Loka
        </button>
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              statusClass(order.status),
            ].join(" ")}
          >
            {statusLabel(order.status)}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {formatAmount(getOrderAmount(order))}
          </span>
          {grant?.requested ? (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              Frístundastyrkur óskaður
            </span>
          ) : null}
        </div>

        <div className="rounded-xl border px-4">
          <DetailRow label="Pöntunarnúmer" value={order.id} />
          <DetailRow
            label="Kaupandi"
            value={order.buyer_name || order.customer_name || order.name}
          />
          <DetailRow label="Netfang" value={order.buyer_email} />
          <DetailRow label="Staða" value={statusLabel(order.status)} />
          <DetailRow
            label="Stofnað"
            value={formatDate(order.created_at || order.createdAt)}
          />
          <DetailRow label="Lýsing" value={getOrderSummary(order)} />
        </div>

        <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">Frístundastyrkur</div>
          <div className="mt-3 rounded-xl border bg-white px-4">
            <DetailRow
              label="Óskað eftir styrk"
              value={grant?.requested ? "Já" : "Nei"}
            />
            <DetailRow label="Sveitarfélag" value={grant?.municipality} />
            <DetailRow
              label="Umsótt upphæð"
              value={
                grant?.requested
                  ? formatAmount(grant?.requestedAmount ?? grant?.appliedAmount ?? 0)
                  : "—"
              }
            />
            <DetailRow
              label="Hámarksgrunnur"
              value={
                grant?.eligibleSubtotal != null
                  ? formatAmount(grant.eligibleSubtotal)
                  : "—"
              }
            />
            <DetailRow label="Staða styrks" value={grant?.status} />
            <DetailRow label="Athugasemd" value={grant?.note} />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">Skráningar / iðkendur</div>
          {registrations.length === 0 ? (
            <div className="mt-3 text-sm text-gray-600">
              Engar skráningar eða iðkendaupplýsingar fylgdu þessari pöntun.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {registrations.map((registration, index) => (
                <div
                  key={`${registration?.productId || registration?.sku || "registration"}-${index}`}
                  className="rounded-xl border bg-white p-4"
                >
                  <div className="text-sm font-semibold text-zinc-900">
                    {registration?.productName || registration?.name || `Skráning ${index + 1}`}
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <div>Nafn iðkanda: {registration?.athleteName || "—"}</div>
                    <div>Fæðingardagur: {registration?.athleteDob || "—"}</div>
                    <div>Forráðamaður: {registration?.guardianName || "—"}</div>
                    <div>Tegund: {registration?.type || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">Aðgerðir</div>
          <div className="space-y-2 border-t pt-4">
            <button
              type="button"
              onClick={onMarkPaid}
              disabled={actionLoading.paid || order.status === "PAID"}
              className="w-full rounded-xl bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading.paid
                ? "Updating..."
                : order.status === "PAID"
                ? "Already PAID"
                : "Mark as PAID"}
            </button>

            <button
              type="button"
              onClick={onCancelOrder}
              disabled={actionLoading.cancelled || order.status === "CANCELLED"}
              className="w-full rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading.cancelled
                ? "Updating..."
                : order.status === "CANCELLED"
                ? "Already CANCELLED"
                : "Mark as CANCELLED"}
            </button>
          </div>

          {actionError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          ) : (
            <div className="mt-3 text-sm text-gray-600">
              Uppfærðu stöðu pöntunar beint héðan án þess að fara af síðunni.
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">Næsta skref</div>
          <div className="mt-1 text-sm text-gray-600">
            Hér getum við næst bætt inn payment state, order lines og fullu
            detail workflow fyrir afgreiðslu.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const { clubSlug } = useParams();

  const [status, setStatus] = useState("loading");
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState({
    paid: false,
    cancelled: false,
  });
  const [actionError, setActionError] = useState("");

  async function fetchOrders() {
    try {
      const res = await fetch(`/api/clubs/${clubSlug}/orders`, {
        credentials: "include",
      });
      const data = await res.json();
      const rows = Array.isArray(data?.orders) ? data.orders : [];

      setOrders(rows);
      setSelectedOrder((prev) =>
        prev ? rows.find((order) => order.id === prev.id) || rows[0] || null : rows[0] || null
      );
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    let alive = true;

    async function loadOrders() {
      setStatus("loading");

      try {
        const res = await fetch(`/api/clubs/${clubSlug}/orders`, {
          credentials: "include",
        });

        if (!alive) return;

        const data = await res.json();
        const rows = Array.isArray(data?.orders) ? data.orders : [];

        setOrders(rows);
        setSelectedOrder(rows[0] || null);
      } catch (error) {
        console.error(error);

        if (!alive) return;

        setOrders([]);
        setSelectedOrder(null);
      } finally {
        if (!alive) return;
        setStatus("ready");
      }
    }

    loadOrders();

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  function updateOrderInState(updatedOrder) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );

    setSelectedOrder((prev) =>
      prev && prev.id === updatedOrder.id ? updatedOrder : prev
    );
  }

  async function handleStatusChange(nextStatus) {
    if (!selectedOrder?.id) return;

    const key = nextStatus === "PAID" ? "paid" : "cancelled";
    const previousOrder = selectedOrder;

    setActionError("");
    setActionLoading((prev) => ({
      ...prev,
      [key]: true,
    }));

    try {
      const optimisticOrder = { ...previousOrder, status: nextStatus };
      updateOrderInState(optimisticOrder);

      const res = await fetch(
        `/api/clubs/${clubSlug}/orders/${previousOrder.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to update order status");
      }

      const updatedOrder = await res.json();
      updateOrderInState(updatedOrder);
    } catch (error) {
      console.error("Order status update failed", error);
      setActionError(error?.message || "Ekki tókst að uppfæra stöðu pöntunar.");
      fetchOrders();
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [key]: false,
      }));
    }
  }

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((order) => {
      const orderStatus = normalizeStatus(order.status);

      if (filter !== "ALL" && orderStatus !== filter) {
        return false;
      }

      if (!q) {
        return true;
      }

      const haystack = [
        order.id,
        order.buyer_name,
        order.buyer_email,
        order.customer_name,
        order.name,
        getOrderSummary(order),
        getOrderGrant(order)?.municipality,
        getOrderGrant(order)?.note,
        ...getOrderRegistrations(order).flatMap((registration) => [
          registration?.productName,
          registration?.athleteName,
          registration?.guardianName,
        ]),
        order.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [orders, query, filter]);

  const stats = useMemo(() => {
    const pending = orders.filter(
      (order) => normalizeStatus(order.status) === "PENDING"
    ).length;
    const paid = orders.filter(
      (order) => normalizeStatus(order.status) === "PAID"
    ).length;
    const cancelled = orders.filter(
      (order) => normalizeStatus(order.status) === "CANCELLED"
    ).length;

    return {
      total: orders.length,
      pending,
      paid,
      cancelled,
    };
  }, [orders]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Hleð pöntunum…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Admin pantanir</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Pantanir fyrir {clubSlug}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Hér getur staff séð allar pantanir fyrir klúbbinn, leitað í þeim og
              skoðað detail upplýsingar í sama stíl og admin dashboardið.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={`/c/${clubSlug}/admin`}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Til baka í admin
            </Link>
            <Link
              to={`/c/${clubSlug}`}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Opna klúbbssíðu
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Allar pantanir"
          value={stats.total}
          subtitle="Heildarfjöldi pantana"
        />
        <StatCard
          title="Í vinnslu"
          value={stats.pending}
          subtitle="Pantanir sem bíða eftirfylgni"
        />
        <StatCard
          title="Greitt / lokið"
          value={stats.paid}
          subtitle="Pantanir í lokastöðu"
        />
        <StatCard
          title="Hætt við"
          value={stats.cancelled}
          subtitle="Felldar niður eða endurgreiddar"
        />
      </div>

      <SectionCard title="Leit og síur">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Leita í pöntunum
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Leita eftir nafni, netfangi, pöntunarnúmeri eða stöðu"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Staða
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="ALL">Allt</option>
              <option value="PENDING">Í vinnslu</option>
              <option value="PAID">Greitt / lokið</option>
              <option value="CANCELLED">Hætt við</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard
          title="Pöntunarlisti"
          action={
            <span className="text-sm text-gray-500">
              {filteredOrders.length} sýndar
            </span>
          }
        >
          {filteredOrders.length === 0 ? (
            <EmptyState
              title="Engar pantanir fundust"
              body={
                orders.length === 0
                  ? "Engar pantanir komu frá API-inu. Það getur þýtt að engar pantanir séu til enn eða að schema-ið þurfi næst að kortleggja nánar."
                  : "Engar pantanir passa við núverandi leit eða síu."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order, index) => (
                <OrderRow
                  key={order.id != null ? order.id : `order-${index}`}
                  order={order}
                  onSelect={setSelectedOrder}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Pöntunardetails"
          action={
            selectedOrder ? (
              <span className="text-sm text-gray-500">
                Valin pöntun #{selectedOrder.id}
              </span>
            ) : null
          }
        >
          {selectedOrder ? (
            <OrderDetails
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              actionLoading={actionLoading}
              actionError={actionError}
              onMarkPaid={() => handleStatusChange("PAID")}
              onCancelOrder={() => handleStatusChange("CANCELLED")}
            />
          ) : (
            <EmptyState
              title="Veldu pöntun"
              body="Smelltu á pöntun í listanum til að sjá nánari upplýsingar hægra megin."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
