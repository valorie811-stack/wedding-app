export const metadata = { title: "Offline — Two Weddings" };

export default function OfflinePage() {
  return (
    <div className="grid min-h-screen place-items-center bg-stone-50 px-6 text-center">
      <div className="card max-w-sm px-6 py-10">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-2xl">
          📡
        </div>
        <h1 className="font-serif text-lg font-semibold text-stone-900">You&apos;re offline</h1>
        <p className="mt-1 text-sm text-stone-500">
          Reconnect to load the latest. Pages you&apos;ve already opened may still work.
        </p>
      </div>
    </div>
  );
}
