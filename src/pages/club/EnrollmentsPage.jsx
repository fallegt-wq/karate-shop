import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createEnrollment,
  listAthletes,
  listEnrollments,
  listGroups,
} from "../../api/clubAdmin";

export default function EnrollmentsPage() {
  const { clubSlug } = useParams();
  const [athletes, setAthletes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const [athleteId, setAthleteId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [reason, setReason] = useState("");

  const athlete = useMemo(
    () => athletes.find((a) => String(a.id) === String(athleteId)),
    [athletes, athleteId]
  );

  async function loadAll() {
    setErr("");
    const [as, gs, es] = await Promise.all([
      listAthletes(clubSlug, ""),
      listGroups(clubSlug),
      listEnrollments(clubSlug),
    ]);
    setAthletes(as.athletes || []);
    setGroups(gs.groups || []);
    setRows(es.enrollments || []);
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug]);

  async function onEnroll(e) {
    e.preventDefault();
    setErr("");
    try {
      await createEnrollment(clubSlug, {
        athlete_id: Number(athleteId),
        group_id: Number(groupId),
        reason: reason || undefined,
        close_existing: true,
      });
      setReason("");
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Enroll / Move athlete</h2>

        <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={onEnroll}>
          <select
            className="rounded-xl border p-2"
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

          <select
            className="rounded-xl border p-2"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">Select group…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} (#{g.id})
              </option>
            ))}
          </select>

          <input
            className="rounded-xl border p-2"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <button
            className="rounded-xl bg-black px-3 py-2 text-white"
            disabled={!athleteId || !groupId}
          >
            Save (closes previous)
          </button>
        </form>

        {athlete ? (
          <div className="mt-3 text-sm text-gray-600">
            Selected:{" "}
            <span className="font-medium">
              {athlete.first_name} {athlete.last_name}
            </span>
          </div>
        ) : null}

        {err ? <div className="mt-2 text-sm text-red-600">{err}</div> : null}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Enrollment history</h2>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2">Athlete</th>
                <th>Group</th>
                <th>Start</th>
                <th>End</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2">
                    {r.last_name}, {r.first_name}
                  </td>
                  <td>{r.group_name}</td>
                  <td>{r.start_date}</td>
                  <td>{r.end_date || "ACTIVE"}</td>
                  <td className="text-gray-600">{r.reason || ""}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="py-6 text-gray-500" colSpan={5}>
                    No enrollments yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
