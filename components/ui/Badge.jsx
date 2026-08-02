import { cx } from "@/lib/cx";

// Status tones are drawn from the matcha palette rather than Tailwind's stock
// emerald/amber/red, which are far too saturated to sit beside sage.
const TONES = {
  neutral: "bg-stone-100 text-stone-600",
  hp: "bg-hp-100 text-hp-800",
  kk: "bg-kk-100 text-kk-800",
  gold: "bg-gold-100 text-gold-700",
  green: "bg-matcha-100 text-matcha-700",
  amber: "bg-gold-100 text-gold-700",
  red: "bg-hp-100 text-hp-800",
};

export default function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
        "font-mono text-[11px] font-medium tracking-chrome",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
