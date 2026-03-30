// src/pages/account/MyAthletes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getMe,
  listMyAthletes,
  createMyAthlete,
  listClubAthletesAdmin,
  claimAthleteAdmin,
} from "../../api/account.js";
import GuardiansPanel from "./GuardiansPanel.jsx";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

export default function MyAthletes() {
  const { clubSlug } = useParams();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [my, setMy] = useState([]);
  const [loadingMy, setLoadingMy] = useState(true);

  const [error, setError] = useState("");

  // Create form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [kennitala, setKennitala] = useState("");
  const [saving, setSaving] = useState(false);

  // Claim UI
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimQ, setClaimQ] = useState("");
  const [clubAthletes, setClubAthletes] = useState([]);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  async function refreshMe() {
    setLoadingMe(true);
    try {
      const r = await getMe();
      setMe(r?.user || null);
    } catch (e) {
      setError(
        "Þú ert líklega ekki innskráður. Farðu í Account/Login og skráðu þig inn."
      );
      setMe(null);
    } finally {
      setLoadingMe(false);
    }
  }

  async function refreshMy() {
    setLoadingMy(true);
    setError("");
    try {
      const r = await listMyAthletes(clubSlug);
      setMy(r?.athletes || []);
    } catch (e) {
      setError(e?.message || "Tókst ekki að sækja athletes");
      setMy([]);
    } finally {
      setLoadingMy(false);
    }
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!clubSlug) return;
    refreshMy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug]);

  const mySorted = useMemo(() => {
    return [...(my || [])].sort((a, b) => {
      const lnA = String(a.last_name || "").toLowerCase();
      const lnB = String(b.last_name || "").toLowerCase();
      if (lnA < lnB) return -1;
      if (lnA > lnB) return 1;
      const fnA = String(a.first_name || "").toLowerCase();
      const fnB = String(b.first_name || "").toLowerCase();
      return fnA.localeCompare(fnB);
    });
  }, [my]);

  const claimable = useMemo(() => {
    // “claimable” = athletes í club-lista sem eru ekki þegar merktir me:<email>
    const tag = me?.email ? `me:${String(me.email).toLowerCase()}` : "";
    return (clubAthletes || []).filter((a) => {
      const phone = String(a.phone || "");
      if (!phone) return true; // empty -> claimable
      if (!tag) return false; // ef við vitum ekki email, þá ekki sýna
      return phone !== tag && !phone.startsWith("me:");
    });
  }, [clubAthletes, me]);

  async function onCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createMyAthlete(clubSlug, {
        first_name: firstName,
        last_name: lastName,
        kennitala,
      });

      setFirstName("");
      setLastName("");
      setKennitala("");
      await refreshMy();
    } catch (e2) {
      setError(e2?.message || "Tókst ekki að búa til athlete");
    } finally {
      setSaving(false);
    }
  }

  async function loadClaimables() {
    setClaimLoading(true);
    setClaimError("");
    setClaimSuccess("");
    try {
      const r = await listClubAthletesAdmin(clubSlug, claimQ);
      setClubAthletes(r?.athletes || []);
    } catch (e) {
      setClaimError(
        (e?.message || "Tókst ekki að sækja club athletes") +
          ""
      );
      setClubAthletes([]);
    } finally {
      setClaimLoading(false);
    }
  }

  async function onClaim(athleteId) {
    setClaimError("");
    setClaimSuccess("");

    const email = String(me?.email || "").trim().toLowerCase();
    if (!email) {
      setClaimError("Þú þarft að vera innskráður svo við vitum emailið þitt.");
      return;
    }

    try {
      await claimAthleteAdmin(clubSlug, athleteId);
      setClaimSuccess(`Claim tókst: athlete ${athleteId} tengdur við ${email}`);
      await refreshMy();
      await loadClaimables();
    } catch (e) {
      setClaimError(e?.message || "Claim mistókst");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500">Club</div>
              <div className="text-lg font-semibold text-zinc-900">{clubSlug}</div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/c/${clubSlug}`}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                ← Shop
              </Link>
              <Link
                to={`/c/${clubSlug}/admin`}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Admin
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge>Account</Badge>
            {loadingMe ? (
              <span className="text-sm text-gray-500">Sæki notanda…</span>
            ) : me?.email ? (
              <span className="text-sm text-gray-700">
                Innskráður: <span className="font-semibold">{me.email}</span>
              </span>
            ) : (
              <span className="text-sm text-red-700">Ekki innskráður</span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {error ? (
          <div className="rounded-2xl border bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {/* My athletes list */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-bold text-zinc-900">My athletes</div>
              <div className="text-sm text-gray-500">
                Iðkendur sem eru tengdir þínum aðgangi
              </div>
            </div>
            <button
              onClick={refreshMy}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4">
            {loadingMy ? (
              <div className="text-sm text-gray-500">Sæki athletes…</div>
            ) : mySorted.length === 0 ? (
              <div className="text-sm text-gray-600">
                Engir athletes tengdir þessum aðgangi enn.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {mySorted.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 truncate">
                          {a.first_name} {a.last_name}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          ID: <span className="font-mono">{a.id}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Badge>Active: {a.active ? "1" : "0"}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge>Kennitala: {a.national_id || "—"}</Badge>
                      <Badge>Email: {a.email || "—"}</Badge>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Phone-tag: <span className="font-mono">{a.phone || "—"}</span>
                    </div>

                    {/* NEW: Guardians */}
                    <GuardiansPanel
                      clubSlug={clubSlug}
                      athleteId={a.id}
                      disabled={!me?.email}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create athlete */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-lg font-bold text-zinc-900">Búa til nýjan athlete</div>
          <div className="text-sm text-gray-500">
            Þetta býr til athlete beint “undir þig” (my athletes).
          </div>

          <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Fornafn"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Eftirnafn"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <input
              value={kennitala}
              onChange={(e) => setKennitala(e.target.value)}
              placeholder="Kennitala (valfrjálst í MVP)"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />

            <div className="md:col-span-3">
              <button
                disabled={saving || !me?.email}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                  saving || !me?.email
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-red-700 hover:bg-red-800",
                ].join(" ")}
              >
                {saving ? "Vista…" : "Búa til"}
              </button>
              {!me?.email ? (
                <div className="mt-2 text-xs text-red-700">
                  Þú þarft að vera innskráður til að búa til athlete.
                </div>
              ) : null}
            </div>
          </form>
        </div>

        {/* Claim tool */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-zinc-900">Claim athlete</div>
              <div className="text-sm text-gray-500">
                Tengir “ómerkta” athlete (úr club admin listanum) við þinn aðgang.
              </div>
            </div>

            <button
              onClick={() => setClaimOpen((v) => !v)}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              {claimOpen ? "Loka" : "Opna"}
            </button>
          </div>

          {claimOpen ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={claimQ}
                  onChange={(e) => setClaimQ(e.target.value)}
                  placeholder="Leita (nafn / email / phone / kennitala)"
                  className="w-full rounded-xl border px-3 py-2 text-sm md:w-[420px]"
                />
                <button
                  onClick={loadClaimables}
                  disabled={claimLoading}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:bg-gray-300"
                >
                  {claimLoading ? "Sæki…" : "Sækja claimable"}
                </button>
              </div>

              {claimError ? (
                <div className="rounded-2xl border bg-red-50 p-3 text-sm text-red-800">
                  {claimError}
                </div>
              ) : null}

              {claimSuccess ? (
                <div className="rounded-2xl border bg-green-50 p-3 text-sm text-green-800">
                  {claimSuccess}
                </div>
              ) : null}

              <div className="text-xs text-gray-500">
                Ath: Þetta notar admin endpoint í dev og því þarf{" "}
                virka innskrÃ¡ningu.
              </div>

              {claimable.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Engir claimable athletes í listanum (eða þú átt að sækja fyrst).
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {claimable.map((a) => (
                    <div key={a.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 truncate">
                            {a.first_name} {a.last_name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            ID: <span className="font-mono">{a.id}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onClaim(a.id)}
                          disabled={!me?.email}
                          className={[
                            "rounded-xl px-3 py-2 text-sm font-semibold text-white",
                            !me?.email
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-red-700 hover:bg-red-800",
                          ].join(" ")}
                        >
                          Claim
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge>Kennitala: {a.national_id || "—"}</Badge>
                        <Badge>Phone: {a.phone || "—"}</Badge>
                      </div>

                      {!me?.email ? (
                        <div className="mt-2 text-xs text-red-700">
                          Þú þarft að vera innskráður til að claim-a.
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Tip */}
        <div className="rounded-2xl border bg-white p-5 text-sm text-gray-700">
          <div className="font-semibold text-zinc-900">Næst</div>
          <div className="mt-1">
            Þegar claim er komið í UI, er eðlilegt næsta skref að bæta við:
            <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
              <li>Forsjáraðilum (guardians) + tengingu við athlete</li>
              <li>Innbyggðu skilaboðakerfi (Inbox / Threads / Messages)</li>
              <li>Greiðslustöðu tengda við skráningu (enrollment)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
