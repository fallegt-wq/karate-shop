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

function formatMetadata(value) {
  if (!value) return "{}";

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return String(value);
  }
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

function AuditRow({ log, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(log)}
      className="block w-full rounded-xl border p-4 text-left transition hover:bg-gray-50"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-zinc-900">
            {log.action || "Óþekkt aðgerð"}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {log.entity_type || log.entityType || "Óþekkt entity"}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Skráð: {formatDate(log.created_at || log.createdAt)}
          </div>
        </div>

        <div className="xl:w-48 xl:text-right">
          <div className="text-sm text-gray-500">User</div>
          <div className="mt-1 text-sm font-semibold text-zinc-900">
            {log.user_id || log.userId || "Óþekktur notandi"}
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

function AuditDetails({ log, onClose }) {
  if (!log) return null;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-base font-semibold text-zinc-900">
            {log.action || "Óþekkt aðgerð"}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Detail view fyrir audit log upplýsingar
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
        <div className="rounded-xl border px-4">
          <DetailRow label="Action" value={log.action} />
          <DetailRow
            label="Entity type"
            value={log.entity_type || log.entityType}
          />
          <DetailRow
            label="Entity id"
            value={log.entity_id || log.entityId}
          />
          <DetailRow
            label="User"
            value={log.user_id || log.userId}
          />
          <DetailRow
            label="Created"
            value={formatDate(log.created_at || log.createdAt)}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">Metadata</div>
          <pre className="mt-3 overflow-x-auto rounded-xl border bg-white p-4 text-xs text-zinc-800">
            {formatMetadata(log.metadata)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function AdminAudit() {
  const { clubSlug } = useParams();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    let alive = true;

    async function fetchAuditLogs() {
      try {
        setLoading(true);

        const res = await fetch(`/api/clubs/${clubSlug}/audit`, {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!alive) return;

        const data = await res.json();
        const rows = Array.isArray(data?.logs) ? data.logs : [];

        setLogs(rows);
        setSelectedLog(rows[0] || null);
      } catch (err) {
        console.error("Failed to fetch audit logs", err);

        if (!alive) return;

        setLogs([]);
        setSelectedLog(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    fetchAuditLogs();

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      actions: new Set(logs.map((log) => log.action).filter(Boolean)).size,
    };
  }, [logs]);

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
            <div className="text-sm font-medium text-gray-500">Admin audit</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Audit logs fyrir {clubSlug}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Hér getur staff séð audit trail fyrir admin aðgerðir og skoðað
              metadata í sama stíl og admin dashboardið.
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
          title="All logs"
          value={stats.total}
          subtitle="Heildarfjöldi audit færslna"
        />
        <StatCard
          title="Actions"
          value={stats.actions}
          subtitle="Fjöldi mismunandi action týpa"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard
          title="Audit list"
          action={
            <span className="text-sm text-gray-500">{logs.length} sýnd</span>
          }
        >
          {logs.length === 0 ? (
            <EmptyState
              title="No audit logs found"
              body="Engar audit færslur komu frá API-inu enn sem komið er."
            />
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <AuditRow
                  key={log.id != null ? log.id : `audit-${index}`}
                  log={log}
                  onSelect={setSelectedLog}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Audit details"
          action={
            selectedLog ? (
              <span className="text-sm text-gray-500">
                Valin aðgerð {selectedLog.action}
              </span>
            ) : null
          }
        >
          {selectedLog ? (
            <AuditDetails
              log={selectedLog}
              onClose={() => setSelectedLog(null)}
            />
          ) : (
            <EmptyState
              title="Veldu audit færslu"
              body="Smelltu á færslu í listanum til að sjá nánari upplýsingar hægra megin."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
