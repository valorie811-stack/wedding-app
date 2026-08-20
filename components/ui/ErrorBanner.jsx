"use client";

import Icon from "@/components/ui/Icon";

// Toast for a write the database rejected.
//
// Fixed to the viewport rather than sitting in the page flow. These fire in
// response to an action anywhere in a long list — deleting the fortieth guest,
// editing the last budget line — and an in-flow banner at the top of the page
// renders off-screen from there. The row would flicker out and back with no
// visible explanation, which reads as a glitch rather than a reported failure.
//
// The plain sentence leads. The database's own wording is kept, because it is
// what makes a failure diagnosable, but folded away: "new row violates
// row-level security policy for table guests" is not a sentence to put in front
// of someone planning their wedding.
export default function ErrorBanner({ error, onDismiss, dismissLabel, detailsLabel }) {
  if (!error) return null;
  const { message, detail } = typeof error === "string" ? { message: error } : error;

  return (
    <div
      role="alert"
      // Above the topbar (z-20) and the mobile sidebar scrim (z-30), below a
      // modal (z-50) so a dialog still wins if one is somehow open.
      className="fixed inset-x-4 bottom-4 z-40 animate-fade-in rounded-xl border border-red-200 bg-red-50 shadow-lg shadow-stone-900/10 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-md"
      // Clears the iOS home indicator when installed as a PWA.
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 shrink-0 text-red-600">
          <Icon name="warning" size={16} />
        </span>
        <div className="min-w-0 flex-1 text-sm text-red-800">
          <p>{message}</p>
          {detail && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                {detailsLabel}
              </summary>
              <p className="mt-1 break-words font-mono text-xs text-red-700">{detail}</p>
            </details>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-red-500 hover:bg-red-100 hover:text-red-700"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
