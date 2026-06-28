"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, isLocale, makeT } from "@/lib/i18n";

const AppContext = createContext(null);

const LS_LOCALE = "tw.locale";
const LS_SCOPE = "tw.scope";

export function AppProvider({ children, initialUser = null }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [scope, setScopeState] = useState("BOTH"); // "BOTH" | "HP" | "KK"
  const [user] = useState(initialUser);

  // Restore saved preferences after mount. localStorage is unavailable during
  // SSR, so this must run in an effect (not a lazy initializer); the one-time
  // sync from an external store is intentional, not a cascading render.
  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem(LS_LOCALE);
      const savedScope = localStorage.getItem(LS_SCOPE);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedLocale && isLocale(savedLocale)) setLocaleState(savedLocale);
      if (savedScope && ["BOTH", "HP", "KK"].includes(savedScope)) setScopeState(savedScope);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, []);

  function setLocale(code) {
    if (!isLocale(code)) return;
    setLocaleState(code);
    try {
      localStorage.setItem(LS_LOCALE, code);
      document.documentElement.lang = code;
    } catch {}
  }

  function setScope(s) {
    setScopeState(s);
    try {
      localStorage.setItem(LS_SCOPE, s);
    } catch {}
  }

  const t = useMemo(() => makeT(locale), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, scope, setScope, t, user }),
    [locale, scope, t, user]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
