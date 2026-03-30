import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { listMyOrders } from "../../api/orders.js";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

function formatAmount(value) {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("is-IS", {
      style: "currency",
      currency: "ISK",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} kr`;
  }
}

export default function Orders() {
  const { clubSlug } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const nextUrl = useMemo(() => loc.pathname + (loc.search || ""), [loc.pathname, loc.search]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await listMyOrders(clubSlug);
      setRows(r?.orders || []);
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.toUpperCase().includes("UNAUTHORIZED")) {
        nav(`/c/${clubSlug}/account/login?next=${encodeURIComponent(nextUrl)}`, {
          replace: true,
        });
        return;
      }
      setErr(e?.message || "Tókst ekki að sækja kaupsögu");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">Club</div>
            <div className="text-lg font-semibold text-zinc-900">{clubSlug}</div>
            <div className="mt-1 text-sm text-gray-600">Kaupsaga</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/c/${clubSlug}`}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              ← Shop
            </Link>
            <Link
              to={`/c/${clubSlug}/account`}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Account
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {err ? (
          <div className="mb-6 rounded-2xl border bg-red-50 p-4 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xl font-bold text-zinc-900">Mín kaupsaga</div>
            <button
              onClick={load}
              className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 divide-y">
            {loading ? (
              <div className="py-6 text-sm text-gray-500">Sæki…</div>
            ) : rows.length === 0 ? (
              <div className="py-6 text-sm text-gray-500">Engar pantanir enn.</div>
            ) : (
              rows.map((o) => {
                const itemsCount = Array.isArray(o?.body?.items) ? o.body.items.length : 0;
                const total =
                  Number(o?.body?.totals?.total ?? o?.body?.total ?? 0) || 0;
                const status = String(o?.status || "NEW");
                const pay = String(o?.payment?.status || "UNPAID");
                const grant =
                  o?.body?.fristundastyrkur && typeof o.body.fristundastyrkur === "object"
                    ? o.body.fristundastyrkur
                    : null;
                const registrations = Array.isArray(o?.body?.registrations)
                  ? o.body.registrations
                  : [];

                return (
                  <div key={o.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-zinc-900">
                          {o.order_id}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {o.created_at || "—"} · {itemsCount} items
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge>Status: {status}</Badge>
                          <Badge>Payment: {pay}</Badge>
                          {grant?.requested ? <Badge>Frístundastyrkur</Badge> : null}
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-zinc-900">
                        {Number(total).toLocaleString("is-IS")} kr
                      </div>
                    </div>

                    {grant?.requested || registrations.length > 0 ? (
                      <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
                        {grant?.requested ? (
                          <div className="space-y-1">
                            <div>
                              Sveitarfélag: <span className="font-medium text-zinc-900">{grant.municipality || "—"}</span>
                            </div>
                            <div>
                              Umsótt upphæð:{" "}
                              <span className="font-medium text-zinc-900">
                                {formatAmount(grant.requestedAmount ?? grant.appliedAmount ?? 0)}
                              </span>
                            </div>
                            {grant.note ? (
                              <div>
                                Athugasemd: <span className="font-medium text-zinc-900">{grant.note}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {registrations.length > 0 ? (
                          <div className={grant?.requested ? "mt-3" : ""}>
                            <div className="font-medium text-zinc-900">Skráningar</div>
                            <div className="mt-1 space-y-1">
                              {registrations.map((registration, index) => (
                                <div key={`${registration?.productId || registration?.sku || "registration"}-${index}`}>
                                  {registration?.productName || registration?.name || `Skráning ${index + 1}`}:
                                  {" "}
                                  {registration?.athleteName || "óskráð nafn"}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
