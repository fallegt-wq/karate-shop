// src/pages/ClubDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ClubShell from "../components/layout/ClubShell";
import { listOrdersApi, updateOrderStatusApi } from "../api/orders";

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

function formatCurrency(n) {
  const v = Number(n || 0);
  return `$${v}`;
}

function friendlyLoginAs(v) {
  if (v === "PARTICIPANT") return "Iðkandi (18 ára)";
  if (v === "GUARDIAN") return "Forráðamaður";
  return "—";
}

function toneForGrantStatus(status) {
  if (!status) return "default";
  const s = String(status);
  if (s.includes("STADFEST")) return "good";
  if (s.includes("OSKAD")) return "warn";
  return "default";
}

function normalizeOrders(payload) {
  // Styður:
  // - { orders: [...] }
  // - [...]
  // - { data: { orders: [...] } } (ef þú endar þar)
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.orders)) return payload.orders;
  if (payload && payload.data && Array.isArray(payload.data.orders)) return payload.data.orders;
  return [];
}

export default function ClubDashboard() {
  const { clubSlug } = useParams();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError("");
        setLoading(true);

        const payload = await listOrdersApi(clubSlug);
        const list = normalizeOrders(payload);

        if (!alive) return;
        setOrders(list);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to fetch");
        setOrders([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [clubSlug, refreshKey]);

  const sorted = useMemo(() => {
    // nýjust efst
    return [...orders].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [orders]);

  async function setStatus(orderId, status) {
    try {
      setError("");
      await updateOrderStatusApi(clubSlug, orderId, status);
      // sækja aftur
      setRefreshKey((x) => x + 1);
    } catch (e) {
      setError(e?.message || "Failed to update status");
    }
  }

  return (
    <ClubShell
      clubSlug={clubSlug}
      cartCount={0}
      title="ClubDashboard"
      subtitle="Orders, registrations & frístundastyrkur"
      rightSlot={
        <Link
          to={`/c/${clubSlug}`}
          className="hidden md:inline-flex items-center rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          ← Back to shop
        </Link>
      }
    >
      <div className="md:hidden mb-4">
        <Link
          to={`/c/${clubSlug}`}
          className="inline-flex items-center rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          ← Back to shop
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-zinc-500">
              Orders:{" "}
              <span className="font-semibold text-zinc-900">
                {loading ? "…" : sorted.length}
              </span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Orders are stored on the server (SQLite/JSON) behind <b>/api</b>.
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to={`/c/${clubSlug}/checkout`}
              className="rounded-2xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Go to checkout
            </Link>

            <button
              onClick={() => setRefreshKey((x) => x + 1)}
              className="rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {/* Orders */}
      <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-zinc-500">Orders</div>
        <div className="mt-1 text-lg font-semibold text-zinc-900">Latest orders</div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
            Loading…
          </div>
        ) : !sorted.length ? (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
            No orders yet. Go to checkout and click <b>Staðfesta og senda</b>.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {sorted.map((o) => {
              const grant = o.fristundastyrkur || {};
              const usedGrant = grant.requested === true;

              const status = grant.status || (usedGrant ? "OSKAD_DEMO" : "EKKI_OSKAD");
              const statusTone = toneForGrantStatus(status);

              const municipality = grant.municipality || "—";
              const applied = grant.appliedAmount ?? 0;
              const eligibleSubtotal = grant.eligibleSubtotal ?? 0;

              const eid = grant.eid || {};
              const eidVerified = eid.verified ?? false;
              const loginAs = eid.loginAs ?? "";

              const paymentStatus = o.payment?.status || o.status || "PENDING";

              return (
                <div key={o.id} className="rounded-2xl border p-5">
                  <Link
                    to={`/c/${clubSlug}/club/orders/${o.id}`}
                    className="block hover:underline"
                    title="Open order details"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-500">
                          {o.createdAt} • <span className="font-semibold">{o.id}</span>
                        </div>

                        <div className="mt-2">
                          <div className="font-semibold text-zinc-900">
                            {o.buyer?.name || "—"}
                          </div>
                          <div className="text-sm text-zinc-600">
                            {o.buyer?.email || "—"}
                            {o.buyer?.phone ? ` • ${o.buyer.phone}` : ""}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge>{paymentStatus}</Badge>

                          {usedGrant ? (
                            <>
                              <Badge tone={statusTone}>{status}</Badge>
                              <Badge>{municipality}</Badge>
                              <Badge tone={eidVerified ? "good" : "warn"}>
                                Rafrænt: {eidVerified ? "staðfest" : "ekki staðfest"}
                              </Badge>
                              <Badge>{friendlyLoginAs(loginAs)}</Badge>
                            </>
                          ) : (
                            <Badge>Frístundastyrkur: ekki notað</Badge>
                          )}
                        </div>

                        {usedGrant ? (
                          <div className="mt-3 space-y-1 text-sm text-zinc-700">
                            <div>
                              <span className="font-semibold">Upphæð:</span>{" "}
                              {formatCurrency(applied)}{" "}
                              <span className="text-zinc-500">
                                (styrkhæft samtals {formatCurrency(eligibleSubtotal)})
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-sm text-zinc-500">Total</div>
                        <div className="text-lg font-semibold text-red-700">
                          {formatCurrency(o.totals?.total ?? 0)}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          Subtotal: {formatCurrency(o.totals?.subtotal ?? 0)}
                          {usedGrant ? (
                            <>
                              {" "}
                              • Discount: {formatCurrency(o.totals?.fristundastyrkurDiscount ?? 0)}
                            </>
                          ) : null}
                        </div>
                        <div className="mt-2 text-xs font-semibold text-zinc-600">
                          Click to open →
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Status controls */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="text-xs font-semibold text-zinc-500">Set status:</div>

                    <button
                      className="rounded-2xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                      onClick={() => setStatus(o.id, "PAID")}
                      type="button"
                    >
                      Mark as PAID
                    </button>

                    <button
                      className="rounded-2xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                      onClick={() => setStatus(o.id, "CANCELLED")}
                      type="button"
                    >
                      Cancel
                    </button>

                    <button
                      className="rounded-2xl border bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50"
                      onClick={() => setStatus(o.id, "PENDING")}
                      type="button"
                    >
                      Set PENDING
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ClubShell>
  );
}
