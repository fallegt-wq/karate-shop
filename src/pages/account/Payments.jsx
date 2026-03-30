import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMe } from "../../api/account.js";
import { getMyPaymentsSummary, listMyPayments } from "../../api/payments.js";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

export default function Payments() {
  const { clubSlug } = useParams();
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("unpaid");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [meRes, listRes, summaryRes] = await Promise.all([
        getMe(),
        listMyPayments(clubSlug, status),
        getMyPaymentsSummary(clubSlug),
      ]);
      setMe(meRes?.user || null);
      setRows(listRes?.payments || []);
      setSummary(summaryRes || null);
    } catch (e) {
      setErr(e?.message || "Tókst ekki að sækja payments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug, status]);

  const totalIsk = useMemo(
    () => rows.reduce((sum, p) => sum + Number(p.amount_isk || 0), 0),
    [rows]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
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
                to={`/c/${clubSlug}/account`}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Account
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge>Payments</Badge>
            {me?.email ? (
              <span className="text-sm text-gray-700">
                Innskráður: <span className="font-semibold">{me.email}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {err ? (
          <div className="mb-6 rounded-2xl border bg-red-50 p-4 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-bold text-zinc-900">My Payments</div>
              <div className="text-sm text-gray-500">Greiðslur tengdar mínum iðkendum.</div>
            </div>
            <select
              className="rounded-xl border px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Samtals:{" "}
            <span className="font-semibold">
              {Number(totalIsk).toLocaleString("is-IS")} kr
            </span>
          </div>

          {summary ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {(summary.by_status || []).map((s) => (
                <Badge key={s.status}>
                  {s.status}: {s.count} ·{" "}
                  {Number(s.total_isk || 0).toLocaleString("is-IS")} kr
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-5 divide-y">
            {loading ? (
              <div className="py-6 text-sm text-gray-500">Sæki payments…</div>
            ) : rows.length === 0 ? (
              <div className="py-6 text-sm text-gray-500">Engar greiðslur.</div>
            ) : (
              rows.map((p) => (
                <div key={p.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-zinc-900">
                        {p.first_name} {p.last_name} — {p.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {Number(p.amount_isk).toLocaleString("is-IS")} kr ·{" "}
                        <span className="font-mono">{p.status}</span>
                      </div>
                      {p.due_date ? (
                        <div className="text-xs text-gray-500">Due: {p.due_date}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
