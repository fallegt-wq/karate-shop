// src/pages/Checkout.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import ClubShell from "../components/layout/ClubShell";
import { createOrderApi } from "../api/orders";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-zinc-900">{label}</div>
      {children}
      {hint ? <div className="mt-2 text-xs text-zinc-500">{hint}</div> : null}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none",
        "focus:ring-2 focus:ring-red-200",
        props.className || "",
      ].join(" ")}
    />
  );
}

function SummaryRow({ left, right }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-zinc-600">{left}</div>
      <div className="font-semibold text-zinc-900">{right}</div>
    </div>
  );
}

// YYYY-MM-DD -> birthYear (safe)
function birthYearFromIso(iso) {
  if (!iso || typeof iso !== "string") return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  if (!y || y < 1900 || y > 2100) return null;
  return y;
}

// YEAR-BASED rule: eligible if birthYear in [currentYear-18, currentYear-6]
function isEligibleByYearRule(isoDob, currentYear) {
  const by = birthYearFromIso(isoDob);
  if (by === null) return { ok: false, reason: "missing_or_invalid_dob" };

  const minBirthYear = currentYear - 18;
  const maxBirthYear = currentYear - 6;

  if (by < minBirthYear) return { ok: false, reason: "too_old", birthYear: by };
  if (by > maxBirthYear) return { ok: false, reason: "too_young", birthYear: by };
  return { ok: true, reason: "ok", birthYear: by };
}

export default function Checkout() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const { items, remove, total, clear } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Purchaser
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Registration forms per cart item (keyed by cartId)
  const [regForms, setRegForms] = useState({});
  function updateReg(cartId, patch) {
    setRegForms((prev) => ({
      ...prev,
      [cartId]: { ...(prev[cartId] || {}), ...patch },
    }));
  }

  // === Frístundastyrkur ===
  const [useGrant, setUseGrant] = useState(false);
  const [municipality, setMunicipality] = useState("Reykjavík");
  const [grantAmount, setGrantAmount] = useState(0);
  const [grantNote, setGrantNote] = useState("");

  // Rafrænar skilríki (demo)
  const [loginAs, setLoginAs] = useState("GUARDIAN"); // "GUARDIAN" | "PARTICIPANT"
  const [eidVerified, setEidVerified] = useState(false);

  // Items
  const registrationItems = useMemo(
    () => items.filter((x) => x.type === "REGISTRATION"),
    [items]
  );
  const hasRegistration = registrationItems.length > 0;

  // Eligible for grant = REGISTRATION + leisureGrantEligible + durationWeeks >= 8
  const eligibleGrantItems = useMemo(() => {
    return registrationItems.filter((x) => {
      const weeks = Number(x.durationWeeks || 0);
      return x.leisureGrantEligible === true && weeks >= 8;
    });
  }, [registrationItems]);

  const eligibleSubtotal = useMemo(() => {
    return eligibleGrantItems.reduce((sum, x) => sum + (Number(x.price) || 0), 0);
  }, [eligibleGrantItems]);

  const appliedGrant = useMemo(() => {
    if (!useGrant) return 0;
    const v = Number(grantAmount) || 0;
    return Math.max(0, Math.min(v, eligibleSubtotal));
  }, [useGrant, grantAmount, eligibleSubtotal]);

  const fee = 0;

  const grandTotal = useMemo(() => {
    return Math.max(0, Number(total || 0) + Number(fee || 0) - appliedGrant);
  }, [total, fee, appliedGrant]);

  // YEAR-BASED age rule
  const currentYear = new Date().getFullYear();

  const grantAgeCheck = useMemo(() => {
    if (!useGrant) return { ok: true, needsParticipantLogin: false, message: "" };

    let anyEligible = false;
    let anyNeedsParticipantLogin = false;
    let anyHasValidDob = false;

    for (const p of registrationItems) {
      const schema = p.registration || {};
      if (!schema.requiresAthleteDob) continue;

      const f = regForms[p.cartId] || {};
      const dob = String(f.athleteDob || "");
      const res = isEligibleByYearRule(dob, currentYear);

      if (res.reason !== "missing_or_invalid_dob") anyHasValidDob = true;

      if (res.ok) {
        anyEligible = true;
        if (res.birthYear === currentYear - 18) anyNeedsParticipantLogin = true;
      }
    }

    if (!anyHasValidDob) {
      return {
        ok: false,
        needsParticipantLogin: false,
        message: "Settu fæðingardag (YYYY-MM-DD) fyrir iðkanda til að meta frístundastyrk.",
      };
    }

    if (!anyEligible) {
      return {
        ok: false,
        needsParticipantLogin: false,
        message:
          "Enginn iðkandi uppfyllir aldursskilyrði frístundastyrks (gildir á árinu sem barnið verður 6 ára til áramóta þess árs sem það verður 18 ára).",
      };
    }

    return {
      ok: true,
      needsParticipantLogin: anyNeedsParticipantLogin,
      message: "",
    };
  }, [useGrant, registrationItems, regForms, currentYear]);

  const loginRequirementOk = useMemo(() => {
    if (!useGrant) return true;
    if (!grantAgeCheck.ok) return false;
    if (grantAgeCheck.needsParticipantLogin) return loginAs === "PARTICIPANT";
    return true;
  }, [useGrant, grantAgeCheck, loginAs]);

  // Validation
  const canSubmit = useMemo(() => {
    if (!items.length) return false;
    if (!agreeTerms) return false;
    if (!buyerName.trim() || !buyerEmail.trim()) return false;

    if (useGrant) {
      if (eligibleSubtotal <= 0) return false;
      if (appliedGrant <= 0) return false;
      if (!municipality.trim()) return false;

      if (!grantAgeCheck.ok) return false;
      if (!eidVerified) return false;
      if (!loginRequirementOk) return false;
    }

    if (!hasRegistration) return true;

    for (const p of registrationItems) {
      const schema = p.registration || {};
      const f = regForms[p.cartId] || {};
      if (schema.requiresAthleteName && !String(f.athleteName || "").trim()) return false;
      if (schema.requiresAthleteDob && !String(f.athleteDob || "").trim()) return false;
      if (schema.requiresGuardian && !String(f.guardianName || "").trim()) return false;
      if (schema.requiresNotes && !String(f.notes || "").trim()) return false;
    }

    return true;
  }, [
    items.length,
    agreeTerms,
    buyerName,
    buyerEmail,
    useGrant,
    eligibleSubtotal,
    appliedGrant,
    municipality,
    grantAgeCheck,
    eidVerified,
    loginRequirementOk,
    hasRegistration,
    registrationItems,
    regForms,
  ]);

  async function submitOrder() {
    if (submitting) return;
    if (!canSubmit) return;

    const grantStatus = !useGrant
      ? "EKKI_OSKAD"
      : eidVerified
      ? "STADFEST_MED_RAFRAENUM_SKILRIKJUM_DEMO"
      : "OSKAD_ENN_EKKI_STADFEST";

    const orderPayload = {
      // server will assign id + createdAt (we can still send, but not required)
      clubSlug,

      buyer: {
        name: buyerName.trim(),
        email: buyerEmail.trim(),
        phone: buyerPhone.trim(),
      },

      items: items.map((p) => ({
        cartId: p.cartId,
        productId: p.id,
        type: p.type || "MERCH",
        name: p.name,
        brand: p.brand,
        price: Number(p.price) || 0,
        category: p.category,
        leisureGrantEligible: p.leisureGrantEligible === true,
        durationWeeks: p.durationWeeks ?? null,
      })),

      registrations: registrationItems.map((p) => ({
        cartId: p.cartId,
        productId: p.id,
        productName: p.name,
        ...(regForms[p.cartId] || {}),
      })),

      fristundastyrkur: {
        requested: useGrant,
        municipality: useGrant ? municipality : "",
        eligibleSubtotal,
        appliedAmount: appliedGrant,
        note: useGrant ? grantNote : "",
        status: grantStatus,

        policy: {
          minWeeks: 8,
          ageRule: "YEAR_BASED_6_TO_18",
          currentYear,
          requiresParticipantLoginWhen18: true,
        },

        eid: {
          verified: useGrant ? eidVerified : false,
          loginAs: useGrant ? loginAs : "",
        },
      },

      totals: {
        subtotal: Number(total || 0),
        fee,
        fristundastyrkurDiscount: appliedGrant,
        total: grandTotal,
      },

      payment: {
        status: "DEMO_NOT_PAID",
      },
    };

    try {
      setSubmitError("");
      setSubmitting(true);

      const created = await createOrderApi(clubSlug, orderPayload);

      clear();
      navigate(`/c/${clubSlug}/account/orders`);
    } catch (e) {
      setSubmitError(e?.message || "Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClubShell
      clubSlug={clubSlug}
      cartCount={items.length}
      title="Checkout"
      subtitle="Order & registration"
      rightSlot={
        <Link
          to={`/c/${clubSlug}`}
          className="hidden md:inline-flex items-center rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          ← Back to shop
        </Link>
      }
    >
      <div className="md:hidden mb-4">
        <Link
          to={`/c/${clubSlug}`}
          className="inline-flex items-center rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          ← Back to shop
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT */}
        <section className="lg:col-span-7 space-y-6">
          {/* Purchaser */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Kaupandi</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">Upplýsingar</div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nafn">
                <Input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="t.d. Gunnar Jónsson"
                  autoComplete="name"
                />
              </Field>

              <Field label="Sími (valfrjálst)">
                <Input
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="t.d. 555-1234"
                  autoComplete="tel"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Netfang">
                  <Input
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="t.d. gunnar@email.com"
                    autoComplete="email"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Registration */}
          {hasRegistration ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-zinc-500">Skráning</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">Iðkandi</div>

              <div className="mt-4 space-y-4">
                {registrationItems.map((p, idx) => {
                  const schema = p.registration || {};
                  const f = regForms[p.cartId] || {};
                  const res = isEligibleByYearRule(String(f.athleteDob || ""), currentYear);
                  const by = res.birthYear;

                  const label =
                    res.reason === "missing_or_invalid_dob"
                      ? "Aldur: vantar fæðingardag"
                      : res.ok
                      ? `Aldursskilyrði: OK (fæðingarár ${by})`
                      : res.reason === "too_young"
                      ? `Of ung/ur fyrir styrk (fæðingarár ${by})`
                      : `Of gamall/gömul fyrir styrk (fæðingarár ${by})`;

                  const is18Year = res.ok && res.birthYear === currentYear - 18;

                  return (
                    <div key={p.cartId} className="rounded-2xl border p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wider text-zinc-500">
                            Vara {idx + 1}
                          </div>
                          <div className="font-semibold text-zinc-900 truncate">{p.name}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Vikur: {Number(p.durationWeeks || 0)}
                            {p.leisureGrantEligible && Number(p.durationWeeks || 0) >= 8
                              ? " • Styrkhæf skv. lengd"
                              : ""}
                          </div>

                          {useGrant && schema.requiresAthleteDob ? (
                            <div className="mt-2 text-xs">
                              <span
                                className={[
                                  "font-semibold",
                                  res.ok ? "text-green-700" : "text-red-700",
                                ].join(" ")}
                              >
                                {label}
                              </span>

                              {res.ok && is18Year ? (
                                <div className="mt-1 text-xs font-semibold text-red-700">
                                  Ath: Iðkandi er 18 ára á þessu ári → þarf að skrá sig inn sjálfur með sínum rafrænu skilríkjum.
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0 font-semibold text-red-700">${p.price}</div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {schema.requiresAthleteName ? (
                          <Field label="Nafn iðkanda">
                            <Input
                              value={f.athleteName || ""}
                              onChange={(e) => updateReg(p.cartId, { athleteName: e.target.value })}
                            />
                          </Field>
                        ) : null}

                        {schema.requiresAthleteDob ? (
                          <Field label="Fæðingardagur" hint="YYYY-MM-DD">
                            <Input
                              value={f.athleteDob || ""}
                              onChange={(e) => updateReg(p.cartId, { athleteDob: e.target.value })}
                              placeholder="YYYY-MM-DD"
                            />
                          </Field>
                        ) : null}

                        {schema.requiresGuardian ? (
                          <div className="sm:col-span-2">
                            <Field label="Forráðamaður">
                              <Input
                                value={f.guardianName || ""}
                                onChange={(e) => updateReg(p.cartId, { guardianName: e.target.value })}
                              />
                            </Field>
                          </div>
                        ) : null}

                        {schema.requiresNotes ? (
                          <div className="sm:col-span-2">
                            <Field label="Athugasemdir (skyldu)">
                              <Input
                                value={f.notes || ""}
                                onChange={(e) => updateReg(p.cartId, { notes: e.target.value })}
                              />
                            </Field>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Frístundastyrkur */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Sveitarfélag</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">Frístundastyrkur</div>

            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3 rounded-2xl border p-4 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={useGrant}
                  disabled={eligibleSubtotal <= 0}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseGrant(checked);

                    if (!checked) {
                      setGrantAmount(0);
                      setEidVerified(false);
                      setLoginAs("GUARDIAN");
                      return;
                    }
                    if (checked && eligibleSubtotal > 0) setGrantAmount(eligibleSubtotal);
                  }}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-900">
                    Nota frístundastyrk á styrkhæfar æfingar/námskeið
                  </div>
                  <div className="text-xs text-zinc-500">
                    Gildir fyrir training ≥ 8 vikur. Aldursskilyrði er ársbundið: frá 1. janúar á árinu sem barnið verður 6 ára til áramóta ársins sem það verður 18 ára.
                  </div>
                </div>
              </label>

              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
                Styrkhæft samtals: <span className="font-semibold">${eligibleSubtotal}</span>
              </div>

              {useGrant ? (
                <>
                  {!grantAgeCheck.ok ? (
                    <div className="rounded-2xl border bg-red-50 p-4 text-sm font-semibold text-red-700">
                      {grantAgeCheck.message}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Sveitarfélag">
                      <select
                        value={municipality}
                        onChange={(e) => setMunicipality(e.target.value)}
                        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm"
                      >
                        <option>Reykjavík</option>
                        <option>Kópavogur</option>
                        <option>Hafnarfjörður</option>
                        <option>Garðabær</option>
                        <option>Mosfellsbær</option>
                        <option>Annað</option>
                      </select>
                    </Field>

                    <Field label="Upphæð" hint={`Hámark: $${eligibleSubtotal}`}>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={eligibleSubtotal}
                          value={grantAmount}
                          onChange={(e) => setGrantAmount(Number(e.target.value))}
                        />
                        <button
                          type="button"
                          onClick={() => setGrantAmount(eligibleSubtotal)}
                          className="shrink-0 rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                        >
                          Max
                        </button>
                      </div>
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Athugasemd (valfrjálst)">
                        <Input
                          value={grantNote}
                          onChange={(e) => setGrantNote(e.target.value)}
                          placeholder="t.d. nafn barns / tilvísun (demo)"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Rafræn skilríki */}
                  <div className="mt-4 rounded-2xl border bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">Rafræn skilríki</div>
                    <div className="mt-2 text-xs text-zinc-500">
                      Ef iðkandi er 18 ára á þessu ári (skv. aldursskilyrði), þá þarf iðkandinn að skrá sig inn sjálfur.
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginAs("GUARDIAN");
                          setEidVerified(false);
                        }}
                        className={[
                          "rounded-2xl border px-4 py-3 text-sm font-semibold",
                          loginAs === "GUARDIAN"
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white hover:bg-zinc-50",
                        ].join(" ")}
                      >
                        Foreldri / forráðamaður
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginAs("PARTICIPANT");
                          setEidVerified(false);
                        }}
                        className={[
                          "rounded-2xl border px-4 py-3 text-sm font-semibold",
                          loginAs === "PARTICIPANT"
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white hover:bg-zinc-50",
                        ].join(" ")}
                      >
                        Iðkandi (18 ára)
                      </button>
                    </div>

                    {grantAgeCheck.needsParticipantLogin && loginAs !== "PARTICIPANT" ? (
                      <div className="mt-3 rounded-2xl border bg-red-50 p-3 text-xs font-semibold text-red-700">
                        Veldu “Iðkandi (18 ára)” til að halda áfram með frístundastyrk.
                      </div>
                    ) : null}

                    {eidVerified ? (
                      <div className="mt-3 text-sm font-semibold text-green-700">
                        Innskráning staðfest (demo) ✅
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEidVerified(true)}
                        className="mt-3 inline-flex rounded-2xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                      >
                        Skrá inn með rafrænum skilríkjum (demo)
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Consent */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Samþykki</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">Skilmálar</div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border p-4 hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-semibold text-zinc-900">Ég samþykki skilmála</div>
                <div className="text-xs text-zinc-500">(Demo) Seinna tengjum við skilmála félags.</div>
              </div>
            </label>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500">Yfirlit</div>
                  <div className="mt-1 text-lg font-semibold text-zinc-900">Karfan</div>
                </div>

                {items.length ? (
                  <button
                    type="button"
                    onClick={clear}
                    className="text-sm font-semibold text-red-700 hover:text-red-800"
                  >
                    Hreinsa
                  </button>
                ) : null}
              </div>

              {!items.length ? (
                <div className="mt-5 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
                  Karfan er tóm.
                </div>
              ) : (
                <>
                  <div className="mt-5 divide-y">
                    {items.map((p) => (
                      <div key={p.cartId} className="flex items-start justify-between gap-4 py-4">
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wider text-zinc-500">
                            {p.brand || p.type}
                          </div>
                          <div className="truncate font-semibold text-zinc-900">{p.name}</div>
                          <div className="mt-1 text-sm font-semibold text-zinc-900">${p.price}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(p.cartId)}
                          className="shrink-0 rounded-2xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                        >
                          Fjarlægja
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2 border-t pt-4">
                    <SummaryRow left="Samtals" right={`$${total}`} />
                    <SummaryRow left="Gjöld" right={`$${fee}`} />
                    {useGrant && appliedGrant > 0 ? (
                      <SummaryRow
                        left={`Frístundastyrkur (${municipality})`}
                        right={`- $${appliedGrant}`}
                      />
                    ) : null}

                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <div className="text-base font-semibold text-zinc-900">Greiða</div>
                        <div className="text-base font-semibold text-red-700">${grandTotal}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canSubmit || submitting}
                    className={[
                      "mt-5 w-full rounded-2xl py-3 text-sm font-semibold text-white transition",
                      canSubmit && !submitting
                        ? "bg-red-700 hover:bg-red-800 active:scale-[0.99]"
                        : "bg-zinc-300 cursor-not-allowed",
                    ].join(" ")}
                    onClick={(e) => {
                      e.preventDefault();
                      submitOrder();
                    }}
                  >
                    {submitting ? "Sendi..." : "Staðfesta og senda"}
                  </button>

                  {submitError ? (
                    <div className="mt-3 text-xs font-semibold text-red-700">{submitError}</div>
                  ) : null}

                  {useGrant && !loginRequirementOk ? (
                    <div className="mt-3 text-xs font-semibold text-red-700">
                      Þú þarft að velja rétta innskráningu (iðkandi ef 18 ára á þessu ári).
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-zinc-500">Aðgangur</div>
              <Link
                to={`/c/${clubSlug}/account/orders`}
                className="mt-2 inline-flex w-full items-center justify-center rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Fara í kaupsögu
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </ClubShell>
  );
}
