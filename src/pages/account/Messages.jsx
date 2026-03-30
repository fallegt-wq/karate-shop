// src/pages/account/Messages.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getMe, listMyAthletes } from "../../api/account.js";
import {
  getMyRole,
  listStaff,
  listDmThreads,
  getDmThread,
  createDmThread,
  sendDmMessage,
  listGroupThreads,
  getGroupThread,
  sendGroupMessage,
} from "../../api/messages.js";

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm font-semibold border transition",
        active
          ? "bg-zinc-900 text-white border-zinc-900"
          : "bg-white text-zinc-900 hover:bg-zinc-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatWho(thread, viewerKind, staffDirectory) {
  // viewerKind: "user" | "staff"
  // DM thread shape: { user_email, staff_email, subject, ... }
  const staffEmail = String(thread?.staff_email || "").toLowerCase();
  const staff = (staffDirectory || []).find(
    (s) => String(s.email || "").toLowerCase() === staffEmail
  );
  const staffLabel = staff?.display_name || staff?.email || thread?.staff_email || "Staff";

  if (viewerKind === "staff") {
    return thread?.user_email || "User";
  }
  return staffLabel;
}

export default function Messages() {
  const { clubSlug } = useParams();
  const [sp, setSp] = useSearchParams();

  // URL state:
  // tab=dm|group
  // dm=<threadId>
  // g=<groupId>
  const tab = sp.get("tab") || "dm";
  const dmId = sp.get("dm");
  const groupId = sp.get("g");

  const [me, setMe] = useState(null);
  const [role, setRole] = useState(null); // { email, role, staff, display_name }
  const [meErr, setMeErr] = useState("");

  const [athletes, setAthletes] = useState([]);
  const [staff, setStaff] = useState([]);

  const [dmThreads, setDmThreads] = useState([]);
  const [groupThreads, setGroupThreads] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // DM create form
  const [dmTo, setDmTo] = useState("");
  const [dmSubject, setDmSubject] = useState("");
  const [dmAthleteId, setDmAthleteId] = useState("");
  const [dmFirst, setDmFirst] = useState("");
  const [creatingDm, setCreatingDm] = useState(false);

  // DM view
  const [dmData, setDmData] = useState(null);
  const [dmLoading, setDmLoading] = useState(false);
  const [dmBody, setDmBody] = useState("");
  const [dmSending, setDmSending] = useState(false);

  // Group view
  const [groupData, setGroupData] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupBody, setGroupBody] = useState("");
  const [groupSending, setGroupSending] = useState(false);

  function setTab(next) {
    const nextSp = new URLSearchParams(sp);
    nextSp.set("tab", next);
    // keep selection
    setSp(nextSp);
  }

  async function refreshMe() {
    setMeErr("");
    try {
      const r = await getMe();
      setMe(r?.user || null);
    } catch (e) {
      setMe(null);
      setMeErr("Þú þarft að vera innskráður til að nota Messages.");
    }
  }

  async function refreshAll() {
    if (!clubSlug) return;
    setLoading(true);
    setErr("");

    try {
      const [roleR, staffR, dmR, groupR, aR] = await Promise.all([
        getMyRole(clubSlug),
        listStaff(clubSlug),
        listDmThreads(clubSlug),
        listGroupThreads(clubSlug),
        listMyAthletes(clubSlug), // ok for staff too; staff will just see 0 here
      ]);

      setRole(roleR || null);
      setStaff(staffR?.staff || []);
      setDmThreads(dmR?.threads || []);
      setGroupThreads(groupR?.threads || []);
      setAthletes(aR?.athletes || []);
    } catch (e) {
      setErr(e?.message || "Tókst ekki að sækja messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubSlug]);

  const viewerKind = role?.staff ? "staff" : "user";

  const athleteOptions = useMemo(() => {
    return [{ id: "", label: "Ekki tengja við athlete" }].concat(
      (athletes || []).map((a) => ({
        id: String(a.id),
        label: `${a.first_name} ${a.last_name} (#${a.id})`,
      }))
    );
  }, [athletes]);

  const staffOptions = useMemo(() => {
    return [{ email: "", label: "Veldu viðtakanda…" }].concat(
      (staff || []).map((s) => {
        const label = s.display_name
          ? `${s.display_name} (${s.role})`
          : `${s.email} (${s.role})`;
        return { email: s.email, label };
      })
    );
  }, [staff]);

  async function loadDm(threadId) {
    if (!threadId) {
      setDmData(null);
      return;
    }
    setDmLoading(true);
    setErr("");
    try {
      const r = await getDmThread(clubSlug, threadId);
      setDmData(r);
    } catch (e) {
      setErr(e?.message || "Tókst ekki að opna DM þráð");
      setDmData(null);
    } finally {
      setDmLoading(false);
    }
  }

  async function loadGroup(gid) {
    if (!gid) {
      setGroupData(null);
      return;
    }
    setGroupLoading(true);
    setErr("");
    try {
      const r = await getGroupThread(clubSlug, gid);
      setGroupData(r);
    } catch (e) {
      setErr(e?.message || "Tókst ekki að opna hópþráð");
      setGroupData(null);
    } finally {
      setGroupLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "dm") loadDm(dmId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dmId, clubSlug]);

  useEffect(() => {
    if (tab === "group") loadGroup(groupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, groupId, clubSlug]);

  async function onCreateDm(e) {
    e.preventDefault();
    setCreatingDm(true);
    setErr("");

    try {
      const r = await createDmThread(clubSlug, {
        staff_email: dmTo,
        subject: dmSubject,
        athlete_id: dmAthleteId || null,
        first_message: dmFirst,
      });

      const newId = String(r?.thread?.id || "");
      setDmTo("");
      setDmSubject("");
      setDmAthleteId("");
      setDmFirst("");

      await refreshAll();

      const next = new URLSearchParams(sp);
      next.set("tab", "dm");
      if (newId) next.set("dm", newId);
      setSp(next);
    } catch (e2) {
      setErr(e2?.message || "Tókst ekki að stofna DM");
    } finally {
      setCreatingDm(false);
    }
  }

  async function onSendDm(e) {
    e.preventDefault();
    if (!dmId) return;

    setDmSending(true);
    setErr("");
    try {
      const r = await sendDmMessage(clubSlug, dmId, dmBody);
      setDmBody("");
      setDmData(r);
      await refreshAll();
    } catch (e2) {
      setErr(e2?.message || "Tókst ekki að senda DM skilaboð");
    } finally {
      setDmSending(false);
    }
  }

  async function onSendGroup(e) {
    e.preventDefault();
    if (!groupId) return;

    setGroupSending(true);
    setErr("");
    try {
      const r = await sendGroupMessage(clubSlug, groupId, groupBody);
      setGroupBody("");
      setGroupData(r);
      await refreshAll();
    } catch (e2) {
      setErr(e2?.message || "Tókst ekki að senda hópskilaboð");
    } finally {
      setGroupSending(false);
    }
  }

  function pickDm(id) {
    const next = new URLSearchParams(sp);
    next.set("tab", "dm");
    next.set("dm", String(id));
    setSp(next);
  }

  function pickGroup(gid) {
    const next = new URLSearchParams(sp);
    next.set("tab", "group");
    next.set("g", String(gid));
    setSp(next);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500">Club</div>
              <div className="text-lg font-semibold text-zinc-900">{clubSlug}</div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>Messages</Badge>
                {me?.email ? (
                  <span className="text-sm text-gray-700">
                    Innskráður: <span className="font-semibold">{me.email}</span>
                    {role?.staff ? (
                      <span className="ml-2 text-xs text-gray-500">
                        (Staff: {role.role})
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-sm text-red-700">{meErr || "Ekki innskráður"}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/c/${clubSlug}/account/athletes`}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                ← Account
              </Link>
              <Link
                to={`/c/${clubSlug}`}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                ← Shop
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <TabButton active={tab === "dm"} onClick={() => setTab("dm")}>
              Einkaskilaboð
            </TabButton>
            <TabButton active={tab === "group"} onClick={() => setTab("group")}>
              Hópskilaboð
            </TabButton>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {err ? (
          <div className="mb-6 rounded-2xl border bg-red-50 p-4 text-sm text-red-800">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Sæki…</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* LEFT */}
            <aside className="md:col-span-5 lg:col-span-4 space-y-6">
              {tab === "dm" ? (
                <>
                  {/* DM threads list */}
                  <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-zinc-900">
                        DM þræðir
                      </div>
                      <button
                        onClick={refreshAll}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                      >
                        Refresh
                      </button>
                    </div>

                    {dmThreads.length === 0 ? (
                      <div className="mt-3 text-sm text-gray-600">
                        Engir DM þræðir enn.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {dmThreads.map((t) => {
                          const isSel = String(t.id) === String(dmId || "");
                          const who = formatWho(t, viewerKind, staff);
                          return (
                            <button
                              key={t.id}
                              onClick={() => pickDm(t.id)}
                              className={[
                                "w-full text-left rounded-2xl border p-3 hover:bg-gray-50",
                                isSel ? "border-zinc-900" : "",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-zinc-900 truncate">
                                    {t.subject}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500 truncate">
                                    {viewerKind === "staff" ? "Frá: " : "Til: "}
                                    <span className="font-mono">{who}</span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-xs text-gray-500">
                                  {t.last_message_at}
                                </div>
                              </div>

                              {t.athlete_id ? (
                                <div className="mt-2 text-xs text-gray-600">
                                  Athlete: <span className="font-mono">{t.athlete_id}</span>
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* DM create: only for user (not staff) */}
                  {!role?.staff ? (
                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                      <div className="text-lg font-bold text-zinc-900">
                        Ný einkaskilaboð
                      </div>
                      <div className="text-sm text-gray-500">
                        Veldu þjálfara/forstöðumann og sendu skilaboð.
                      </div>

                      <form onSubmit={onCreateDm} className="mt-4 grid gap-3">
                        <select
                          value={dmTo}
                          onChange={(e) => setDmTo(e.target.value)}
                          className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                          disabled={!me?.email}
                        >
                          {staffOptions.map((o) => (
                            <option key={o.email} value={o.email}>
                              {o.label}
                            </option>
                          ))}
                        </select>

                        <input
                          value={dmSubject}
                          onChange={(e) => setDmSubject(e.target.value)}
                          placeholder="Efni"
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                          disabled={!me?.email}
                        />

                        <select
                          value={dmAthleteId}
                          onChange={(e) => setDmAthleteId(e.target.value)}
                          className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                          disabled={!me?.email}
                        >
                          {athleteOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>

                        <textarea
                          value={dmFirst}
                          onChange={(e) => setDmFirst(e.target.value)}
                          placeholder="Skilaboð…"
                          className="w-full rounded-xl border px-3 py-2 text-sm min-h-[110px]"
                          disabled={!me?.email}
                        />

                        <button
                          disabled={
                            creatingDm ||
                            !me?.email ||
                            !dmTo ||
                            !dmSubject.trim() ||
                            !dmFirst.trim()
                          }
                          className={[
                            "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                            creatingDm ||
                            !me?.email ||
                            !dmTo ||
                            !dmSubject.trim() ||
                            !dmFirst.trim()
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-black hover:bg-zinc-800",
                          ].join(" ")}
                        >
                          {creatingDm ? "Stofna…" : "Senda"}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="rounded-2xl border bg-white p-5 text-sm text-gray-700">
                      <div className="font-semibold text-zinc-900">Staff view</div>
                      <div className="mt-1">
                        Þú sérð DM sem eru send til þín og getur svarað í þeim.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* GROUP threads list */}
                  <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-zinc-900">
                        Hópar
                      </div>
                      <button
                        onClick={refreshAll}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                      >
                        Refresh
                      </button>
                    </div>

                    {groupThreads.length === 0 ? (
                      <div className="mt-3 text-sm text-gray-600">
                        Engir hópar sýnilegir (þú þarft virka skráningu í hóp eða vera staff).
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {groupThreads.map((t) => {
                          const gid = t.group_id;
                          const isSel = String(gid) === String(groupId || "");
                          return (
                            <button
                              key={t.id}
                              onClick={() => pickGroup(gid)}
                              className={[
                                "w-full text-left rounded-2xl border p-3 hover:bg-gray-50",
                                isSel ? "border-zinc-900" : "",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-zinc-900 truncate">
                                    {t.group_name || `Hópur #${gid}`}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500 truncate">
                                    {t.subject}
                                  </div>
                                </div>
                                <div className="shrink-0 text-xs text-gray-500">
                                  {t.last_message_at}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border bg-white p-5 text-sm text-gray-700">
                    <div className="font-semibold text-zinc-900">Ath</div>
                    <div className="mt-1">
                      Iðkandi/forsjáraðili sér aðeins hópa þar sem hann á claim-aðan athlete með virka skráningu.
                      Staff sér alla hópa.
                    </div>
                  </div>
                </>
              )}
            </aside>

            {/* RIGHT */}
            <section className="md:col-span-7 lg:col-span-8">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                {tab === "dm" ? (
                  <>
                    {!dmId ? (
                      <div className="text-sm text-gray-600">
                        Veldu DM þráð vinstra megin (eða stofnaðu nýjan).
                      </div>
                    ) : dmLoading ? (
                      <div className="text-sm text-gray-500">Opna DM…</div>
                    ) : !dmData?.thread ? (
                      <div className="text-sm text-gray-600">DM þráður fannst ekki.</div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-xs text-gray-500">
                              DM #{dmData.thread.id}
                            </div>
                            <div className="text-xl font-bold text-zinc-900">
                              {dmData.thread.subject}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {viewerKind === "staff" ? "Frá" : "Til"}:{" "}
                              <span className="font-mono">
                                {formatWho(dmData.thread, viewerKind, staff)}
                              </span>{" "}
                              • Síðast: {dmData.thread.last_message_at}
                            </div>
                          </div>
                          {dmData.thread.athlete_id ? (
                            <Badge>Athlete #{dmData.thread.athlete_id}</Badge>
                          ) : null}
                        </div>

                        <div className="mt-5 space-y-3">
                          {(dmData.messages || []).map((m) => {
                            const mine =
                              (viewerKind === "staff" && m.sender_type === "staff") ||
                              (viewerKind === "user" && m.sender_type === "user");

                            return (
                              <div
                                key={m.id}
                                className={[
                                  "rounded-2xl border p-3",
                                  mine ? "bg-white" : "bg-gray-50",
                                ].join(" ")}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-zinc-800">
                                    {m.sender_type === "staff" ? "Staff" : "Þú"}
                                  </div>
                                  <div className="text-xs text-gray-500">{m.created_at}</div>
                                </div>
                                <div className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">
                                  {m.body}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <form onSubmit={onSendDm} className="mt-5 grid gap-2">
                          <textarea
                            value={dmBody}
                            onChange={(e) => setDmBody(e.target.value)}
                            placeholder="Skrifa svar…"
                            className="w-full rounded-2xl border px-3 py-2 text-sm min-h-[90px]"
                            disabled={!me?.email}
                          />
                          <button
                            disabled={dmSending || !me?.email || !dmBody.trim()}
                            className={[
                              "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                              dmSending || !me?.email || !dmBody.trim()
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-red-700 hover:bg-red-800",
                            ].join(" ")}
                          >
                            {dmSending ? "Sendi…" : "Senda"}
                          </button>
                        </form>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {!groupId ? (
                      <div className="text-sm text-gray-600">
                        Veldu hóp vinstra megin til að opna hópþráð.
                      </div>
                    ) : groupLoading ? (
                      <div className="text-sm text-gray-500">Opna hópþráð…</div>
                    ) : !groupData?.thread ? (
                      <div className="text-sm text-gray-600">Hópþráður fannst ekki.</div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-xs text-gray-500">
                              Hópur #{groupData.thread.group_id} • Þráður #{groupData.thread.id}
                            </div>
                            <div className="text-xl font-bold text-zinc-900">
                              {groupData.thread.subject}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Status: {groupData.thread.status} • Síðast:{" "}
                              {groupData.thread.last_message_at}
                            </div>
                          </div>
                          <Badge>Group chat</Badge>
                        </div>

                        <div className="mt-5 space-y-3">
                          {(groupData.messages || []).map((m) => {
                            const mine =
                              (viewerKind === "staff" && m.sender_type === "staff") ||
                              (viewerKind === "user" && m.sender_type === "user");

                            return (
                              <div
                                key={m.id}
                                className={[
                                  "rounded-2xl border p-3",
                                  mine ? "bg-white" : "bg-gray-50",
                                ].join(" ")}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-xs font-semibold text-zinc-800 truncate">
                                    {m.sender_type === "staff"
                                      ? `Staff (${m.sender_email})`
                                      : `Notandi (${m.sender_email})`}
                                  </div>
                                  <div className="text-xs text-gray-500">{m.created_at}</div>
                                </div>
                                <div className="mt-2 text-sm text-zinc-900 whitespace-pre-wrap">
                                  {m.body}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <form onSubmit={onSendGroup} className="mt-5 grid gap-2">
                          <textarea
                            value={groupBody}
                            onChange={(e) => setGroupBody(e.target.value)}
                            placeholder="Skrifa hópskilaboð…"
                            className="w-full rounded-2xl border px-3 py-2 text-sm min-h-[90px]"
                            disabled={!me?.email}
                          />
                          <button
                            disabled={groupSending || !me?.email || !groupBody.trim()}
                            className={[
                              "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                              groupSending || !me?.email || !groupBody.trim()
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-red-700 hover:bg-red-800",
                            ].join(" ")}
                          >
                            {groupSending ? "Sendi…" : "Senda"}
                          </button>
                        </form>
                      </>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
