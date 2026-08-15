"use client";

import { useEffect } from "react";
import { cx } from "@/lib/cx";
import Icon from "@/components/ui/Icon";

// Lightweight accessible modal: backdrop click + Escape to close, body scroll
// lock while open. No portal — fixed positioning is enough for this app.
export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "card max-h-[92vh] w-full overflow-y-auto rounded-b-none rounded-t-2xl shadow-pop animate-fade-in sm:rounded-2xl",
          width
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h3 className="font-serif text-lg font-semibold text-stone-900">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
