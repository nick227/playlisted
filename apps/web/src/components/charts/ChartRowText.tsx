import { Link } from "react-router-dom";

export function ChartRowTitle({
  title,
  href,
  active,
}: {
  title: string;
  href?: string;
  active?: boolean;
}) {
  const color = active ? "text-[var(--color-brand)]" : "text-white";

  if (href) {
    return (
      <Link
        to={href}
        onClick={(e) => e.stopPropagation()}
        className={`block truncate text-sm font-medium hover:underline ${color}`}
      >
        {title}
      </Link>
    );
  }
  return (
    <span className={`block truncate text-sm font-medium ${color}`}>{title}</span>
  );
}

export function ChartRowSubtitle({ text, href }: { text: string; href?: string }) {
  if (href) {
    return (
      <Link
        to={href}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)] hover:text-white"
      >
        {text}
      </Link>
    );
  }
  return (
    <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">{text}</span>
  );
}
