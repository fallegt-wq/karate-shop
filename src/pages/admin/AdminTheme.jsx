import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function Swatch({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div
        className="mt-3 h-20 rounded-xl border"
        style={{ backgroundColor: value || "#ffffff" }}
      />
      <div className="mt-3 font-mono text-sm text-zinc-900">{value || "—"}</div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-2xl border border-dashed bg-gray-50 p-6 text-center">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
      <div className="mx-auto mt-2 max-w-xl text-sm text-gray-600">{body}</div>
    </div>
  );
}

export default function AdminTheme() {
  const { clubSlug } = useParams();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadTheme() {
      try {
        setLoading(true);
        const res = await fetch(`/api/clubs/${clubSlug}/public`, {
          credentials: "include",
        });

        if (!alive) return;
        if (!res.ok) throw new Error("Theme endpoint not available");

        const data = await res.json();
        setClub(data?.club || null);
      } catch (error) {
        console.error("Failed to load theme preview", error);
        if (!alive) return;
        setClub(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadTheme();

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Hleð þema…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Admin þema</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Þema fyrir {clubSlug}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Core MVP sýnir núverandi litakerfi og branding sem er virkt á
              klúbbssíðunni. Full theme editing kemur síðar.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={`/c/${clubSlug}/admin`}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Til baka í admin
            </Link>
            <Link
              to={`/c/${clubSlug}`}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Opna klúbbssíðu
            </Link>
          </div>
        </div>
      </div>

      {!club ? (
        <EmptyState
          title="Þema ekki tiltækt"
          body="Ekki tókst að sækja núverandi branding fyrir klúbbinn."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Swatch label="Aðallitur" value={club.primary_color} />
            <Swatch label="Textalitur" value={club.text_color} />
            <Swatch label="Accent litur" value={club.accent_color} />
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Branding</div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-gray-500">Klúbbsnafn</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">
                  {club.club_name || clubSlug}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Logo texti</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">
                  {club.logo_text || "—"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Template</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">
                  {club.template_id || "—"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Hero image</div>
                <div className="mt-1 break-all text-sm text-zinc-900">
                  {club.hero_image || "—"}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
