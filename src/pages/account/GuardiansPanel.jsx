// src/pages/account/GuardiansPanel.jsx
import React, { useEffect, useState } from "react";
import { listAthleteGuardians, addAthleteGuardian } from "../../api/guardians.js";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

export default function GuardiansPanel({ clubSlug, athleteId, disabled }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("forráðamaður");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await listAthleteGuardians(clubSlug, athleteId);
      setItems(r?.guardians || []);
    } catch (e) {
      setErr(e?.message || "Tókst ekki að sækja forsjáraðila");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onAdd(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await addAthleteGuardian(clubSlug, athleteId, { email, relationship });
      setEmail("");
      await load();
    } catch (e2) {
      setErr(e2?.message || "Tókst ekki að bæta við forsjáraðila");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
      >
        {open ? "Loka forsjáraðilum" : "Forsjáraðilar"}
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-zinc-900">Forsjáraðilar</div>
            <Badge>Athlete #{athleteId}</Badge>
          </div>

          {err ? (
            <div className="mt-3 rounded-xl border bg-red-50 p-3 text-sm text-red-800">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-3 text-sm text-gray-500">Sæki…</div>
          ) : items.length === 0 ? (
            <div className="mt-3 text-sm text-gray-600">Enginn skráður enn.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {items.map((g) => (
                <div key={g.id} className="rounded-xl border p-3">
                  <div className="font-semibold text-zinc-900">{g.email}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <Badge>{g.relationship || "—"}</Badge>
                    <Badge>KT: {g.national_id || "—"}</Badge>
                    <Badge>Sími: {g.phone || "—"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={onAdd} className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email forsjáraðila"
              className="w-full rounded-xl border px-3 py-2 text-sm md:col-span-2"
            />
            <input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="Tengsl (t.d. móðir/faðir)"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <div className="md:col-span-3">
              <button
                disabled={saving || !email.trim() || disabled}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                  saving || !email.trim() || disabled
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-black hover:bg-zinc-800",
                ].join(" ")}
              >
                {saving ? "Vista…" : "Bæta við"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
