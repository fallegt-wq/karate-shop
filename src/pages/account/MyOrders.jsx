// src/pages/account/MyOrders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getMe } from "../../api/account.js";
import { listMyOrders, getMyOrder } from "../../api/orders.js";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

function moneyGuess(order) {
  // reyna að lesa totals úr body ef til er (mismunandi payload í demo)
  const b = order?.body || {};
  const total =
    b.total ||
    b.total_amount ||
    b.totalAmount ||
    b.amount ||
    b.sum ||
    null;
  if (total == null) return null;
  const n = Number(total);
  return Number.isFinite(n) ? n : null;
}

function itemCountGuess(order) {
  const b = order?.body || {};
  const items = b.items || b.cart?.items || b.order?.items || null;
  if (Array.isArray(items)) return items.length;
  return null;
}

export default function MyOrders() {
  const { clubSlug } = useParams();
  const [sp, setSp] = useSearchParams();

  const selectedId = sp.get("id") || "";

  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingOne, setLoadingOne] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [meR, listR] = await Promise.all([getMe(), listMyOrders(clubSlug)]);
      setMe(meR?.user || null);
      setOrders(listR?.orders || []);
    } catch (e) {
      setErr(e?.message || "Tókst ekki að sækja kaupsögu");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function openOrder(id) {
    if (!id) {
      setSelected(null);
      return;
    }
    setLoadingOne(true);
    setErr("");
    try {
      const r = await getMyOrder(clubSlug, id);
      setSelected(r || null);
    } catch (e) {
      setErr(e?.message || "Tókst ekki að opna pöntun");
      setSelected(null);
    } finally {
      setLoadingOne(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug]);

  useEffect(() => {
    openOrder(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, clubSlug]);

  const sorted = useMemo(() => {
    return [...(orders || [])].sort((a, b) => {
      const da = String(a.created_at || "");
      const db = String(b.created_at || "");
      if (da > db) return -1;
      if (da < db) return 1;
      return Number(b.id) - Number(a.id);
    });
  }, [orders]);

  function pick(id) {
    const next = new URLSearchParams(sp);
    if (id) next.set("id", String(id));
    else next.delete("id");
    setSp(next);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500">Club</div>
              <div className="text-lg font-semibold text-zinc-900">{clubSlug}</div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>Orders</Badge>
                {me?.email ? (
                  <span className="text-sm text-gray-700">
                    Innskráður: <span className="font-semibold">{me.email}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/c/${clubSlug}/account/athletes`}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                ← Account
              </Link>
              <Link
                to={`/c/${clubSlug}`}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                ← Shop
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {err ? (
          <div className="mb-6 rounded-2xl border bg-red-50 p-4 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Sæki kaupsögu…</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* List */}
            <aside className="md:col-span-5 lg:col-span-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-zinc-900">Kaupsaga</div>
                  <button
                    onClick={refresh}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                </div>

                {sorted.length === 0 ? (
                  <div className="mt-3 text-sm text-gray-600">
                    Engar pantanir tengdar þínum aðgangi enn.
                    <div className="mt-2 text-xs text-gray-500">
                      Ath: pantanir sem voru gerðar án innskráningar birtast ekki hér.
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {sorted.map((o) => {
                      const isSel = String(o.order_id) === String(selectedId);
                      const amount = moneyGuess(o);
                      const cnt = itemCountGuess(o);

                      return (
                        <button
                          key={o.order_id}
                          onClick={() => pick(o.order_id)}
                          className={[
                            "w-full text-left rounded-2xl border p-3 hover:bg-gray-50",
                            isSel ? "border-zinc-900" : "",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-900 truncate">
                                Order <span className="font-mono">#{o.order_id}</span>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {o.created_at}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge>Status: {o.status}</Badge>
                                <Badge>Payment: {o.payment?.status || "—"}</Badge>
                                {cnt != null ? <Badge>Items: {cnt}</Badge> : null}
                                {amount != null ? <Badge>Total: {amount}</Badge> : null}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            {/* Details */}
            <section className="md:col-span-7 lg:col-span-8">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                {!selectedId ? (
                  <div className="text-sm text-gray-600">
                    Veldu pöntun vinstra megin til að sjá nánar.
                  </div>
                ) : loadingOne ? (
                  <div className="text-sm text-gray-500">Opna pöntun…</div>
                ) : !selected ? (
                  <div className="text-sm text-gray-600">Pöntun fannst ekki.</div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-gray-500">Order</div>
                        <div className="text-xl font-bold text-zinc-900">
                          <span className="font-mono">#{selected.order_id}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Created: {selected.created_at}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>Status: {selected.status}</Badge>
                        <Badge>Payment: {selected.payment?.status || "—"}</Badge>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="text-sm font-semibold text-zinc-900">Raw payload</div>
                      <div className="mt-2 rounded-2xl border bg-gray-50 p-3 text-xs overflow-auto">
                        <pre>{JSON.stringify(selected.body || {}, null, 2)}</pre>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        (Í næsta skrefi getum við “formattað” þetta fallega: línur, vörur, upphæðir o.s.frv.)
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
