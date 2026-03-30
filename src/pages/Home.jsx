export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold">Karate Shop</h1>
        <p className="mt-2 text-gray-600">
          Prófaðu félag:
          {" "}
          <a className="underline" href="/c/shotokan-reykjavik">
            /c/shotokan-reykjavik
          </a>
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a className="rounded-2xl bg-white p-6 shadow hover:shadow-md transition" href="/c/shotokan-reykjavik">
            <div className="text-lg font-semibold">Shotokan Reykjavík</div>
            <div className="text-sm text-gray-600">Dæmi um clubSlug</div>
          </a>

          <a className="rounded-2xl bg-white p-6 shadow hover:shadow-md transition" href="/c/karate-keflavik">
            <div className="text-lg font-semibold">Karate Keflavík</div>
            <div className="text-sm text-gray-600">Dæmi um clubSlug</div>
          </a>
        </div>
      </div>
    </div>
  );
}
