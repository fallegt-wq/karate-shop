import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createAthlete, listAthletes } from "../../api/clubAdmin";

export default function AthletesPage() {
  const { clubSlug } = useParams();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  async function load(search = q) {
    setErr("");
    const data = await listAthletes(clubSlug, search);
    setRows(data.athletes || []);
  }

  useEffect(() => {
    load("").catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug]);

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    try {
      await createAthlete(clubSlug, { first_name: first, last_name: last });
      setFirst("");
      setLast("");
      await load("");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Create athlete</h2>
        <form className="mt-3 grid gap-2" onSubmit={onCreate}>
          <input
            className="rounded-xl border p-2"
            placeholder="First name"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
          <input
            className="rounded-xl border p-2"
            placeholder="Last name"
            value={last}
            onChange={(e) => setLast(e.target.value)}
          />
          <button
            className="rounded-xl bg-black px-3 py-2 text-white"
            disabled={!first.trim() || !last.trim()}
          >
            Create
          </button>
          {err ? <div className="text-sm text-red-600">{err}</div> : null}
        </form>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Athletes</h2>
          <input
            className="w-56 rounded-xl border p-2 text-sm"
            placeholder="Search… (Enter)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                load(e.currentTarget.value).catch((er) => setErr(er.message));
            }}
          />
        </div>

        <div className="mt-3 divide-y">
          {rows.map((a) => (
            <div key={a.id} className="py-2">
              <div className="font-medium">
                {a.last_name}, {a.first_name}
              </div>
              <div className="text-xs text-gray-500">id: {a.id}</div>
            </div>
          ))}
          {!rows.length ? (
            <div className="py-6 text-sm text-gray-500">No athletes yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
