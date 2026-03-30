import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createPayment,
  listAthletes,
  listPayments,
  markPaymentPaid,
} from "../../api/clubAdmin";

export default function PaymentsPage() {
  const { clubSlug } = useParams();
  const [athletes, setAthletes] = useState([]);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const [athleteId, setAthleteId] = useState("");
  const [title, setTitle] = useState("Vorönn 2026");
  const [amount, setAmount] = useState(30000);
  const [statusFilter, setStatusFilter] = useState("unpaid");

  async function load() {
    setErr("");
    const [as, ps] = await Promise.all([
      listAthletes(clubSlug, ""),
      listPayments(clubSlug, statusFilter),
    ]);
    setAthletes(as.athletes || []);
    setRows(ps.payments || []);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug, statusFilter]);

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    try {
      await createPayment(clubSlug, {
        athlete_id: Number(athleteId),
        title,
        amount_isk: Number(amount),
      });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function onMarkPaid(id) {
    setErr("");
    try {
      await markPaymentPaid(clubSlug, id);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Create payment</h2>

        <form className="mt-3 grid gap-2" onSubmit={onCreate}>
          <select
            className="rounded--xl border p-2"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
          >
            <option value="">Select athlete…</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.last_name}, {a.first_name} (#{a.id})
              </option>
            ))}
          </select>

          <input
            className="rounded-xl border p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="rounded-xl border p-2"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <button
            className="rounded-xl bg-black px-3 py-2 text-white"
            disabled={!athleteId || !title.trim()}
          >
            Create (unpaid)
          </button>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}
        </form>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Payments</h2>

          <select
            className="rounded-xl border p-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </div>

        <div className="mt-3 divide-y">
          {rows.map((p) => (
            <div key={p.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
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
          ))}

          {!rows.length ? (
            <div className="py-6 text-sm text-gray-500">No payments.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
