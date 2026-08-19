"use client";

import Icon from "@/components/ui/Icon";

// Inline, dismissible banner for a write that the database rejected. Renders
// nothing when there is no message, so call sites can drop it in unconditionally.
export default function ErrorBanner({ message, onDismiss, dismissLabel }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <p className="flex items-start gap-2">
        <Icon name="warning" size={14} />
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        className="shrink-0 rounded-lg p-1 text-red-500 hover:bg-red-100 hover:text-red-700"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
