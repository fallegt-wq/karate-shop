import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

export default function AdminGuard({ children }) {
  const { clubSlug } = useParams();
  const [status, setStatus] = React.useState("loading");
  const [role, setRole] = React.useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setStatus("loading");

        const res = await fetch(`/api/clubs/${clubSlug}/me/role`, {
          credentials: "include",
        });

        if (!alive) return;

        if (!res.ok) {
          setRole(null);
          setStatus("ready");
          return;
        }

        const data = await res.json();

        if (!alive) return;

        setRole(data?.role || null);
        setStatus("ready");
      } catch {
        if (!alive) return;
        setRole(null);
        setStatus("ready");
      }
    })();

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl p-6 text-sm text-gray-600">
          Hleð admin aðgangi…
        </div>
      </div>
    );
  }

  if (role !== "staff") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-xl font-bold text-zinc-900">Access denied</div>
            <div className="mt-2 text-sm text-gray-700">
              Þú hefur ekki aðgang að þessu stjórnborði.
            </div>
            <Link
              to={`/c/${clubSlug}`}
              className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Til baka á klúbbssíðu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}