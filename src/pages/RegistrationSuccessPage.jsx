import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";

export default function RegistrationSuccessPage() {
  const { clubSlug } = useParams();
  const location = useLocation();

  const state = location.state || {};

  const buyerName = state?.buyerName || "";
  const buyerEmail = state?.buyerEmail || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center">
          
          {/* Success icon */}
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-2xl">✅</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Skráning móttekin
          </h1>

          {/* Subtitle */}
          <p className="text-gray-600 mb-6">
            Takk fyrir skráninguna
          </p>

          {/* Main message */}
          <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-700">
            Greiðslan hefur verið skráð og staðfest.
            <br />
            Hún ætti nú að birtast í kerfinu hjá félaginu.
          </div>

          {/* Buyer info */}
          {(buyerName || buyerEmail) && (
            <div className="mt-6 text-sm text-gray-600">
              {buyerName && <div>Nafn: {buyerName}</div>}
              {buyerEmail && <div>Netfang: {buyerEmail}</div>}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/c/${clubSlug}`}
              className="inline-flex items-center justify-center rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
            >
              Til baka í verslun
            </Link>

            <Link
              to={`/c/${clubSlug}/account/orders`}
              className="inline-flex items-center justify-center rounded-2xl border bg-white px-5 py-3 text-sm font-semibold hover:bg-gray-50"
            >
              Skoða pantanir
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
