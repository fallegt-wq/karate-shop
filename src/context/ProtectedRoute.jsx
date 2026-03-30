// FILE: src/context/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { clubSlug } = useParams();
  const { user, loading } = useAuth() || {};
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/c/${clubSlug}/account/login?next=${next}`} replace />;
  }

  return children;
}