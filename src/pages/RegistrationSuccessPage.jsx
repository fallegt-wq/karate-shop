import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function formatISK(value) {
  return new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function RegistrationSuccessPage() {
  const location = useLocation();

  const course = location.state?.course || null;
  const participant = location.state?.participant || null;
  const orderSummary = location.state?.orderSummary || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-10">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl mb-6">
            ✓
          </div>

          <div className="text-sm font-semibold text-green-700 mb-2">
            Skráning staðfest
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Takk fyrir skráninguna
          </h1>

          <p className="text-gray-600 mb-8">
            Skráningin hefur verið móttekin og næsta skref er að tengja þetta við raunverulegt payment + registration backend.
          </p>

          <div className="rounded-2xl border border-gray-200 p-6 space-y-5 mb-8">
            {participant && (
              <div>
                <div className="text-sm text-gray-500">Iðkandi</div>
                <div className="font-semibold text-gray-900 mt-1">
                  {participant.name}
                </div>
              </div>
            )}

            {course && (
              <div>
                <div className="text-sm text-gray-500">Námskeið</div>
                <div className="font-semibold text-gray-900 mt-1">
                  {course.title}
                </div>
              </div>
            )}

            {course?.schedule && (
              <div>
                <div className="text-sm text-gray-500">Tími</div>
                <div className="text-gray-900 mt-1">{course.schedule}</div>
              </div>
            )}

            {course?.location && (
              <div>
                <div className="text-sm text-gray-500">Staðsetning</div>
                <div className="text-gray-900 mt-1">{course.location}</div>
              </div>
            )}

            {orderSummary && (
              <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-gray-600">Greitt samtals</span>
                <span className="text-2xl font-bold text-red-600">
                  {formatISK(orderSummary.total)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold px-5 py-3"
            >
              Til baka í yfirlit
            </Link>

            <Link
              to="/my-area"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-5 py-3"
            >
              Fara í Mitt svæði
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
