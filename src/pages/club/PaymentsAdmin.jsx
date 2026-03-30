import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { listClubPaymentsAdmin, markPaidAdmin } from "../../api/payments.js";

export default function PaymentsAdmin() {
  const { clubSlug } = useParams();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("unpaid");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await listClubPaymentsAdmin(clubSlug, status);
      setRows(r?.payments || []);
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

  async function onMarkPaid(id) {
    setErr("");
    try {
      await markPaidAdmin(clubSlug, id);
      await load();
    } catch (e) {
      setErr(e?.message || "Mistókst að merkja greitt");
    }
  }

  const filtered = useMemo(() => {
    const query = String(q || "").toLowerCase();
    if (!query) return rows;
    return rows.filter((p) => {
      const name = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      return name.includes(query) || String(p.title || "").toLowerCase().includes(query);
    });
  }, [rows, q]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Payments (Admin)</div>
          <div className="text-sm text-gray-500">Leita og merkja greitt.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-xl border p-2 text-sm"
            placeholder="Leita (nafn / title)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border p-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}

      <div className="mt-3 divide-y">
        {loading ? (
          <div className="py-6 text-sm text-gray-500">Sæki payments…</div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-sm text-gray-500">No payments.</div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {p.last_name}, {p.first_name} — {p.title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {Number(p.amount_isk).toLocaleString("is-IS")} kr —{" "}
                    <span className="font-mono">{p.status}</span>
                  </div>
                </div>
                {p.status === "unpaid" ? (
                  <button
                    className="rounded-xl bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                    onClick={() => onMarkPaid(p.id)}
                  >
                    Mark paid
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
