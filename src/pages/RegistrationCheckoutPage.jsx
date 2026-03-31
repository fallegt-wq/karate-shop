import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createParticipant, createRegistration } from '../api/registrations';

function formatISK(value) {
  return new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function RegistrationCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const course = location.state?.course || null;
  const participant = location.state?.participant || null;

  const missingData = !course || !participant;

  const orderSummary = useMemo(() => {
    if (!course) return null;

    return {
      subtotal: course.price || 0,
      discount: 0,
      total: course.price || 0,
    };
  }, [course]);

  const handleCompleteRegistration = async () => {
    if (!course || !participant || !acceptTerms) return;

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      let participantId = participant.id;

      if (String(participantId).startsWith('p-')) {
        const createdParticipant = await createParticipant({
          fullName: participant.name,
          kennitala: participant.kennitala || '',
          birthDate: participant.birthDate || '',
        });

        participantId = createdParticipant.id;
      }

      const registration = await createRegistration({
        participantId,
        courseId: course.id,
        courseTitle: course.title,
        coursePrice: course.price || 0,
      });

      navigate('/registration/success', {
        state: {
          course,
          participant: {
            ...participant,
            id: participantId,
          },
          orderSummary,
          registration,
        },
      });
    } catch (error) {
      setErrorMessage(error.message || 'Villa kom upp við að vista skráningu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (missingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
          <div className="bg-white border border-gray-200 rounded-3xl p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Vantar skráningarupplýsingar
            </h1>
            <p className="text-gray-600 mb-6">
              Það vantar valið námskeið eða iðkanda til að halda áfram í checkout.
            </p>
            <Link
              to="/"
              className="inline-flex items-center rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold px-5 py-3"
            >
              Til baka í yfirlit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="text-sm font-medium text-red-700 hover:text-red-800"
          >
            ← Til baka í yfirlit
          </Link>
        </div>

        <div className="mb-8">
          <div className="text-sm font-semibold text-red-600 mb-2">
            Checkout
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Ljúka skráningu
          </h1>
          <p className="text-gray-600 mt-2">
            Eitt skref eftir. Staðfestu upplýsingar og kláraðu skráningu.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <section className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Iðkandi
              </h2>

              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="font-semibold text-gray-900">
                  {participant.name}
                </div>

                {participant.ageLabel && (
                  <div className="text-sm text-gray-500 mt-1">
                    {participant.ageLabel}
                  </div>
                )}

                {participant.kennitala && (
                  <div className="text-sm text-gray-500 mt-1">
                    {participant.kennitala}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Námskeið
              </h2>

              <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Heiti</div>
                  <div className="font-semibold text-gray-900 mt-1">
                    {course.title}
                  </div>
                </div>

                {course.ageLabel && (
                  <div>
                    <div className="text-sm text-gray-500">Aldur</div>
                    <div className="text-gray-900 mt-1">{course.ageLabel}</div>
                  </div>
                )}

                {course.schedule && (
                  <div>
                    <div className="text-sm text-gray-500">Tími</div>
                    <div className="text-gray-900 mt-1">{course.schedule}</div>
                  </div>
                )}

                {course.location && (
                  <div>
                    <div className="text-sm text-gray-500">Staðsetning</div>
                    <div className="text-gray-900 mt-1">{course.location}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Staðfesting
              </h2>

              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
                <p className="text-sm text-gray-600">
                  Næsta stóra skref eftir þetta er að tengja skráningu við raunverulega greiðslugátt og order/payment módelið.
                </p>
              </div>

              <label className="mt-5 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Ég staðfesti að upplýsingarnar séu réttar og samþykki skilmála félagsins.
                </span>
              </label>

              {errorMessage && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
            </div>
          </section>

          <aside className="bg-white border border-gray-200 rounded-3xl p-6 h-fit">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              Pöntunaryfirlit
            </h2>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Lína</div>
                <div className="font-semibold text-gray-900 mt-1">
                  {course.title}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Iðkandi: {participant.name}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Verð</span>
                  <span>{formatISK(orderSummary.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>Afsláttur</span>
                  <span>{formatISK(orderSummary.discount)}</span>
                </div>

                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Samtals</span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatISK(orderSummary.total)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompleteRegistration}
                disabled={!acceptTerms || isSubmitting}
                className="w-full rounded-xl bg-red-700 hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3"
              >
                {isSubmitting ? 'Vista skráningu...' : 'Staðfesta skráningu'}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3"
              >
                Til baka
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
