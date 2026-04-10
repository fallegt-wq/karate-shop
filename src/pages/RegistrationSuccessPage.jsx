// src/pages/RegistrationSuccessPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getOrderPublic } from "../api/orders";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function isOrderReady(order) {
  if (!order) return false;

  const paymentStatus = String(order.payment_status || "").toUpperCase();
  const status = String(order.status || "").toUpperCase();

  return paymentStatus === "PAID" || status === "FULFILLED";
}

export default function RegistrationSuccessPage() {
  const { clubSlug } = useParams();
  const query = useQuery();

  const orderId = query.get("orderId");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const data = await getOrderPublic(clubSlug, orderId);

        if (cancelled) return;

        setOrder(data);

        // 🔥 ef order er tilbúin → hætta polling
        if (isOrderReady(data)) {
          setLoading(false);
          return;
        }

        // 🔁 retry (max ~10 sek)
        if (attempts < 10) {
          setTimeout(() => {
            setAttempts((a) => a + 1);
          }, 1000);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [clubSlug, orderId, attempts]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-8 text-center">

          <div className="text-2xl mb-4">✅</div>

          <h1 className="text-2xl font-bold mb-3">
            Greiðsla staðfest
          </h1>

          {loading && (
            <div className="text-sm text-gray-600 mt-4">
              Klára skráningu...
            </div>
          )}

          {!loading && order && (
            <>
              <div className="mt-4 text-sm text-gray-600">
                <div>Pöntun: {order.order_id}</div>
                <div>Netfang: {order.buyer_email}</div>
                <div>Upphæð: {order.total_amount} kr.</div>
              </div>

              <div className="mt-6 text-left">
                <div className="font-semibold mb-2">Skráningar:</div>
                <ul className="space-y-2">
                  {(order.items || []).map((i, idx) => (
                    <li key={idx} className="border rounded p-2">
                      {i.name} — {i.price} kr.
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {!loading && !order && (
            <div className="text-red-600 mt-4 text-sm">
              Gat ekki sótt pöntun.
            </div>
          )}

          <div className="mt-8 flex gap-3 justify-center">
            <Link to={`/c/${clubSlug}`} className="btn">
              Til baka
            </Link>

            <Link to={`/c/${clubSlug}/account/orders`} className="btn-outline">
              Pantanir
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
