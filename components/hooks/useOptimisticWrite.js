"use client";

import { useCallback, useState } from "react";

// Id for a row that exists on screen but not yet in the database. The database
// assigns the real id on insert; until then the row carries one of these.
//
// Previously new rows were given a plain `crypto.randomUUID()`, which looks
// exactly like a real database id. Nothing adopted the id the insert returned,
// so the next edit or delete sent a `WHERE id = <uuid the database never
// issued>` — matching no row, reporting success, and silently doing nothing.
// The prefix makes "not saved yet" visible, and `run` swaps in the real id.
export const newTempId = () => `pending-${crypto.randomUUID()}`;

// Shared plumbing for the optimistic-write pattern every module view uses:
// apply the change locally so the UI stays responsive, call the server action,
// then reconcile with what actually happened.
//
// The server actions report failure by *returning* `{ ok: false, error }`
// rather than throwing, so the `.catch(() => {})` these call sites used to end
// with never ran — a save that the database rejected still looked saved until
// the page was reloaded. `run` inspects the returned result, puts the local
// state back via `revert`, and surfaces the reason.
// The reconciliation itself, free of React so it can be exercised directly.
//
// apply()   – mutate local state now (optimistic)
// action()  – call the server action; resolves to { ok, error?, id? }
// revert()  – undo `apply` when the write failed
// adopt(id) – swap the placeholder id for the one the database assigned
// message   – plain-language sentence for the banner
// setError  – receives null on success, { message, detail } on failure
export async function performWrite({ apply, action, revert, adopt, message, setError }) {
  apply?.();
  setError(null);

  // A server action that throws (network drop, serialization failure) and one
  // that returns { ok: false } are the same thing to the caller.
  const res = await Promise.resolve()
    .then(action)
    .catch((e) => ({ ok: false, error: String(e?.message || e) }));

  if (!res?.ok) {
    revert?.();
    // Keep the database's wording out of the headline but never lose it — it is
    // what made the original preview-mode bug diagnosable in the first place.
    if (res?.error) console.error("[write] action failed:", res.error);
    setError({ message, detail: res?.error ?? null });
    return null;
  }
  if (res.id) adopt?.(res.id);
  return res;
}

export default function useOptimisticWrite() {
  const [error, setError] = useState(null);
  const dismissError = useCallback(() => setError(null), []);
  const run = useCallback((opts) => performWrite({ ...opts, setError }), []);
  return { error, dismissError, run };
}
