// FILE: src/pages/account/RequireAuth.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { getMe } from "../../api/account.js";

export default function RequireAuth({ children }) {
  const { clubSlug } = useParams();
  const loc = useLocation();
  const [ok, setOk] = useState(null); // null=loading, false/true

  const next = encodeURIComponent(loc.pathname + (loc.search || ""));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await getMe();
        if (!alive) return;
        setOk(!!r?.user?.email);
      } catch {
        if (!alive) return;
        setOk(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [clubSlug]);

  if (ok === null) return null;

  if (!ok) {
    return (
      <Navigate to={`/c/${clubSlug}/account/login?next=${next}`} replace />
    );
  }

  return children;
}