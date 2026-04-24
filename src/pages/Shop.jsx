// src/pages/Shop.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { PRODUCTS } from "../data/products";

const MAX_PRICE_ISK = 50000;

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

function ProductCard({ p, onAdd }) {
  const placeholder = "/images/placeholder.png";
  const src = p.image || placeholder;

  const isTraining = p.type === "REGISTRATION";
  const weeks = Number(p.durationWeeks || 0);

  const grantOk = isTraining && p.leisureGrantEligible === true && weeks >= 8;
  const grantTooShort =
    isTraining && p.leisureGrantEligible === true && weeks > 0 && weeks < 8;

  return (
    <div className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
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
            <div className="mt-1 truncate font-semibold leading-snug text-zinc-900">
              {p.name}
            </div>
          </div>
          <div className="shrink-0 font-semibold text-red-700">
            {formatISK(p.price)}
          </div>
        </div>

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
          type="button"
          onClick={() => onAdd(p)}
          className="mt-4 w-full rounded-xl bg-red-700 py-3 font-semibold text-white transition hover:bg-red-800"
        >
          Setja í körfu
        </button>
      </div>
    </div>
  );
}

export default function Shop() {
  const { clubSlug } = useParams();
  const { items, add } = useCart();

  const [tab, setTab] = useState("ALL");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("All");
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_ISK);

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
  const nextAccount = `/c/${clubSlug}/account`;
  const loginHref = `/c/${clubSlug}/account/login?next=${encodeURIComponent(
    nextAccount
  )}`;

  const productsForTab = useMemo(() => {
    if (tab === "MERCH") {
      return PRODUCTS.filter((p) => (p.type || "MERCH") === "MERCH");
    }
    if (tab === "TRAINING") {
      return PRODUCTS.filter((p) => p.type === "REGISTRATION");
    }
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

  function resetFilters() {
    setCategory("All");
    setBrand("All");
    setMaxPrice(MAX_PRICE_ISK);
    setQ("");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">Club</div>
              <div className="truncate text-lg font-semibold text-zinc-900">
                {clubSlug}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
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
                      Innskráður: <span className="font-semibold">{me.email}</span>
                    </span>
                    <button
                      type="button"
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
              <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-xs text-white">
                {items.length}
              </span>
            </Link>
          </div>

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
                  resetFilters();
                }}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  tab === t.key
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "bg-white text-zinc-900 hover:bg-zinc-50",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative mt-4">
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
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">Filters</div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
              >
                {brands.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>

              <div>
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE_ISK}
                  step={500}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full"
                />
                <div className="mt-1 text-sm text-gray-600">
                  Allt að{" "}
                  <span className="font-semibold">
                    {maxPrice.toLocaleString("is-IS")} kr.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Reset filters
              </button>
            </div>
          </aside>

          <section className="md:col-span-8 lg:col-span-9">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} onAdd={add} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
