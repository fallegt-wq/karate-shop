import React from 'react';

function formatISK(value) {
  return new Intl.NumberFormat('is-IS', {
    style: 'currency',
    currency: 'ISK',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CourseCard({ item, onRegister }) {
  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="aspect-[4/3] bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="px-6 text-center">
            <div className="inline-flex items-center rounded-full bg-red-600 text-white text-xs font-semibold px-3 py-1 mb-4">
              Námskeið
            </div>
            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">{item.club || 'Félag'}</div>
          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
            {item.title}
          </h3>
        </div>

        <div className="space-y-2 text-sm text-gray-700 mb-4">
          {item.ageLabel && (
            <div>
              <span className="font-medium text-gray-900">Aldur:</span>{' '}
              {item.ageLabel}
            </div>
          )}

          {item.schedule && (
            <div>
              <span className="font-medium text-gray-900">Tími:</span>{' '}
              {item.schedule}
            </div>
          )}

          {item.location && (
            <div>
              <span className="font-medium text-gray-900">Staðsetning:</span>{' '}
              {item.location}
            </div>
          )}

          {item.description && (
            <p className="text-sm text-gray-600 leading-6 pt-1">
              {item.description}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 mb-4">
          <div className="text-2xl font-bold text-red-600">
            {formatISK(item.price)}
          </div>

          {item.spotsLeft != null && (
            <div className="text-xs text-gray-500">
              {item.spotsLeft > 0
                ? `${item.spotsLeft} laus sæti`
                : 'Uppselt'}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRegister?.(item)}
          disabled={item.spotsLeft === 0}
          className="w-full rounded-xl bg-red-700 hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
        >
          {item.spotsLeft === 0 ? 'Uppselt' : 'Skrá'}
        </button>
      </div>
    </article>
  );
}
