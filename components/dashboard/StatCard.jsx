import { cx } from "@/lib/cx";

const ACCENTS = {
  hp: "bg-hp-50 text-hp-700",
  kk: "bg-kk-50 text-kk-700",
  gold: "bg-gold-100 text-gold-700",
  ink: "bg-ink-100 text-ink-700",
};

export default function StatCard({ icon, label, value, sub, accent = "ink" }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={cx("grid h-10 w-10 place-items-center rounded-xl text-lg", ACCENTS[accent])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-ink-500">
            {label}
          </p>
          <p className="text-2xl font-bold leading-tight text-ink-900">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-3 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}
