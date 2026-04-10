import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getOrderPublic } from "../api/orders";
import { useCart } from "../context/CartContext";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function formatISK(value) {
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

function normalizeUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function isOrderReady(order) {
  if (!order) return false;

  const paymentStatus = normalizeUpper(order.payment_status);
  const status = normalizeUpper(order.status);

  return paymentStatus === "PAID" || status === "FULFILLED";
}

function getStatusLabel(order, loading) {
  if (loading) return "Klára skráningu...";
  if (!order) return "Pöntun fannst ekki";

  const paymentStatus = normalizeUpper(order.payment_status);
  const status = normalizeUpper(order.status);

  if (status === "FULFILLED") return "Skráning kláruð";
  if (paymentStatus === "PAID") return "Greiðsla staðfest";
  if (paymentStatus === "UNPAID") return "Bíð eftir staðfestingu";
  return "Vinn í pöntun";
}

const CHECKOUT_PENDING_STORAGE_KEY = "checkout_pending_order";

export default function RegistrationSuccessPage() {
  const { clubSlug } = useParams();
  const query = useQuery();
  const orderId = query.get("orderId");
  const { clear } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");

  const didCleanupRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    async function load() {
      if (!orderId) {
        setError("Vantar orderId.");
        setLoading(false);
        return;
      }

      try {
        const data = await getOrderPublic(clubSlug, orderId);
        if (cancelled) return;

        setOrder(data);
        setError("");

        if (isOrderReady(data)) {
          setLoading(false);
          return;
        }

        if (attempts < 12) {
          timeoutId = window.setTimeout(() => {
            setAttempts((prev) => prev + 1);
          }, 1000);
          return;
        }

        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Gat ekki sótt pöntun.");
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [clubSlug, orderId, attempts]);

  useEffect(() => {
    if (!isOrderReady(order)) return;
    if (didCleanupRef.current) return;

    didCleanupRef.current = true;

    try {
      clear();
    } catch {
      // ignore cart clear failure
    }

    try {
      sessionStorage.removeItem(CHECKOUT_PENDING_STORAGE_KEY);
    } catch {
      // ignore storage failure
    }
  }, [order, clear]);

  const registrations = useMemo(() => {
    if (!order?.registrations?.length) return [];

    return order.registrations.map((reg, index) => ({
      id: reg.cartId || `${index}`,
      productName: reg.productName || "Námskeið",
      athleteName: reg.athleteName || "Óskráð nafn iðkanda",
      athleteDob: reg.athleteDob || "",
      guardianName: reg.guardianName || "",
      notes: reg.notes || "",
      kennitala: reg.kennitala || "",
    }));
  }, [order]);

  const items = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <div className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <div className="mb-4 text-3xl">✅</div>

            <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
              Greiðsla móttekin
            </h1>

            <div className="mt-3 text-sm font-semibold text-zinc-600">
              {getStatusLabel(order, loading)}
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-zinc-500">
                Kerfið er að staðfesta greiðslu og klára skráningu.
              </div>
            ) : null}

            {error ? (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl border bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          {order ? (
            <>
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Pöntun
                  </div>
                  <div className="mt-1 break-all font-semibold text-zinc-900">
                    {order.order_id}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Netfang
                  </div>
                  <div className="mt-1 font-semibold text-zinc-900">
                    {order.buyer_email || "Óþekkt"}
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    Samtals
                  </div>
                  <div className="mt-1 font-semibold text-zinc-900">
                    {formatISK(order.total_amount)}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border p-5">
                  <div className="text-lg font-semibold text-zinc-900">
                    Vörur og skráningar
                  </div>

                  {!items.length ? (
                    <div className="mt-4 text-sm text-zinc-500">
                      Engar línur fundust í pöntun.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {items.map((item, index) => (
                        <div
                          key={item.cartId || `${item.productId || "item"}-${index}`}
                          className="rounded-2xl bg-zinc-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-zinc-900">
                                {item.name || "Ónefnd vara"}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                                {item.type || "ITEM"}
                              </div>
                            </div>

                            <div className="shrink-0 text-sm font-semibold text-zinc-900">
                              {formatISK(item.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border p-5">
                  <div className="text-lg font-semibold text-zinc-900">
                    Iðkendur
                  </div>

                  {!registrations.length ? (
                    <div className="mt-4 text-sm text-zinc-500">
                      Engar registration upplýsingar fundust.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {registrations.map((reg) => (
                        <div key={reg.id} className="rounded-2xl bg-zinc-50 p-4">
                          <div className="text-sm font-semibold text-zinc-900">
                            {reg.athleteName}
                          </div>

                          <div className="mt-1 text-sm text-zinc-600">
                            {reg.productName}
                          </div>

                          {reg.athleteDob ? (
                            <div className="mt-2 text-xs text-zinc-500">
                              Fæðingardagur: {reg.athleteDob}
                            </div>
                          ) : null}

                          {reg.guardianName ? (
                            <div className="mt-1 text-xs text-zinc-500">
                              Forráðamaður: {reg.guardianName}
                            </div>
                          ) : null}

                          {reg.notes ? (
                            <div className="mt-1 text-xs text-zinc-500">
                              Athugasemdir: {reg.notes}
                            </div>
                          ) : null}

                          {reg.kennitala ? (
                            <div className="mt-1 text-xs text-zinc-500">
                              Kennitala: {reg.kennitala}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="mt-8 rounded-2xl border bg-green-50 p-4 text-sm text-green-800">
                {isOrderReady(order)
                  ? "Greiðsla hefur verið staðfest, karfan hefur verið tæmd og skráning er komin í vinnslu eða fullkláruð í kerfinu."
                  : "Greiðslan virðist hafa farið í gegn, en kerfið er enn að klára síðustu skrefin."}
              </div>
            </>
          ) : null}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to={`/c/${clubSlug}`}
              className="inline-flex items-center justify-center rounded-2xl border bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Til baka á forsíðu félags
            </Link>

            <Link
              to={`/c/${clubSlug}/account/orders`}
              className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
            >
              Skoða pantanir
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
