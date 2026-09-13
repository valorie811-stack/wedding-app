import { cx } from "@/lib/cx";

export function Card({ className, children, ...props }) {
  return (
    <div className={cx("card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cx("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div>
        {title && (
          <h3 className="font-mono text-sm font-medium tracking-chrome text-stone-900">{title}</h3>
        )}
        {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// A `p-*` from the caller has to REPLACE the default rather than sit beside
// it. cx only joins strings, so cx("p-5", "p-0") emits both and which one wins
// is settled by Tailwind's stylesheet order, not by the call site: the built
// CSS reads `.p-0{padding:0}` then `.p-5{padding:1.25rem}`, so p-5 won and
// `<CardBody className="p-0">` rendered 20px of padding — the override was a
// silent no-op. What makes that worth a regex rather than a one-line fix at the
// call site is that it was only broken for HALF its inputs: p-6 and up are
// generated after p-5 and would have worked, so the primitive behaved
// differently depending on which number you asked for.
//
// Side-specific overrides (pt-0, px-4 …) are deliberately NOT matched. Tailwind
// generates those after p-5 and they are meant to layer on top of it — five
// call sites trim just the top padding that way and are correct as they stand.
// Variant-prefixed ones (sm:p-0) aren't matched either: they layer the same
// way, and only the unprefixed class competes with the default.
const ALL_SIDES_PADDING = /(?:^|\s)p-\S+/;

export function CardBody({ className, children }) {
  const padding = ALL_SIDES_PADDING.test(className || "") ? null : "p-5";
  return <div className={cx(padding, className)}>{children}</div>;
}
