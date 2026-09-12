"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, isLocale, makeT } from "@/lib/i18n";

const AppContext = createContext(null);

const LS_LOCALE = "tw.locale";
const LS_SCOPE = "tw.scope";

export function AppProvider({ children, initialUser = null }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [scope, setScopeState] = useState("BOTH"); // "BOTH" | "HP" | "KK"
  const [user] = useState(initialUser);

  // The single place the app language changes, so <html lang> can never fall
  // out of step with it. Restoring a saved locale used to call setLocaleState
  // directly and skip the lang attribute entirely: a returning Vietnamese or
  // Chinese reader got a page still announcing itself as English to screen
  // readers, hyphenation and font fallback.
  // useCallback so these keep a stable identity: they go into the context value
  // below, and a fresh function each render would rerender every consumer.
  const applyLocale = useCallback((code) => {
    setLocaleState(code);
    try {
      document.documentElement.lang = code;
    } catch {
      /* no document (SSR) — ignore */
    }
  }, []);

  // Restore saved preferences after mount. localStorage is unavailable during
  // SSR, so this must run in an effect (not a lazy initializer); the one-time
  // sync from an external store is intentional, not a cascading render.
  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem(LS_LOCALE);
      const savedScope = localStorage.getItem(LS_SCOPE);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedLocale && isLocale(savedLocale)) applyLocale(savedLocale);
      if (savedScope && ["BOTH", "HP", "KK"].includes(savedScope)) setScopeState(savedScope);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [applyLocale]);

  const setLocale = useCallback(
    (code) => {
      if (!isLocale(code)) return;
      applyLocale(code);
      try {
        localStorage.setItem(LS_LOCALE, code);
      } catch {}
    },
    [applyLocale]
  );

  const setScope = useCallback((s) => {
    setScopeState(s);
    try {
      localStorage.setItem(LS_SCOPE, s);
    } catch {}
  }, []);

  const t = useMemo(() => makeT(locale), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, scope, setScope, t, user }),
    [locale, setLocale, scope, setScope, t, user]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
