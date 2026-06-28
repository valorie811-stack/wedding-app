import { cx } from "@/lib/cx";

const VARIANTS = {
  primary: "bg-ink-900 text-white hover:bg-ink-800 border border-transparent",
  gold: "bg-gold-500 text-ink-900 hover:bg-gold-400 border border-transparent",
  hp: "bg-hp-600 text-white hover:bg-hp-700 border border-transparent",
  kk: "bg-kk-600 text-white hover:bg-kk-700 border border-transparent",
  outline: "bg-white text-ink-700 hover:bg-ink-50 border border-ink-200",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-100 border border-transparent",
};

const SIZES = {
  sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
  lg: "text-base px-5 py-3 rounded-xl gap-2",
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
        "inline-flex items-center justify-center font-medium transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-300 focus-visible:ring-offset-1",
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
