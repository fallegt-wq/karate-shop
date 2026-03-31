import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function formatISK(value) {
  return new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const MOCK_PARTICIPANTS = [
  {
    id: 'p1',
    name: 'Aron Gunnarsson',
    kennitala: '120615-1230',
    ageLabel: '10 ára',
  },
  {
    id: 'p2',
    name: 'Sara Jónsdóttir',
    kennitala: '030918-4560',
    ageLabel: '7 ára',
  },
];

export default function RegistrationModal({
  isOpen,
  course,
  onClose,
}) {
  const navigate = useNavigate();
  const { clubSlug } = useParams();

  const [step, setStep] = useState(1);
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newParticipant, setNewParticipant] = useState({
    name: '',
    kennitala: '',
    birthDate: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setSelectedParticipantId('');
    setShowCreateForm(false);
    setNewParticipant({
      name: '',
      kennitala: '',
      birthDate: '',
    });
  }, [isOpen, course]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const selectedParticipant = useMemo(() => {
    return participants.find((p) => p.id === selectedParticipantId) || null;
  }, [participants, selectedParticipantId]);

  if (!isOpen || !course) return null;

  const canContinueFromStep1 =
    selectedParticipantId || (
      showCreateForm &&
      newParticipant.name.trim() &&
      (newParticipant.kennitala.trim() || newParticipant.birthDate.trim())
    );

  const handleCreateParticipant = () => {
    const created = {
      id: `p-${Date.now()}`,
      name: newParticipant.name.trim(),
      kennitala: newParticipant.kennitala.trim(),
      birthDate: newParticipant.birthDate.trim(),
      ageLabel: newParticipant.birthDate
        ? `Fæðingardagur: ${newParticipant.birthDate}`
        : 'Nýr iðkandi',
    };

    const nextParticipants = [created, ...participants];
    setParticipants(nextParticipants);
    setSelectedParticipantId(created.id);
    setShowCreateForm(false);
    setStep(2);
  };

  const handleContinue = () => {
    if (!canContinueFromStep1) return;

    if (showCreateForm) {
      handleCreateParticipant();
      return;
    }

    setStep(2);
  };

  const handleGoToCheckout = () => {
    if (!selectedParticipant || !course) return;

    navigate(`/c/${clubSlug}/registration/checkout`, {
      state: {
        course,
        participant: selectedParticipant,
      },
    });

    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-red-600 mb-1">
                  Skráning
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {course.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Einfalt skref-fyrir-skref flæði fyrir foreldri.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-gray-300 w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400"
                aria-label="Loka"
              >
                ×
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      step >= 1
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    1
                  </div>
                  <span className={step >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    Velja iðkanda
                  </span>
                </div>

                <div className="flex-1 h-px bg-gray-200" />

                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      step >= 2
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    2
                  </div>
                  <span className={step >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                    Checkout
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-0 mt-5">
              <div className="px-6 pb-6">
                {step === 1 && (
                  <>
                    <div className="mb-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Veldu barn
                      </h3>
                      <p className="text-sm text-gray-600">
                        Veldu núverandi iðkanda eða stofnaðu nýjan.
                      </p>
                    </div>

                    <div className="space-y-3 mb-5">
                      {participants.map((participant) => {
                        const isSelected = selectedParticipantId === participant.id;

                        return (
                          <button
                            key={participant.id}
                            type="button"
                            onClick={() => {
                              setSelectedParticipantId(participant.id);
                              setShowCreateForm(false);
                            }}
                            className={`w-full text-left rounded-2xl border p-4 transition ${
                              isSelected
                                ? 'border-red-600 bg-red-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {participant.name}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {participant.ageLabel}
                                </div>
                                {participant.kennitala && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {participant.kennitala}
                                  </div>
                                )}
                              </div>

                              <div
                                className={`mt-1 w-5 h-5 rounded-full border-2 ${
                                  isSelected
                                    ? 'border-red-600 bg-red-600'
                                    : 'border-gray-300'
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-gray-200 pt-5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm((prev) => !prev);
                          setSelectedParticipantId('');
                        }}
                        className="text-sm font-semibold text-red-700 hover:text-red-800"
                      >
                        {showCreateForm ? 'Hætta við að stofna nýjan' : '+ Stofna nýjan iðkanda'}
                      </button>

                      {showCreateForm && (
                        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nafn iðkanda
                            </label>
                            <input
                              type="text"
                              value={newParticipant.name}
                              onChange={(e) =>
                                setNewParticipant((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="t.d. Aron Jónsson"
                              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Kennitala
                            </label>
                            <input
                              type="text"
                              value={newParticipant.kennitala}
                              onChange={(e) =>
                                setNewParticipant((prev) => ({
                                  ...prev,
                                  kennitala: e.target.value,
                                }))
                              }
                              placeholder="000000-0000"
                              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fæðingardagur
                            </label>
                            <input
                              type="date"
                              value={newParticipant.birthDate}
                              onChange={(e) =>
                                setNewParticipant((prev) => ({
                                  ...prev,
                                  birthDate: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="mb-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Halda áfram í checkout
                      </h3>
                      <p className="text-sm text-gray-600">
                        Nú förum við með valinn iðkanda og námskeið yfir á greiðslusíðu.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
                      <div>
                        <div className="text-sm text-gray-500">Iðkandi</div>
                        <div className="text-base font-semibold text-gray-900">
                          {selectedParticipant?.name}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500">Námskeið</div>
                        <div className="text-base font-semibold text-gray-900">
                          {course.title}
                        </div>
                      </div>

                      {course.schedule && (
                        <div>
                          <div className="text-sm text-gray-500">Tími</div>
                          <div className="text-base text-gray-900">
                            {course.schedule}
                          </div>
                        </div>
                      )}

                      {course.location && (
                        <div>
                          <div className="text-sm text-gray-500">Staðsetning</div>
                          <div className="text-base text-gray-900">
                            {course.location}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <aside className="bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 px-6 py-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Yfirlit
                </h3>

                <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Námskeið</div>
                    <div className="font-semibold text-gray-900 mt-1">
                      {course.title}
                    </div>
                  </div>

                  {selectedParticipant && (
                    <div>
                      <div className="text-sm text-gray-500">Valinn iðkandi</div>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        {selectedParticipant.name}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Samtals</span>
                    <span className="text-2xl font-bold text-red-600">
                      {formatISK(course.price)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {step === 1 && (
                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={!canContinueFromStep1}
                      className="w-full rounded-xl bg-red-700 hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3"
                    >
                      Halda áfram
                    </button>
                  )}

                  {step === 2 && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoToCheckout}
                        className="w-full rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold py-3"
                      >
                        Áfram í greiðslu
                      </button>

                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3"
                      >
                        Til baka
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3"
                  >
                    Loka
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
