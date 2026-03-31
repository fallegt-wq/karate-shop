import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

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

function SimpleList({ items, emptyLabel }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-gray-500">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={item.id || `${item.title || "item"}-${idx}`}
          className="flex items-start justify-between gap-4 rounded-xl border p-4"
        >
          <div className="min-w-0">
            <div className="font-medium text-zinc-900">
              {item.title || "Ónefnt atriði"}
            </div>
            {item.meta ? (
              <div className="mt-1 text-sm text-gray-600">{item.meta}</div>
            ) : null}
          </div>
          {item.badge ? (
            <div className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {item.badge}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { clubSlug } = useParams();

  const [status, setStatus] = useState("loading");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      setStatus("loading");

      try {
        const res = await fetch(`/api/clubs/${clubSlug}/admin/dashboard`, {
          credentials: "include",
        });

        if (!alive) return;

        if (!res.ok) {
          throw new Error("Dashboard endpoint not available");
        }

        const data = await res.json();

        if (!alive) return;

        setSummary({
          stats: {
            ordersToday: data?.stats?.ordersToday ?? 0,
            revenueMonth: data?.stats?.revenueMonth ?? "0 kr.",
            unreadMessages: data?.stats?.unreadMessages ?? 0,
            pendingPayments: data?.stats?.pendingPayments ?? 0,
          },
          recentOrders: Array.isArray(data?.recentOrders) ? data.recentOrders : [],
          recentMessages: Array.isArray(data?.recentMessages) ? data.recentMessages : [],
          recentActivity: Array.isArray(data?.recentActivity) ? data.recentActivity : [],
        });

        setStatus("ready");
      } catch {
        if (!alive) return;

        setSummary({
          stats: {
            ordersToday: 0,
            revenueMonth: "0 kr.",
            unreadMessages: 0,
            pendingPayments: 0,
          },
          recentOrders: [],
          recentMessages: [],
          recentActivity: [],
        });

        setStatus("ready");
      }
    }

    loadDashboard();

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  const stats = useMemo(() => {
    return {
      ordersToday: summary?.stats?.ordersToday ?? 0,
      revenueMonth: summary?.stats?.revenueMonth ?? "0 kr.",
      unreadMessages: summary?.stats?.unreadMessages ?? 0,
      pendingPayments: summary?.stats?.pendingPayments ?? 0,
    };
  }, [summary]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Hleð stjórnborði…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Velkomin(n) í admin</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Yfirlit fyrir {clubSlug}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Hér sérðu stöðu klúbbsins í fljótu bragði. Þetta dashboard er grunnurinn
              að pantanastýringu, skráningum, skilaboðum, greiðslum og rekstraryfirsýn.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={`/c/${clubSlug}`}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Opna klúbbssíðu
            </Link>
            <Link
              to={`/c/${clubSlug}/admin/orders`}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Skoða pantanir
            </Link>
            <Link
              to={`/c/${clubSlug}/admin/registrations`}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Skoða skráningar
            </Link>
            <Link
              to={`/c/${clubSlug}/admin/theme`}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Breyta þema
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pantanir í dag"
          value={stats.ordersToday}
          subtitle="Nýjar pantanir frá miðnætti"
        />
        <StatCard
          title="Tekjur í mánuði"
          value={stats.revenueMonth}
          subtitle="Samantekt fyrir núverandi mánuð"
        />
        <StatCard
          title="Ólesin skilaboð"
          value={stats.unreadMessages}
          subtitle="Samtöl sem bíða athygli"
        />
        <StatCard
          title="Greiðslur í bið"
          value={stats.pendingPayments}
          subtitle="Atriði sem gætu þurft eftirfylgni"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Nýjustu pantanir"
          action={
            <Link
              to={`/c/${clubSlug}/admin/orders`}
              className="text-sm font-medium text-black hover:underline"
            >
              Opna pantanir
            </Link>
          }
        >
          {summary?.recentOrders?.length ? (
            <SimpleList
              items={summary.recentOrders}
              emptyLabel="Engar nýjar pantanir."
            />
          ) : (
            <EmptyState
              title="Engar pantanir sýnilegar enn"
              body="Þegar við tengjum pantanakerfið inn á dashboard birtast nýjustu pantanir hér með stöðu, upphæð og tíma."
              action={
                <Link
                  to={`/c/${clubSlug}/admin/orders`}
                  className="inline-flex rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                >
                  Fara í pantanir
                </Link>
              }
            />
          )}
        </SectionCard>

        <SectionCard
          title="Ný skilaboð"
          action={
            <span className="text-sm text-gray-500">Inbox kemur næst</span>
          }
        >
          {summary?.recentMessages?.length ? (
            <SimpleList
              items={summary.recentMessages}
              emptyLabel="Engin ný skilaboð."
            />
          ) : (
            <EmptyState
              title="Engin skilaboð sýnileg enn"
              body="Hér munu birtast nýjustu samtöl frá foreldrum, iðkendum eða viðskiptavinum þegar messaging admin verður tengt inn."
            />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Quick actions">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link
            to={`/c/${clubSlug}/admin/orders`}
            className="rounded-2xl border p-4 transition hover:bg-gray-50"
          >
            <div className="text-base font-semibold text-zinc-900">Pantanir</div>
            <div className="mt-1 text-sm text-gray-600">
              Skoða allar pantanir, leita, sía og undirbúa næstu admin actions.
            </div>
          </Link>

          <Link
            to={`/c/${clubSlug}/admin/registrations`}
            className="rounded-2xl border p-4 transition hover:bg-gray-50"
          >
            <div className="text-base font-semibold text-zinc-900">Skráningar</div>
            <div className="mt-1 text-sm text-gray-600">
              Skoða námskeiðaskráningar, stöðu og greiðslustöðu á einum stað.
            </div>
          </Link>

          <Link
            to={`/c/${clubSlug}/admin/theme`}
            className="rounded-2xl border p-4 transition hover:bg-gray-50"
          >
            <div className="text-base font-semibold text-zinc-900">Þema</div>
            <div className="mt-1 text-sm text-gray-600">
              Uppfæra liti, branding og club look.
            </div>
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Recent activity">
        {summary?.recentActivity?.length ? (
          <SimpleList
            items={summary.recentActivity}
            emptyLabel="Engin virkni sýnileg."
          />
        ) : (
          <EmptyState
            title="Activity feed tengist næst"
            body="Þegar við bætum við audit logs og admin actions mun öll mikilvæg virkni birtast hér: theme updates, pöntunarbreytingar, skráningabreytingar, skilaboð og fleira."
          />
        )}
      </SectionCard>
    </div>
  );
}
