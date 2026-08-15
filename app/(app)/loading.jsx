// Route-group loading UI: shown instantly inside the app shell while a tab's
// server component fetches its data. Keeps the sidebar/topbar interactive and
// gives immediate feedback on tab switches (all pages are force-dynamic).
export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      {/* Page title */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-stone-100" />
        <div className="h-4 w-72 rounded bg-stone-100/70" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-stone-100 bg-white p-4">
            <div className="h-3 w-16 rounded bg-stone-100" />
            <div className="mt-3 h-6 w-20 rounded bg-stone-100" />
          </div>
        ))}
      </div>

      {/* Content blocks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl border border-stone-100 bg-white" />
        <div className="h-64 rounded-2xl border border-stone-100 bg-white" />
      </div>
    </div>
  );
}
