// src/components/RequireSession.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useParams, Navigate } from "react-router-dom";

export default function RequireSession({ children }) {
  const { clubSlug } = useParams();
  const loc = useLocation();

  const [ok, setOk] = useState(null); // null = loading, true/false

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
        });
        if (!alive) return;
        setOk(res.ok);
      } catch {
        if (!alive) return;
        setOk(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (ok === null) return null;

  if (!ok) {
    const next = loc.pathname + (loc.search || "");
    return (
      <Navigate
        to={`/c/${clubSlug}/account/login?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  return children;
}
