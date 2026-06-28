import en from "./en";
import vi from "./vi";
import zh from "./zh";

export const LOCALES = [
  { code: "en", label: "English", short: "EN" },
  { code: "vi", label: "Tiếng Việt", short: "VI" },
  { code: "zh", label: "中文", short: "中" },
];

export const DEFAULT_LOCALE = "en";

const DICTS = { en, vi, zh };

// Resolve a dotted key path ("dashboard.title") against a dictionary.
function lookup(dict, path) {
  return path.split(".").reduce((node, key) => (node == null ? node : node[key]), dict);
}

// Build a translator for a locale. Falls back to English, then the raw key.
export function makeT(locale) {
  const dict = DICTS[locale] || DICTS[DEFAULT_LOCALE];
  return function t(key, vars) {
    let value = lookup(dict, key);
    if (value == null) value = lookup(DICTS[DEFAULT_LOCALE], key);
    if (value == null) return key;
    if (vars && typeof value === "string") {
      return value.replace(/\{(\w+)\}/g, (m, name) =>
        vars[name] != null ? String(vars[name]) : m
      );
    }
    return value;
  };
}

export function isLocale(code) {
  return LOCALES.some((l) => l.code === code);
}
