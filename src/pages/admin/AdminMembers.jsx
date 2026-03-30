import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat("is-IS", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return String(value);
  }
}

function normalizeMemberStatus(value) {
  const status = String(value || "").trim().toUpperCase();

  if (["ACTIVE", "ENABLED", "CURRENT"].includes(status)) return "ACTIVE";
  if (["INACTIVE", "DISABLED", "ARCHIVED"].includes(status)) return "INACTIVE";

  return status || "UNKNOWN";
}

function memberStatusLabel(status) {
  const value = normalizeMemberStatus(status);

  if (value === "ACTIVE") return "Virkur";
  if (value === "INACTIVE") return "Óvirkur";

  return value;
}

function memberStatusClass(status) {
  const value = normalizeMemberStatus(status);

  if (value === "ACTIVE") return "bg-green-100 text-green-800";
  if (value === "INACTIVE") return "bg-gray-200 text-gray-700";

  return "bg-gray-100 text-gray-700";
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        {value}
      </div>
      {subtitle ? (
        <div className="mt-2 text-sm text-gray-600">{subtitle}</div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="text-base font-semibold text-zinc-900">{title}</div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-2xl border border-dashed bg-gray-50 p-6 text-center">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
      <div className="mx-auto mt-2 max-w-xl text-sm text-gray-600">{body}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function MemberRow({ member, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(member)}
      className="block w-full rounded-xl border p-4 text-left transition hover:bg-gray-50"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold text-zinc-900">
              {member.name || member.full_name || member.member_name || "Óþekktur meðlimur"}
            </div>
            <span
              className={[
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                memberStatusClass(member.status || member.member_status),
              ].join(" ")}
            >
              {memberStatusLabel(member.status || member.member_status)}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {member.email || member.member_email || "Ekkert netfang skráð"}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-900">Teymi</div>
          <div className="mt-1 text-sm text-gray-600">
            {Array.isArray(member.teams) && member.teams.length > 0
              ? member.teams.join(", ")
              : member.team_name || member.team || "Engin lið tengd"}
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b py-3 md:grid-cols-[180px_minmax(0,1fr)] md:gap-4">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="min-w-0 text-sm text-zinc-900">{value || "—"}</div>
    </div>
  );
}

function MemberDetails({
  member,
  onClose,
  actionLoading,
  selectedMember,
  handleMemberStatusChange,
}) {
  if (!member) return null;

  const teamsValue = Array.isArray(member.teams) && member.teams.length > 0
    ? member.teams.join(", ")
    : member.team_name || member.team || "—";

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-base font-semibold text-zinc-900">
            {member.name || member.full_name || member.member_name || "Óþekktur meðlimur"}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            CRM view fyrir admin upplýsingar um meðlim
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Loka
        </button>
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              memberStatusClass(member.status || member.member_status),
            ].join(" ")}
          >
            {memberStatusLabel(member.status || member.member_status)}
          </span>
        </div>

        <div className="rounded-xl border px-4">
          <DetailRow
            label="Nafn"
            value={member.name || member.full_name || member.member_name}
          />
          <DetailRow
            label="Netfang"
            value={member.email || member.member_email}
          />
          <DetailRow
            label="Staða"
            value={memberStatusLabel(member.status || member.member_status)}
          />
          <DetailRow
            label="Skráður"
            value={formatDate(
              member.joined_at || member.joinedAt || member.created_at || member.createdAt
            )}
          />
          <DetailRow label="Teymi" value={teamsValue} />
        </div>

        <div className="pt-4 border-t space-y-2">
          <button
            onClick={() => handleMemberStatusChange("ACTIVE")}
            disabled={
              actionLoading.activate ||
              selectedMember.status === "ACTIVE"
            }
            className="w-full rounded-xl bg-green-600 text-white py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedMember.status === "ACTIVE"
              ? "Already ACTIVE"
              : actionLoading.activate
              ? "Updating..."
              : "Activate Member"}
          </button>

          <button
            onClick={() => handleMemberStatusChange("INACTIVE")}
            disabled={
              actionLoading.deactivate ||
              selectedMember.status === "INACTIVE"
            }
            className="w-full rounded-xl bg-red-600 text-white py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedMember.status === "INACTIVE"
              ? "Already INACTIVE"
              : actionLoading.deactivate
              ? "Updating..."
              : "Deactivate Member"}
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">Næsta skref</div>
          <div className="mt-1 text-sm text-gray-600">
            Hér getum við næst bætt inn member notes, payment history, attendance
            og fullu CRM workflow fyrir admin teymið.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminMembers() {
  const { clubSlug } = useParams();

  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({
    activate: false,
    deactivate: false,
  });

  async function fetchMembers() {
    const res = await fetch(`/api/clubs/${clubSlug}/members`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Members request failed with status ${res.status}`);
    }

    const data = await res.json();
    const rows = Array.isArray(data?.members) ? data.members : [];
    setMembers(rows);
    setSelectedMember((prev) =>
      prev ? rows.find((member) => member.id === prev.id) || rows[0] || null : rows[0] || null
    );
  }

  useEffect(() => {
    let alive = true;

    async function loadMembers() {
      setLoading(true);

      try {
        await fetchMembers();
        if (!alive) return;
      } catch (error) {
        console.error("Failed to load admin members:", error);

        if (!alive) return;

        setMembers([]);
        setSelectedMember(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadMembers();

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  function updateMemberInState(updatedMember) {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );

    setSelectedMember((prev) =>
      prev && prev.id === updatedMember.id ? updatedMember : prev
    );
  }

  async function handleMemberStatusChange(nextStatus) {
    if (!selectedMember) return;

    const key = nextStatus === "ACTIVE" ? "activate" : "deactivate";

    try {
      setActionLoading((prev) => ({ ...prev, [key]: true }));

      const optimistic = { ...selectedMember, status: nextStatus };
      updateMemberInState(optimistic);

      const res = await fetch(
        `/api/clubs/${clubSlug}/members/${selectedMember.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      if (!res.ok) throw new Error("Failed to update member");

      const updated = await res.json();

      updateMemberInState(updated);
    } catch (err) {
      console.error("Member update failed", err);
      fetchMembers();
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return members.filter((member) => {
      if (!q) {
        return true;
      }

      const haystack = [
        member.name,
        member.full_name,
        member.member_name,
        member.email,
        member.member_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [members, query]);

  const stats = useMemo(() => {
    const activeCount = members.filter((member) => {
      const rawStatus = member.status || member.member_status;
      if (!rawStatus) {
        return true;
      }

      return normalizeMemberStatus(rawStatus) === "ACTIVE";
    }).length;

    return {
      total: members.length,
      active: activeCount || members.length,
    };
  }, [members]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Admin members</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Members fyrir {clubSlug}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Hér getur staff séð meðlimi klúbbsins, leitað í þeim og skoðað
              member details í sama stíl og admin dashboardið.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={`/c/${clubSlug}/admin`}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Til baka í admin
            </Link>
            <Link
              to={`/c/${clubSlug}`}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Opna klúbbssíðu
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Allir meðlimir"
          value={stats.total}
          subtitle="Heildarfjöldi meðlima"
        />
        <StatCard
          title="Virkir meðlimir"
          value={stats.active}
          subtitle="Fallback yfir í heildarfjölda ef staða vantar"
        />
      </div>

      <SectionCard title="Leit">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Leita í meðlimum
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Leita eftir nafni eða netfangi"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-black"
            />
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard
          title="Meðlimalisti"
          action={
            <span className="text-sm text-gray-500">
              {filteredMembers.length} sýndir
            </span>
          }
        >
          {filteredMembers.length === 0 ? (
            <EmptyState
              title="No members found"
              body={
                members.length === 0
                  ? "Engir meðlimir komu frá API-inu enn sem komið er."
                  : "Engir meðlimir passa við núverandi leit."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member, index) => (
                <MemberRow
                  key={member.id != null ? member.id : `member-${index}`}
                  member={member}
                  onSelect={setSelectedMember}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Member details"
          action={
            selectedMember ? (
              <span className="text-sm text-gray-500">
                Valinn meðlimur {selectedMember.name || selectedMember.full_name || selectedMember.member_name}
              </span>
            ) : null
          }
        >
          {selectedMember ? (
            <MemberDetails
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
              actionLoading={actionLoading}
              selectedMember={selectedMember}
              handleMemberStatusChange={handleMemberStatusChange}
            />
          ) : (
            <EmptyState
              title="Veldu meðlim"
              body="Smelltu á meðlim í listanum til að sjá nánari upplýsingar hægra megin."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
