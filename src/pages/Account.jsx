import React from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { clubSlug } = useParams();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl p-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-gray-500">My account</div>
              <h1 className="text-2xl font-bold">{clubSlug}</h1>
              <div className="mt-1 text-sm text-gray-700">
                Signed in as <span className="font-mono">{user?.email}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to={`/c/${clubSlug}`}
                className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                Shop
              </Link>
              <button
                onClick={logout}
                className="rounded-xl bg-black px-3 py-2 text-sm text-white"
              >
                Log out
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link
              to={`/c/${clubSlug}/account/athletes`}
              className="rounded-2xl border bg-white p-4 hover:bg-gray-50"
            >
              <div className="font-semibold">My athletes</div>
              <div className="text-sm text-gray-600">View and manage your athletes.</div>
            </Link>

            <Link
              to={`/c/${clubSlug}/account/messages`}
              className="rounded-2xl border bg-white p-4 hover:bg-gray-50"
            >
              <div className="font-semibold">Messages</div>
              <div className="text-sm text-gray-600">Contact coaches and the club.</div>
            </Link>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            Next: we will add athlete profiles (kennitala + guardians) and messaging UI.
          </div>
        </div>
      </div>
    </div>
  );
}
