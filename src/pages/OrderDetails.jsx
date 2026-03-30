// src/pages/OrderDetails.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ClubShell from "../components/layout/ClubShell";
import { getOrderApi, updateOrderStatusApi } from "../api/orders";

function Money({ v }) {
  return <span className="font-semibold text-zinc-900">${Number(v || 0)}</span>;
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <div className="text-zinc-600">{label}</div>
      <div className="font-semibold text-zinc-900 text-right">{value}</div>
    </div>
  );
}

function Badge({ children, tone = "default" }) {
  const cls =
    tone === "good"
      ? "border-green-200 bg-green-50 text-green-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "bad"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-zinc-200 bg-white text-zinc-700";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        cls,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function toneForStatus(s) {
  const v = String(s || "").toUpperCase();
  if (v === "PAID") return "good";
  if (v === "CANCELLED") return "bad";
  return "default";
}

export default function OrderDetails() {
  const { clubSlug, orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await getOrderApi(clubSlug, orderId);
      setOrder(data || null);
    } catch (e) {
      setOrder(null);
      setError(e?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");
        setLoading(true);
        const data = await getOrderApi(clubSlug, orderId);
        if (!alive) return;
        setOrder(data || null);
      } catch (e) {
        if (!alive) return;
        setOrder(null);
        setError(e?.message || "Failed to load order");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [clubSlug, orderId]);

  async function setStatus(nextStatus) {
    try {
      setStatusError("");
      setStatusBusy(true);
      await updateOrderStatusApi(clubSlug, orderId, nextStatus);
      await load();
    } catch (e) {
      setStatusError(e?.message || "Failed to update status");
    } finally {
      setStatusBusy(false);
    }
  }

  const paymentStatus = order?.payment?.status || order?.status || "PENDING";
  const statusTone = toneForStatus(paymentStatus);

  return (
    <ClubShell
      clubSlug={clubSlug}
      cartCount={0}
      title="Order details"
      subtitle={orderId}
      rightSlot={
        <Link
          to={`/c/${clubSlug}/club`}
          className="hidden md:inline-flex items-center rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          ← Back to dashboard
        </Link>
      }
    >
      <div className="md:hidden mb-4">
        <Link
          to={`/c/${clubSlug}/club`}
          className="inline-flex items-center rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          ← Back to dashboard
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm text-sm text-zinc-700">
          Loading…
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">{error}</div>
          <div className="mt-2 text-sm text-zinc-600">
            This order ID does not exist on the server for this club.
          </div>
        </div>
      ) : !order ? (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Order not found</div>
          <div className="mt-2 text-sm text-zinc-600">
            This order ID does not exist on the server for this club.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT */}
          <section className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">
                    Buyer
                  </div>
                  <div className="mt-2 text-lg font-semibold text-zinc-900">
                    {order.buyer?.name || "—"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    {order.buyer?.email || "—"}
                    {order.buyer?.phone ? ` • ${order.buyer.phone}` : ""}
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">
                    Created: {order.createdAt}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">
                    Order status
                  </div>
                  <div className="mt-2">
                    <Badge tone={statusTone}>{paymentStatus}</Badge>
                  </div>
                </div>
              </div>

              {/* Admin/demo status buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={statusBusy}
                  className={[
                    "rounded-2xl px-4 py-2 text-sm font-semibold text-white",
                    statusBusy ? "bg-zinc-300" : "bg-emerald-700 hover:bg-emerald-800",
                  ].join(" ")}
                  onClick={() => setStatus("PAID")}
                >
                  Mark as PAID
                </button>

                <button
                  type="button"
                  disabled={statusBusy} 

                  className={[
                    "rounded-2xl px-4 py-2 text-sm font-semibold text-white",
                    statusBusy ? "bg-zinc-300" : "bg-zinc-900 hover:bg-zinc-800",
                  ].join(" ")}
                  onClick={() => setStatus("CANCELLED")}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={statusBusy}
                  className={[
                    "rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50",
                    statusBusy ? "opacity-60" : "",
                  ].join(" ")}
                  onClick={() => setStatus("PENDING")}
                >
                  Set PENDING
                </button>
              </div>

              {statusError ? (
                <div className="mt-3 rounded-2xl border bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {statusError}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Items
              </div>
              <div className="mt-3 space-y-3">
                {(order.items || []).map((it) => (
                  <div
                    key={it.cartId || `${it.productId}-${it.name}`}
                    className="rounded-2xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-500">
                          {it.type} • {it.category || "—"}
                        </div>
                        <div className="font-semibold text-zinc-900 truncate">
                          {it.name}
                        </div>
                        {it.type === "REGISTRATION" ? (
                          <div className="mt-1 text-xs text-zinc-500">
                            vikur: {Number(it.durationWeeks || 0)}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <Money v={it.price} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(order.registrations || []).length ? (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  Registrations
                </div>
                <div className="mt-3 space-y-3">
                  {order.registrations.map((r) => (
                    <div key={r.cartId} className="rounded-2xl border p-4">
                      <div className="font-semibold text-zinc-900">
                        {r.productName}
                      </div>
                      <div className="mt-2 text-sm text-zinc-700 space-y-1">
                        <div>
                          Iðkandi: <b>{r.athleteName || "—"}</b>
                        </div>
                        <div>
                          Fæðingardagur: <b>{r.athleteDob || "—"}</b>
                        </div>
                        <div>
                          Forráðamaður: <b>{r.guardianName || "—"}</b>
                        </div>
                        {r.notes ? (
                          <div>
                            Athugasemdir: <b>{r.notes}</b>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* RIGHT */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  Totals
                </div>
                <div className="mt-3 border-t pt-3">
                  <Row label="Subtotal" value={<Money v={order.totals?.subtotal} />} />
                  <Row label="Fees" value={<Money v={order.totals?.fee} />} />
                  <Row
                    label="Frístundastyrkur"
                    value={
                      <span className="font-semibold text-zinc-900">
                        -${Number(order.totals?.fristundastyrkurDiscount || 0)}
                      </span>
                    }
                  />
                  <div className="mt-2 border-t pt-3 flex items-center justify-between">
                    <div className="text-base font-semibold text-zinc-900">
                      Total
                    </div>
                    <div className="text-base font-semibold text-red-700">
                      ${Number(order.totals?.total || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment CTA (demo) */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  Payment
                </div>
                <div className="mt-2 text-sm text-zinc-700">
                  Þetta er demo greiðsluflæði. Seinna tengjum við greiðslugátt.
                </div>

                <button
                  type="button"
                  className="mt-4 w-full rounded-2xl bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800"
                  onClick={() =>
                    alert("Greiðsla (demo) – hér myndi greiðslugátt opnast.")
                  }
                >
                  Staðfesta og greiða
                </button>

                <div className="mt-3 text-xs text-zinc-500">
                  (Demo) Þetta breytir ekki status sjálfkrafa — notaðu “Mark as PAID” til að prófa.
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  Frístundastyrkur
                </div>
                <div className="mt-2 text-sm text-zinc-700 space-y-2">
                  <div>
                    Requested:{" "}
                    <b>{String(order.fristundastyrkur?.requested ?? false)}</b>
                  </div>
                  <div>
                    Municipality:{" "}
                    <b>{order.fristundastyrkur?.municipality || "—"}</b>
                  </div>
                  <div>
                    Eligible subtotal:{" "}
                    <b>${Number(order.fristundastyrkur?.eligibleSubtotal || 0)}</b>
                  </div>
                  <div>
                    Applied:{" "}
                    <b>${Number(order.fristundastyrkur?.appliedAmount || 0)}</b>
                  </div>
                  <div>
                    Status: <b>{order.fristundastyrkur?.status || "—"}</b>
                  </div>
                  <div>
                    LoginAs:{" "}
                    <b>{order.fristundastyrkur?.eid?.loginAs || "—"}</b>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </ClubShell>
  );
}
