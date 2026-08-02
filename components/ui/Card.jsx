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

export function CardBody({ className, children }) {
  return <div className={cx("p-5", className)}>{children}</div>;
}
