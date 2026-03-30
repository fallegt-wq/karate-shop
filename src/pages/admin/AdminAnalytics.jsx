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

function InsightCard({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div className="text-gray-600">{label}</div>
      <div className="font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function SimpleListCard({ title, items, emptyLabel, valueLabel = "value" }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      {items && items.length > 0 ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id || item.label || item.month || `${title}-${index}`}
              className="flex items-center justify-between gap-4 rounded-xl border p-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-900">
                  {item.label || item.month || item.name || `Item ${index + 1}`}
                </div>
                {item.meta ? (
                  <div className="mt-1 text-sm text-gray-600">{item.meta}</div>
                ) : null}
              </div>
              <div className="shrink-0 text-sm font-semibold text-zinc-900">
                {item.value ?? item.count ?? item.total ?? valueLabel}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm text-gray-500">{emptyLabel}</div>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const { clubSlug } = useParams();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchAnalytics() {
    try {
      setLoading(true);

      const res = await fetch(`/api/clubs/${clubSlug}/analytics`, {
        credentials: "include",
      });

      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, [clubSlug]);

  const summary = useMemo(() => {
    return {
      totalRevenue: analytics?.revenue?.total ?? 0,
      monthlyRevenue: analytics?.revenue?.monthly ?? 0,
      totalMembers: analytics?.members?.total ?? 0,
      activeSubscriptions: analytics?.subscriptions?.active ?? 0,
      ordersTotal: analytics?.orders?.total ?? 0,
      ordersPaid: analytics?.orders?.paid ?? 0,
      membersActive: analytics?.members?.active ?? 0,
      subscriptionsChurned: analytics?.subscriptions?.churned ?? 0,
    };
  }, [analytics]);

  const revenueOverTime = Array.isArray(analytics?.revenueOverTime)
    ? analytics.revenueOverTime
    : Array.isArray(analytics?.revenue?.history)
    ? analytics.revenue.history
    : [];

  const signupsPerMonth = Array.isArray(analytics?.signupsPerMonth)
    ? analytics.signupsPerMonth
    : Array.isArray(analytics?.members?.signupsPerMonth)
    ? analytics.members.signupsPerMonth
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-zinc-900">
            No analytics data
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Analytics endpoint skilaði ekki gögnum fyrir þennan klúbb.
          </div>
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
              Admin analytics
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Analytics fyrir {clubSlug}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Hér sérðu high-level yfirlit yfir tekjur, meðlimi, pantanir og
              subscriptions í sama stíl og admin dashboardið.
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
          title="Total Revenue"
          value={formatAmount(summary.totalRevenue)}
          subtitle="Heildartekjur frá upphafi"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatAmount(summary.monthlyRevenue)}
          subtitle="Tekjur á núverandi tímabili"
        />
        <StatCard
          title="Total Members"
          value={summary.totalMembers}
          subtitle="Heildarfjöldi meðlima"
        />
        <StatCard
          title="Active Subscriptions"
          value={summary.activeSubscriptions}
          subtitle="Virkar recurring áskriftir"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard title="Orders">
          <MetricRow label="Total" value={summary.ordersTotal} />
          <MetricRow label="Paid" value={summary.ordersPaid} />
        </InsightCard>

        <InsightCard title="Members">
          <MetricRow label="Active" value={summary.membersActive} />
          <MetricRow label="Total" value={summary.totalMembers} />
        </InsightCard>

        <InsightCard title="Subscriptions">
          <MetricRow label="Active" value={summary.activeSubscriptions} />
          <MetricRow label="Churned" value={summary.subscriptionsChurned} />
        </InsightCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SimpleListCard
          title="Revenue Over Time"
          items={revenueOverTime}
          emptyLabel="Engin revenue history gögn sýnileg enn."
        />

        <SimpleListCard
          title="Signups Per Month"
          items={signupsPerMonth}
          emptyLabel="Engin signup trend gögn sýnileg enn."
        />
      </div>
    </div>
  );
}
