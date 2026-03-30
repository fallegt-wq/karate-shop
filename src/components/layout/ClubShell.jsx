// src/components/layout/ClubShell.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function ClubShell({
  clubSlug,
  cartCount = 0,
  title,
  subtitle,
  rightSlot,
  children,
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Brand / club */}
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {/* “Hanko” stamp vibe */}
                <div className="grid h-10 w-10 place-items-center rounded-2xl border bg-white">
                  <span className="text-xs font-semibold tracking-widest text-red-700">
                    空手
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">
                    {subtitle || "Club"}
                  </div>
                  <div className="truncate text-lg font-semibold">{clubSlug}</div>
                </div>
              </div>
            </div>

            {/* Center/right slots */}
            <div className="flex items-center gap-3">
              {rightSlot}

              <Link
                to={`/c/${clubSlug}/checkout`}
                className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Cart
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-700 px-2 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              </Link>
            </div>
          </div>

          {title ? (
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight">{title}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Page */}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
