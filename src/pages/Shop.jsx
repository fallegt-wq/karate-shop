// src/pages/Shop.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { PRODUCTS } from "../data/products";

async function getMeSafe() {
  try {
    const res = await fetch("/api/me", { method: "GET", credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.user || null;
  } catch {
    return null;
  }
}

async function logoutSafe() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // ignore
  }
}

function ProductCard({ p, onAdd }) {
  const placeholder = "/images/placeholder.png";
  const src = p.image || placeholder;

  const isTraining = p.type === "REGISTRATION";
  const weeks = Number(p.durationWeeks || 0);

  const grantOk = isTraining && p.leisureGrantEligible === true && weeks >= 8;
  const grantTooShort =
    isTraining && p.leisureGrantEligible === true && weeks > 0 && weeks < 8;

  return (
    <div className="group rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* FASTUR MYNDARAMMI – stoppar blikk */}
      <div className="relative aspect-[4/3] bg-gray-100">
        <img
          src={src}
          alt={p.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = placeholder;
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">
              {p.brand || (isTraining ? "Training" : "—")}
            </div>
            <div className="mt-1 font-semibold leading-snug text-zinc-900 truncate">
              {p.name}
            </div>
          </div>
          <div className="shrink-0 font-semibold text-red-700">${p.price}</div>
        </div>

        {/* Training info */}
        {isTraining ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border bg-white px-2.5 py-1 font-semibold text-zinc-700">
              {weeks ? `${weeks} vikur` : "Vikur: —"}
            </span>

            {grantOk ? (
              <span className="rounded-full border bg-green-50 px-2.5 py-1 font-semibold text-green-700">
                Frístundastyrkur ✓
              </span>
            ) : grantTooShort ? (
              <span className="rounded-full border bg-red-50 px-2.5 py-1 font-semibold text-red-700">
                Ekki styrkhæf (min. 8 vikur)
              </span>
            ) : p.leisureGrantEligible ? (
              <span className="rounded-full border bg-white px-2.5 py-1 font-semibold text-zinc-700">
                Styrkhæfi: ósamræmi
              </span>
            ) : (
              <span className="rounded-full border bg-white px-2.5 py-1 font-semibold text-zinc-500">
                Ekki styrkhæf
              </span>
            )}
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="text-red-700">★</span> {p.rating ?? "—"}
            </div>
            <div className="text-xs text-gray-500">{p.category}</div>
          </div>
        )}

        <button
          onClick={() => onAdd(p)}
          className="mt-4 w-full rounded-xl bg-red-700 py-3 text-white font-semibold hover:bg-red-800 transition"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}

export default function Shop() {
  const { clubSlug } = useParams();
  const { items, add } = useCart();

  // Tabs: "ALL" | "MERCH" | "TRAINING"
  const [tab, setTab] = useState("ALL");

  // Filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("All");
const [maxPrice, setMaxPrice] = useState(50000);

  // Session
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingMe(true);
      const u = await getMeSafe();
      if (!alive) return;
      setMe(u);
      setLoadingMe(false);
    })();
    return () => {
      alive = false;
    };
  }, [clubSlug]);

  const loggedIn = !!me?.email;

  // IMPORTANT: "Mitt svæði" should go to login page (and after login, come back to /account)
  const nextAccount = `/c/${clubSlug}/account`;
  const loginHref = `/c/${clubSlug}/account/login?next=${encodeURIComponent(
    nextAccount
  )}`;

  // Build filter dropdown options based on current tab selection (nice UX)
  const productsForTab = useMemo(() => {
    if (tab === "MERCH")
      return PRODUCTS.filter((p) => (p.type || "MERCH") === "MERCH");
    if (tab === "TRAINING")
      return PRODUCTS.filter((p) => p.type === "REGISTRATION");
    return PRODUCTS;
  }, [tab]);

  const categories = useMemo(() => {
    const set = new Set(productsForTab.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [productsForTab]);

  const brands = useMemo(() => {
    const set = new Set(productsForTab.map((p) => p.brand).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [productsForTab]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return productsForTab.filter((p) => {
      const matchSearch =
        !s ||
        String(p.name || "").toLowerCase().includes(s) ||
        String(p.brand || "").toLowerCase().includes(s);

      const matchCategory = category === "All" || p.category === category;
      const matchBrand = brand === "All" || p.brand === brand;
      const matchPrice = (Number(p.price) || 0) <= maxPrice;

      return matchSearch && matchCategory && matchBrand && matchPrice;
    });
  }, [productsForTab, q, category, brand, maxPrice]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">Club</div>
              <div className="text-lg font-semibold text-zinc-900 truncate">
                {clubSlug}
              </div>

              {/* 1) Vefsala opin öllum  2) Mitt svæði fyrir innskráða */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* CHANGED: Mitt svæði -> login */}
                <a
                  href={loginHref}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Mitt svæði
                </a>

                {loadingMe ? (
                  <span className="text-xs text-gray-500">Sæki notanda…</span>
                ) : loggedIn ? (
                  <>
                    <span className="text-xs text-gray-700">
                      Innskráður:{" "}
                      <span className="font-semibold">{me.email}</span>
                    </span>
                    <button
                      onClick={async () => {
                        await logoutSafe();
                        window.location.reload();
                      }}
                      className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-600">
                    (Innskráning er valfrjáls — vefsala virkar alltaf)
                  </span>
                )}
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Vörur: hægt að kaupa án innskráningar. “Mitt svæði” er fyrir
                þjónustu (iðkendur/forsjá), skilaboð og síðar kaupsögu.
              </div>
            </div>

            <Link
              to={`/c/${clubSlug}/checkout`}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Cart
              <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-white text-xs">
                {items.length}
              </span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { key: "ALL", label: "Allt" },
              { key: "MERCH", label: "Búnaður" },
              { key: "TRAINING", label: "Æfingar / Námskeið" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setCategory("All");
                  setBrand("All");
                  setMaxPrice(300);
                  setQ("");
                }}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold border transition",
                  tab === t.key
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-900 hover:bg-zinc-50",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search gear, training, brands..."
              className="w-full rounded-2xl border bg-white px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-red-200"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔎
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900">
            {tab === "MERCH"
              ? "Búnaður"
              : tab === "TRAINING"
              ? "Æfingar / Námskeið"
              : "Vörur"}
          </h1>
          <div className="text-sm text-gray-500">{filtered.length} products</div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* FILTERS */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <div className="font-semibold text-sm text-zinc-900">Filters</div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
              >
                {brands.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>

              <div>
            <input
  type="range"
  min={0}
  max={50000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">
                  Up to <span className="font-semibold">{maxPrice.toLocaleString("is-IS")} kr.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setCategory("All");
                  setBrand("All");
                  setMaxPrice(300);
                  setQ("");
                }}
                className="w-full rounded-xl border py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Reset filters
              </button>
            </div>
          </aside>

          {/* PRODUCTS */}
          <section className="md:col-span-8 lg:col-span-9">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={`${p.id}`} p={p} onAdd={add} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
