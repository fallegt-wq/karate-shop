import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createGroup, listGroups } from "../../api/clubAdmin";

export default function GroupsPage() {
  const { clubSlug } = useParams();
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const data = await listGroups(clubSlug);
    setRows(data.groups || []);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug]);

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    try {
      await createGroup(clubSlug, {
        name,
        description: description ? description : undefined,
      });
      setName("");
      setDescription("");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Create group</h2>
        <form className="mt-3 grid gap-2" onSubmit={onCreate}>
          <input
            className="w-full rounded-xl border p-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="w-full rounded-xl border p-2"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            className="rounded-xl bg-black px-3 py-2 text-white"
            disabled={!name.trim()}
          >
            Create
          </button>
          {err ? <div className="text-sm text-red-600">{err}</div> : null}
        </form>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Groups</h2>
        <div className="mt-3 divide-y">
          {rows.map((g) => (
            <div key={g.id} className="py-2">
              <div className="font-medium">{g.name}</div>
              {g.description ? (
                <div className="text-sm text-gray-600">{g.description}</div>
              ) : null}
              <div className="text-xs text-gray-400">
                id: {g.id} • active: {g.active ? "yes" : "no"}
              </div>
            </div>
          ))}
          {!rows.length ? (
            <div className="py-6 text-sm text-gray-500">No groups yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
