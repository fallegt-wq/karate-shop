import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchAdminRegistrations,
  updateAdminRegistration,
} from '../../api/adminRegistrations';

function formatISK(value) {
  return new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('is-IS', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
];

export default function AdminRegistrations() {
  const { clubSlug } = useParams();

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        const data = await fetchAdminRegistrations(clubSlug);
        if (!alive) return;
        setItems(Array.isArray(data?.registrations) ? data.registrations : []);
      } catch (error) {
        if (!alive) return;
        setErrorMessage(error.message || 'Ekki tókst að hlaða skráningum');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' ? true : item.status === statusFilter;

      const matchesPayment =
        paymentFilter === 'all'
          ? true
          : item.paymentStatus === paymentFilter;

      const matchesSearch =
        q.length === 0
          ? true
          : [
              item.participantName,
              item.participantKennitala,
              item.courseTitle,
              item.status,
              item.paymentStatus,
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(q));

      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [items, paymentFilter, search, statusFilter]);

  const handleUpdate = async (id, payload) => {
    try {
      const updated = await updateAdminRegistration(clubSlug, id, payload);

      setItems((current) =>
        current.map((item) => (item.id === id ? updated.registration : item))
      );
    } catch (error) {
      alert(error.message || 'Ekki tókst að uppfæra skráningu');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 text-sm font-semibold text-red-600">Admin</div>
              <h1 className="text-3xl font-bold text-gray-900">Skráningar</h1>
              <p className="mt-2 text-gray-600">
                Yfirlit yfir námskeiðaskráningar fyrir {clubSlug}.
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

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Alls</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {items.length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {items.filter((item) => item.status === 'pending').length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Unpaid</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {items.filter((item) => item.paymentStatus === 'unpaid').length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Paid</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {items.filter((item) => item.paymentStatus === 'paid').length}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Leita að iðkanda, námskeiði, kennitölu..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500"
            >
              <option value="all">Öll status</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500"
            >
              <option value="all">Öll payment status</option>
              {PAYMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-gray-600">
            Hleð skráningum...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="rounded-3xl border border-red-200 bg-white p-6 text-red-700">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && filteredItems.length === 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-gray-500">
            Engar skráningar fundust.
          </div>
        )}

        {!loading && !errorMessage && filteredItems.length > 0 && (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-gray-200 bg-white p-5"
              >
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr_0.8fr]">
                  <div>
                    <div className="text-sm text-gray-500">Skráning #{item.id}</div>
                    <div className="mt-1 text-xl font-bold text-gray-900">
                      {item.courseTitle}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                      <div>
                        <span className="font-medium text-gray-900">Iðkandi:</span>{' '}
                        {item.participantName}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Kennitala:</span>{' '}
                        {item.participantKennitala || '—'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Verð:</span>{' '}
                        {formatISK(item.coursePrice)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Stofnað:</span>{' '}
                        {formatDate(item.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-sm font-medium text-gray-900">
                      Uppfæra stöðu
                    </div>

                    <div className="space-y-3">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleUpdate(item.id, { status: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={item.paymentStatus}
                        onChange={(e) =>
                          handleUpdate(item.id, {
                            paymentStatus: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500"
                      >
                        {PAYMENT_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-sm font-medium text-gray-900">
                      Núverandi staða
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="mb-1 text-xs text-gray-500">Status</div>
                        <div className="font-semibold text-gray-900">
                          {item.status}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="mb-1 text-xs text-gray-500">Payment</div>
                        <div className="font-semibold text-gray-900">
                          {item.paymentStatus}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
