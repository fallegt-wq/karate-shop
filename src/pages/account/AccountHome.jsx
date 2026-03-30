// src/pages/account/AccountHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getMe } from "../../api/account.js";
import { getMyRole } from "../../api/role.js";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-6 shadow-sm">{children}</div>;
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

function Tile({ to, title, desc, icon }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border bg-white p-5 shadow-sm hover:bg-gray-50 transition"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl border bg-gray-50 flex items-center justify-center text-sm font-semibold text-zinc-700">
          {icon}
        </div>
        <div>
          <div className="text-lg font-bold text-zinc-900">{title}</div>
          <div className="mt-1 text-sm text-gray-600">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

export default function AccountHome() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const loc = useLocation();

  const nextUrl = useMemo(() => loc.pathname + (loc.search || ""), [loc.pathname, loc.search]);
  const loginUrl = useMemo(
    () => `/c/${clubSlug}/account/login?next=${encodeURIComponent(nextUrl)}`,
    [clubSlug, nextUrl]
  );

  const [state, setState] = useState({
    status: "checking", // checking | loggedin | loggedout | error
    email: "",
    role: "user",
    error: "",
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const r = await getMe();
        if (!alive) return;

        const email = String(r?.user?.email || "");
        if (email) {
          let role = "user";
          try {
            const rr = await getMyRole(clubSlug);
            role = rr?.role === "staff" ? "staff" : "user";
          } catch {
            role = "user";
          }

          if (!alive) return;
          setState({ status: "loggedin", email, role, error: "" });
          return;
        }

        setState({
          status: "loggedout",
          email: "",
          role: "user",
          error: "Ekki innskráður (vantar session).",
        });
        navigate(loginUrl, { replace: true });
      } catch (e) {
        if (!alive) return;
        setState({
          status: "loggedout",
          email: "",
          error: "",
          role: "user",
        });
        navigate(loginUrl, { replace: true });
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [clubSlug, navigate, loginUrl]);

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      navigate(`/c/${clubSlug}`, { replace: true });
    }
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
                <Badge>Mitt svæði</Badge>
                {state.status === "checking" ? (
                  <span className="text-sm text-gray-500">Sæki notanda…</span>
                ) : (
                  <span className="text-sm text-gray-600">{state.email}</span>
                )}
                <Badge>{state.role === "staff" ? "Staff" : "User"}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/c/${clubSlug}`}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                ← Shop
              </Link>
              <button
                onClick={onLogout}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {state.error ? (
          <div className="mb-6 rounded-2xl border bg-red-50 p-4 text-sm text-red-800">
            {state.error}
          </div>
        ) : null}

        <Card>
          <div className="text-xl font-bold text-zinc-900">Mitt svæði</div>
          <div className="mt-1 text-sm text-gray-600">
            Vefsalan er opin öllum. Mitt svæði er aðeins fyrir innskráða.
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Tile
              to={`/c/${clubSlug}/account/messages`}
              title="Skilaboð"
              desc="Einkaskilaboð og hópskilaboð."
              icon="Msg"
            />
            <Tile
              to={`/c/${clubSlug}/account/athletes`}
              title="Iðkendur"
              desc="Yfirlit yfir iðkendur sem tengjast aðganginum."
              icon="Íþr"
            />
            <Tile
              to={`/c/${clubSlug}/account/payments`}
              title="Greiðslur"
              desc="Greiðslur og reikningar."
              icon="Kr"
            />
            <Tile
              to={`/c/${clubSlug}/account/orders`}
              title="Kaupsaga"
              desc="Pantanir og kvittanir."
              icon="Ord"
            />
          </div>
        </Card>

        {state.role === "staff" ? (
          <div className="mt-6">
            <Card>
              <div className="text-xl font-bold text-zinc-900">Stjórnun</div>
              <div className="mt-1 text-sm text-gray-600">
                Aðgangur fyrir starfsfólk.
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Tile
                  to={`/c/${clubSlug}/admin`}
                  title="Admin"
                  desc="Hópar, iðkendur og innheimta."
                  icon="Adm"
                />
                <Tile
                  to={`/c/${clubSlug}/admin/orders`}
                  title="Pantanir"
                  desc="Skoða og uppfæra pantanir."
                  icon="Ord"
                />
                <Tile
                  to={`/c/${clubSlug}/account/messages`}
                  title="Staff Inbox"
                  desc="Skilaboð frá notendum."
                  icon="Msg"
                />
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
