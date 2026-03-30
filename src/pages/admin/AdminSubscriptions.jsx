import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

function formatAmount(value) {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("is-IS", {
      style: "currency",
      currency: "ISK",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} kr.`;
  }
}

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

function normalizeStatus(value) {
  const status = String(value || "").trim().toUpperCase();

  if (["ACTIVE", "RUNNING", "CURRENT"].includes(status)) return "ACTIVE";
  if (["PAUSED", "ON_HOLD"].includes(status)) return "PAUSED";
  if (["CANCELLED", "CANCELED", "ENDED"].includes(status)) return "CANCELLED";

  return status || "UNKNOWN";
}

function statusLabel(status) {
  const value = normalizeStatus(status);

  if (value === "ACTIVE") return "Virkt";
  if (value === "PAUSED") return "Í bið";
  if (value === "CANCELLED") return "Hætt við";

  return value;
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "ACTIVE") return "bg-green-100 text-green-800";
  if (value === "PAUSED") return "bg-amber-100 text-amber-800";
  if (value === "CANCELLED") return "bg-red-100 text-red-800";

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

function SubscriptionRow({ subscription, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(subscription)}
      className="block w-full rounded-xl border p-4 text-left transition hover:bg-gray-50"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold text-zinc-900">
              {subscription.member_name ||
                subscription.buyer_name ||
                subscription.name ||
                "Óþekktur áskrifandi"}
            </div>
            <span
              className={[
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                statusClass(subscription.status),
              ].join(" ")}
            >
              {statusLabel(subscription.status)}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {subscription.team_name || subscription.team || "Ekkert lið tengt"}
          </div>
        </div>

        <div className="xl:w-40 xl:text-right">
          <div className="text-sm text-gray-500">Upphæð</div>
          <div className="mt-1 text-lg font-bold text-zinc-900">
            {formatAmount(subscription.amount)}
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

function SubscriptionDetails({ subscription, onClose }) {
  if (!subscription) return null;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-base font-semibold text-zinc-900">
            {subscription.member_name ||
              subscription.buyer_name ||
              subscription.name ||
              "Óþekktur áskrifandi"}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Detail view fyrir næstu admin skref í endurteknum greiðslum
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
              statusClass(subscription.status),
            ].join(" ")}
          >
            {statusLabel(subscription.status)}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {formatAmount(subscription.amount)}
          </span>
        </div>

        <div className="rounded-xl border px-4">
          <DetailRow
            label="Áskrifandi"
            value={
              subscription.member_name ||
              subscription.buyer_name ||
              subscription.name
            }
          />
          <DetailRow
            label="Lið"
            value={subscription.team_name || subscription.team}
          />
          <DetailRow
            label="Upphæð"
            value={formatAmount(subscription.amount)}
          />
          <DetailRow
            label="Staða"
            value={statusLabel(subscription.status)}
          />
          <DetailRow
            label="Billing cycle"
            value={
              subscription.billing_cycle ||
              subscription.billingCycle ||
              subscription.interval
            }
          />
          <DetailRow
            label="Next billing"
            value={formatDate(
              subscription.next_billing_at ||
                subscription.nextBillingAt ||
                subscription.next_billing_date
            )}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">Næsta skref</div>
          <div className="mt-1 text-sm text-gray-600">
            Hér getum við næst bætt inn dunning, retry history, provider sync
            og fullu workflow fyrir recurring billing admin.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSubscriptions() {
  const { clubSlug } = useParams();

  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function fetchSubscriptions() {
    try {
      setLoading(true);

      const res = await fetch(`/api/clubs/${clubSlug}/subscriptions`, {
        credentials: "include",
      });

      const data = await res.json();
      const rows = data.subscriptions || [];
      setSubscriptions(rows);
      setSelectedSubscription((prev) =>
        prev
          ? rows.find((subscription) => subscription.id === prev.id) ||
            rows[0] ||
            null
          : rows[0] || null
      );
    } catch (err) {
      console.error("Failed to fetch subscriptions", err);
      setSubscriptions([]);
      setSelectedSubscription(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubscriptions();
  }, [clubSlug]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => {
      if (statusFilter === "ALL") return true;
      return normalizeStatus(subscription.status) === statusFilter;
    });
  }, [subscriptions, statusFilter]);

  const activeSubscriptions = useMemo(() => {
    return subscriptions.filter(
      (subscription) => normalizeStatus(subscription.status) === "ACTIVE"
    ).length;
  }, [subscriptions]);

  const monthlyRevenue = useMemo(() => {
    return subscriptions
      .filter((subscription) => normalizeStatus(subscription.status) === "ACTIVE")
      .reduce((sum, subscription) => sum + Number(subscription.amount || 0), 0);
  }, [subscriptions]);

  const totalSubscriptions = subscriptions.length;

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
            <div className="text-sm font-medium text-gray-500">
              Admin subscriptions
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Subscriptions fyrir {clubSlug}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Hér getur staff séð yfirlit yfir endurteknar greiðslur, síað eftir
              stöðu og skoðað detail upplýsingar í sama stíl og admin dashboardið.
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
          title="Virkar áskriftir"
          value={activeSubscriptions}
          subtitle="Áskriftir í fullri keyrslu"
        />
        <StatCard
          title="Mánaðarlegar tekjur"
          value={formatAmount(monthlyRevenue)}
          subtitle="Samtala virkra recurring greiðslna"
        />
        <StatCard
          title="Allar áskriftir"
          value={totalSubscriptions}
          subtitle="Heildarfjöldi áskrifta"
        />
      </div>

      <SectionCard title="Sía eftir stöðu">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-xl p-2 text-sm"
        >
          <option value="ALL">All</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard
          title="Áskriftalisti"
          action={
            <span className="text-sm text-gray-500">
              {filteredSubscriptions.length} sýndar
            </span>
          }
        >
          {filteredSubscriptions.length === 0 ? (
            <EmptyState
              title="No subscriptions found"
              body={
                subscriptions.length === 0
                  ? "Engar áskriftir komu frá API-inu enn sem komið er."
                  : "Engar áskriftir passa við núverandi stöðusíu."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredSubscriptions.map((subscription, index) => (
                <SubscriptionRow
                  key={
                    subscription.id != null
                      ? subscription.id
                      : `subscription-${index}`
                  }
                  subscription={subscription}
                  onSelect={setSelectedSubscription}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Subscription details"
          action={
            selectedSubscription ? (
              <span className="text-sm text-gray-500">
                Valin áskrift{" "}
                {selectedSubscription.member_name ||
                  selectedSubscription.buyer_name ||
                  selectedSubscription.name}
              </span>
            ) : null
          }
        >
          {selectedSubscription ? (
            <SubscriptionDetails
              subscription={selectedSubscription}
              onClose={() => setSelectedSubscription(null)}
            />
          ) : (
            <EmptyState
              title="Veldu áskrift"
              body="Smelltu á áskrift í listanum til að sjá nánari upplýsingar hægra megin."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
