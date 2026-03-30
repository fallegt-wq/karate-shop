import React from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";

function Tab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-xl px-3 py-2 text-sm font-medium ${
          isActive
            ? "bg-black text-white"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function ClubAdminLayout() {
  const { clubSlug } = useParams();

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4 rounded-2xl bg-white p-4 shadow">
        <h1 className="text-xl font-bold">
          Club admin – <span className="font-mono">{clubSlug}</span>
        </h1>

        <div className="mt-4 flex flex-wrap gap-2">
          <Tab to={`/c/${clubSlug}/club/groups`}>Groups</Tab>
          <Tab to={`/c/${clubSlug}/club/athletes`}>Athletes</Tab>
          <Tab to={`/c/${clubSlug}/club/enrollments`}>Enrollments</Tab>
          <Tab to={`/c/${clubSlug}/club/payments`}>Payments</Tab>
          <Tab to={`/c/${clubSlug}/club/orders`}>Orders</Tab>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
