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

  if (["PAID", "COMPLETED", "SUCCESS"].includes(status)) return "PAID";
  if (["PENDING", "OPEN", "CREATED"].includes(status)) return "PENDING";
  if (["FAILED", "CANCELLED", "CANCELED", "DECLINED"].includes(status)) {
    return "FAILED";
  }

  return status || "UNKNOWN";
}

function statusLabel(status) {
  const value = normalizeStatus(status);

  if (value === "PAID") return "Greitt";
  if (value === "PENDING") return "Í bið";
  if (value === "FAILED") return "Mistókst";

  return value;
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "PAID") return "bg-green-100 text-green-800";
  if (value === "PENDING") return "bg-amber-100 text-amber-800";
  if (value === "FAILED") return "bg-red-100 text-red-800";

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

function PaymentRow({ payment, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(payment)}
      className="block w-full rounded-xl border p-4 text-left transition hover:bg-gray-50"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold text-zinc-900">
              {payment.member_name ||
                payment.buyer_name ||
                payment.name ||
                "Óþekktur greiðandi"}
            </div>
            <span
              className={[
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                statusClass(payment.status),
              ].join(" ")}
            >
              {statusLabel(payment.status)}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {payment.team_name || payment.team || "Ekkert lið tengt"}
          </div>

          <div className="mt-2 text-sm text-gray-500">
            Skráð:{" "}
            {formatDate(payment.created_at || payment.createdAt || payment.date)}
          </div>
        </div>

        <div className="xl:w-40 xl:text-right">
          <div className="text-sm text-gray-500">Upphæð</div>
          <div className="mt-1 text-lg font-bold text-zinc-900">
            {formatAmount(payment.amount)}
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

function PaymentDetails({ payment, onClose }) {
  if (!payment) return null;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-base font-semibold text-zinc-900">
            {payment.member_name ||
              payment.buyer_name ||
              payment.name ||
              "Óþekktur greiðandi"}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Detail view fyrir næstu admin skref í fjármálayfirliti
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
              statusClass(payment.status),
            ].join(" ")}
          >
            {statusLabel(payment.status)}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {formatAmount(payment.amount)}
          </span>
        </div>

        <div className="rounded-xl border px-4">
          <DetailRow
            label="Greiðandi"
            value={payment.member_name || payment.buyer_name || payment.name}
          />
          <DetailRow label="Lið" value={payment.team_name || payment.team} />
          <DetailRow label="Upphæð" value={formatAmount(payment.amount)} />
          <DetailRow label="Staða" value={statusLabel(payment.status)} />
          <DetailRow
            label="Stofnað"
            value={formatDate(
              payment.created_at || payment.createdAt || payment.date
            )}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-dashed bg-gray-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">Næsta skref</div>
          <div className="mt-1 text-sm text-gray-600">
            Hér getum við næst bætt inn refunds, invoice tengingum,
            payment-provider detailum og fullu finance workflow fyrir admin.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPayments() {
  const { clubSlug } = useParams();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function fetchPayments() {
    try {
      setLoading(true);

      const res = await fetch(`/api/clubs/${clubSlug}/payments`, {
        credentials: "include",
      });

      const data = await res.json();
      const rows = data.payments || [];
      setPayments(rows);
      setSelectedPayment((prev) =>
        prev
          ? rows.find((payment) => payment.id === prev.id) || rows[0] || null
          : rows[0] || null
      );
    } catch (err) {
      console.error("Failed to fetch payments", err);
      setPayments([]);
      setSelectedPayment(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, [clubSlug]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (statusFilter === "ALL") return true;
      return normalizeStatus(payment.status) === statusFilter;
    });
  }, [payments, statusFilter]);

  const totalRevenue = useMemo(() => {
    return payments
      .filter((payment) => normalizeStatus(payment.status) === "PAID")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [payments]);

  const totalPayments = payments.length;

  const pendingPayments = useMemo(() => {
    return payments.filter(
      (payment) => normalizeStatus(payment.status) === "PENDING"
    ).length;
  }, [payments]);

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
              Admin payments
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Payments fyrir {clubSlug}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Hér getur staff séð greiðsluyfirlit klúbbsins, síað eftir stöðu og
              skoðað detail upplýsingar í sama stíl og admin dashboardið.
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
          title="Heildartekjur"
          value={formatAmount(totalRevenue)}
          subtitle="Samtala greiddra færslna"
        />
        <StatCard
          title="Fjöldi greiðslna"
          value={totalPayments}
          subtitle="Heildarfjöldi færslna"
        />
        <StatCard
          title="Í bið"
          value={pendingPayments}
          subtitle="Greiðslur sem bíða afgreiðslu"
        />
      </div>

      <SectionCard title="Sía eftir stöðu">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-xl p-2 text-sm"
        >
          <option value="ALL">All</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <SectionCard
          title="Greiðslulisti"
          action={
            <span className="text-sm text-gray-500">
              {filteredPayments.length} sýndar
            </span>
          }
        >
          {filteredPayments.length === 0 ? (
            <EmptyState
              title="No payments found"
              body={
                payments.length === 0
                  ? "Engar greiðslur komu frá API-inu enn sem komið er."
                  : "Engar greiðslur passa við núverandi stöðusíu."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((payment, index) => (
                <PaymentRow
                  key={payment.id != null ? payment.id : `payment-${index}`}
                  payment={payment}
                  onSelect={setSelectedPayment}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Payment details"
          action={
            selectedPayment ? (
              <span className="text-sm text-gray-500">
                Valin greiðsla{" "}
                {selectedPayment.member_name ||
                  selectedPayment.buyer_name ||
                  selectedPayment.name}
              </span>
            ) : null
          }
        >
          {selectedPayment ? (
            <PaymentDetails
              payment={selectedPayment}
              onClose={() => setSelectedPayment(null)}
            />
          ) : (
            <EmptyState
              title="Veldu greiðslu"
              body="Smelltu á greiðslu í listanum til að sjá nánari upplýsingar hægra megin."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
