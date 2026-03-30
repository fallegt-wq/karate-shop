// FILE: src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const next = useMemo(() => {
    const raw = sp.get("next");
    if (raw && raw.startsWith("/")) return raw;
    return `/c/${clubSlug}/account`;
  }, [sp, clubSlug]);

  const auth = useAuth();
  const requestCode = auth?.requestCode;
  const verifyCode = auth?.verifyCode;

  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSendCode(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (!requestCode) throw new Error("AuthProvider vantar (requestCode).");
      await requestCode(email);
      setStep("code");
    } catch (e) {
      setErr(e?.message || "Failed to send code");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (!verifyCode) throw new Error("AuthProvider vantar (verifyCode).");
      await verifyCode(email, code);
      navigate(next, { replace: true });
    } catch (e) {
      setErr(e?.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md p-4">
        <div className="mt-16 rounded-2xl bg-white p-6 shadow">
          <div className="text-xs text-gray-500">Club</div>
          <h1 className="text-xl font-bold">{clubSlug} — Sign in</h1>

          <p className="mt-2 text-sm text-gray-600">
            Skráning gefur aðgang að “Mínu svæði” (skilaboð, iðkendur/þjónusta, og síðar kaupsaga).
            Vörur er hægt að kaupa án innskráningar.
          </p>

          {step === "email" ? (
            <form className="mt-5 grid gap-3" onSubmit={onSendCode}>
              <input
                className="rounded-xl border p-2"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                className="rounded-xl bg-black px-3 py-2 text-white disabled:opacity-60"
                disabled={!email.trim() || busy}
              >
                {busy ? "Sending…" : "Send login code"}
              </button>
            </form>
          ) : (
            <form className="mt-5 grid gap-3" onSubmit={onVerify}>
              <div className="text-sm text-gray-700">
                Kóði sendur á <span className="font-mono">{email}</span> (demo: sjá API terminal).
              </div>

              <input
                className="rounded-xl border p-2"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <button
                className="rounded-xl bg-black px-3 py-2 text-white disabled:opacity-60"
                disabled={!code.trim() || busy}
              >
                {busy ? "Verifying…" : "Verify & continue"}
              </button>

              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setErr("");
                }}
              >
                Use a different email
              </button>
            </form>
          )}

          {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}

          <div className="mt-6">
            <Link className="text-sm text-gray-600 underline" to={`/c/${clubSlug}`}>
              ← Back to shop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}