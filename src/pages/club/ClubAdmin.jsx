import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

import ClubAdminLayout from "./ClubAdminLayout.jsx";
import GroupsPage from "./GroupsPage.jsx";
import AthletesPage from "./AthletesPage.jsx";
import EnrollmentsPage from "./EnrollmentsPage.jsx";
import PaymentsAdmin from "./PaymentsAdmin.jsx";

// Gamla orders UI-ið er í pages rótinni, svo við förum upp um eina möppu:
import ClubDashboard from "../ClubDashboard";
import OrderDetails from "../OrderDetails";

export default function ClubAdmin() {
  const { clubSlug } = useParams();

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={`/c/${clubSlug}/club/groups`} replace />}
      />

      <Route element={<ClubAdminLayout />}>
        <Route path="groups" element={<GroupsPage />} />
        <Route path="athletes" element={<AthletesPage />} />
        <Route path="enrollments" element={<EnrollmentsPage />} />
        <Route path="payments" element={<PaymentsAdmin />} />
      </Route>

      <Route path="orders" element={<ClubDashboard />} />
      <Route path="orders/:orderId" element={<OrderDetails />} />
    </Routes>
  );
}
