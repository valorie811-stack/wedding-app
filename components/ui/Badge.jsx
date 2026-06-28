import { cx } from "@/lib/cx";

const TONES = {
  neutral: "bg-ink-100 text-ink-600",
  hp: "bg-hp-100 text-hp-700",
  kk: "bg-kk-100 text-kk-700",
  gold: "bg-gold-100 text-gold-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

export default function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
