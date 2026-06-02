import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface ChartPanelContainerProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  footerHref?: string;
  footerLabel?: string;
  children: ReactNode;
}

export function ChartPanelContainer({
  title,
  subtitle,
  viewAllHref,
  footerHref,
  footerLabel,
  children,
}: ChartPanelContainerProps) {
  const footerText = footerLabel ?? `View full ${title}`;

  return (
    <article className="flex min-h-0 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {viewAllHref ? (
          <Link
            to={viewAllHref}
            className="shrink-0 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            View all
          </Link>
        ) : null}
      </header>

      <ul className="flex-1 divide-y divide-[var(--color-border)]">{children}</ul>

      {footerHref ? (
        <footer className="border-t border-[var(--color-border)] px-4 py-2.5">
          <Link
            to={footerHref}
            className="flex items-center justify-center gap-1 text-xs font-medium text-[var(--color-text-muted)] transition hover:text-white"
          >
            {footerText}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </footer>
      ) : null}
    </article>
  );
}
