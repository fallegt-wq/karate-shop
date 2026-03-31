import React, { useMemo, useState } from 'react';
import CourseCard from '../components/CourseCard';
import ProductCard from '../components/ProductCard';
import catalogItems from '../data/catalogItems';

const TABS = ['Allt', 'Búnaður', 'Æfingar / Námskeið'];

export default function StorefrontPage() {
  const [activeTab, setActiveTab] = useState('Allt');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchesTab =
        activeTab === 'Allt' ? true : item.category === activeTab;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0
          ? true
          : [
              item.title,
              item.brand,
              item.club,
              item.category,
              item.subcategory,
              item.ageLabel,
              item.location,
              item.schedule,
              item.description,
            ]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(q));

      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  const handleAddToCart = (item) => {
    console.log('Add to cart:', item);
  };

  const handleRegister = (item) => {
    console.log('Register flow start:', item);
    alert(`Skráningarflæði fyrir: ${item.title}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="inline-flex items-center rounded-xl bg-white border border-gray-200 px-4 py-2 font-semibold text-gray-900">
              Mitt svæði
            </div>

            <div className="text-sm text-gray-500">
              Innskráður notandi
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-5">
            Verslun og skráningar á einum stað. Veldu búnað eða skráðu iðkanda á námskeið.
          </p>

          <div className="flex flex-wrap gap-3 mb-5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Leita að búnaði, námskeiðum, aldri, staðsetningu..."
              className="w-full outline-none text-sm bg-transparent text-gray-800 placeholder:text-gray-400"
            />
          </div>
        </header>

        <section>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-3xl font-bold text-gray-900">
              {activeTab === 'Allt' ? 'Allt' : activeTab}
            </h1>

            <div className="text-sm text-gray-500">
              {filteredItems.length} niðurstöður
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
              Engar niðurstöður fundust.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => {
                if (item.type === 'course') {
                  return (
                    <CourseCard
                      key={item.id}
                      item={item}
                      onRegister={handleRegister}
                    />
                  );
                }

                return (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onAddToCart={handleAddToCart}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
