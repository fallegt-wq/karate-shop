// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useParams } from "react-router-dom";

import Shop from "./pages/Shop.jsx";
import Checkout from "./pages/Checkout.jsx";

import ClubDashboard from "./pages/ClubDashboard.jsx";
import OrderDetails from "./pages/OrderDetails.jsx";
import ClubAdmin from "./pages/club/ClubAdmin.jsx";

import Login from "./pages/Login.jsx";
import MyAthletes from "./pages/account/MyAthletes.jsx";
import Messages from "./pages/account/Messages.jsx";

/* ==========================
   INLINE RequireSession (no extra file import)
   ========================== */
function RequireSession({ children }) {
  const { clubSlug } = useParams();
  const loc = useLocation();
  const [ok, setOk] = useState(null); // null = loading, true/false

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { method: "GET", credentials: "include" });
        if (!alive) return;
        setOk(res.ok);
      } catch {
        if (!alive) return;
        setOk(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (ok === null) return null;

  if (!ok) {
    const next = loc.pathname + (loc.search || "");
    return (
      <Navigate
        to={`/c/${clubSlug}/account/login?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  return children;
}

/* ==========================
   INLINE AccountHome (no extra file import)
   ========================== */
function AccountHome() {
  const { clubSlug } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">Club</div>
            <div className="text-lg font-semibold text-zinc-900">{clubSlug}</div>
            <div className="mt-1 text-sm text-gray-600">Mitt svæði</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/c/${clubSlug}`}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              ← Shop
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-bold text-zinc-900">Yfirlit</div>
          <div className="mt-2 text-sm text-gray-600">
            Hér er aðgangur að þjónustu (iðkendur/forsjá) og skilaboðum. Vörur er hægt að kaupa án innskráningar.
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to={`/c/${clubSlug}/account/athletes`}
              className="block rounded-2xl border bg-white p-5 shadow-sm hover:bg-gray-50 transition"
            >
              <div className="text-lg font-bold text-zinc-900">Iðkendur</div>
              <div className="mt-1 text-sm text-gray-600">My athletes + claim.</div>
            </Link>

            <Link
              to={`/c/${clubSlug}/account/messages`}
              className="block rounded-2xl border bg-white p-5 shadow-sm hover:bg-gray-50 transition"
            >
              <div className="text-lg font-bold text-zinc-900">Skilaboð</div>
              <div className="mt-1 text-sm text-gray-600">Einkaskilaboð og hópskilaboð.</div>
            </Link>
          </div>

          <div className="mt-6">
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                window.location.href = `/c/${clubSlug}`;
              }}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/c/test" replace />} />

        {/* Public shop */}
        <Route path="/c/:clubSlug" element={<Shop />} />
        <Route path="/c/:clubSlug/checkout" element={<Checkout />} />

        {/* Club admin (óbreytt) */}
        <Route path="/c/:clubSlug/club" element={<ClubDashboard />} />
        <Route path="/c/:clubSlug/club/*" element={<ClubAdmin />} />
        <Route path="/c/:clubSlug/club/orders/:orderId" element={<OrderDetails />} />

        {/* Login */}
        <Route path="/c/:clubSlug/account/login" element={<Login />} />

        {/* Mitt svæði (protected) */}
        <Route
          path="/c/:clubSlug/account"
          element={
            <RequireSession>
              <AccountHome />
            </RequireSession>
          }
        />
        <Route
          path="/c/:clubSlug/account/athletes"
          element={
            <RequireSession>
              <MyAthletes />
            </RequireSession>
          }
        />
        <Route
          path="/c/:clubSlug/account/messages"
          element={
            <RequireSession>
              <Messages />
            </RequireSession>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/c/test" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
