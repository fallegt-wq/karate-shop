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
      <div className="p-6 text-sm text-gray-600">
        Hleð admin aðgangi…
      </div>
    );
  }

  if (role !== "staff") {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-white p-6">
          <h1 className="text-lg font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            Þú hefur ekki aðgang að admin svæðinu.
          </p>
          <Link
            to={`/c/${clubSlug}`}
            className="mt-4 inline-block text-sm text-blue-600"
          >
            Til baka
          </Link>
        </div>
      </div>
    );
  }

  return children;
}