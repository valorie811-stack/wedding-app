import { cx } from "@/lib/cx";

// Matcha palette. Buttons are chrome, so they take the mono face and the
// template's wide tracking. Flat fills, hairline borders, no shadow.
const VARIANTS = {
  primary: "bg-matcha-600 text-white hover:bg-matcha-700 border border-transparent",
  // Dark label on a light gold, unlike the other filled variants. White on
  // gold-500 measured 2.93:1 and gold-600 4.23:1 — the gold ramp has no step
  // that carries white text at 4.5:1 without going to gold-700, a dark bronze
  // that stops reading as gold. Dark-on-light clears it at gold-400 (5.21:1).
  // Hover lightens rather than darkens: darkening is what breaks a dark label.
  gold: "bg-gold-400 text-stone-900 hover:bg-gold-300 border border-transparent",
  hp: "bg-hp-600 text-white hover:bg-hp-700 border border-transparent",
  kk: "bg-kk-600 text-white hover:bg-kk-700 border border-transparent",
  // Bordered variants carry stone-500/hp-500 rather than the stone-200 hairline
  // used on cards: WCAG 1.4.11 exempts decorative container edges but not the
  // boundary that identifies a control, and these sit white-on-white.
  outline: "bg-white text-stone-700 hover:bg-stone-50 border border-stone-500",
  ghost: "bg-transparent text-stone-700 hover:bg-stone-100 border border-transparent",
  danger: "bg-white text-hp-700 hover:bg-hp-50 border border-hp-500",
};

const SIZES = {
  sm: "text-xs px-3 py-1.5 rounded-md gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-lg gap-2",
  lg: "text-base px-5 py-3 rounded-lg gap-2",
};

export default function Button({
  as: Tag = "button",
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...props
}) {
  return (
    <Tag
      className={cx(
        "inline-flex items-center justify-center font-mono font-medium tracking-chrome",
        "transition active:scale-[0.98]",
        // matcha-600, not matcha-200: the pale step measured 1.28:1 on white,
        // well under the 3:1 WCAG 1.4.11 floor for a focus indicator.
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-matcha-600 focus-visible:ring-offset-1",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </Tag>
  );
}
