import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Cortex</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xl">
        Open-source Second Brain Core. Ingest anything, embed everything,
        query your knowledge — with memory that thinks.
      </p>
      <div className="flex gap-4">
        <Link
          href="/docs"
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Read the Docs
        </Link>
        <Link
          href="https://github.com/yourusername/cortex"
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          GitHub
        </Link>
      </div>
    </main>
  );
}
