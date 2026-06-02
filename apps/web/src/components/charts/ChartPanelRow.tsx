import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { coverFallback } from "@/lib/routes";

interface ChartPanelRowProps {
  rank: number;
  title: string;
  titleHref?: string;
  subtitle?: string;
  subtitleHref?: string;
  imageUrl?: string | null;
  imageShape?: "square" | "circle";
  lead?: ReactNode;
  stat?: ReactNode;
  actionSlot?: ReactNode;
  onRowClick?: () => void;
}

function RowTitle({ title, href }: { title: string; href?: string }) {
  if (href) {
    return (
      <Link
        to={href}
        onClick={(e) => e.stopPropagation()}
        className="block truncate text-sm font-medium text-white hover:underline"
      >
        {title}
      </Link>
    );
  }
  return <span className="block truncate text-sm font-medium text-white">{title}</span>;
}

function RowSubtitle({ text, href }: { text: string; href?: string }) {
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

export function ChartPanelRow({
  rank,
  title,
  titleHref,
  subtitle,
  subtitleHref,
  imageUrl,
  imageShape = "square",
  lead,
  stat,
  actionSlot,
  onRowClick,
}: ChartPanelRowProps) {
  const rounded = imageShape === "circle" ? "rounded-full" : "rounded-md";

  return (
    <li>
      <div
        className={[
          "group/row grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 px-3 py-2.5 transition hover:bg-white/[0.04]",
          onRowClick ? "cursor-pointer" : "",
        ].join(" ")}
        onClick={onRowClick}
        onKeyDown={
          onRowClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick();
                }
              }
            : undefined
        }
        role={onRowClick ? "button" : undefined}
        tabIndex={onRowClick ? 0 : undefined}
      >
        <span className="w-5 text-center text-sm tabular-nums text-[var(--color-text-subtle)]">
          {rank}
        </span>

        {lead ?? (
          <div className={`h-10 w-10 shrink-0 overflow-hidden ${rounded}`}>
            {imageUrl ? (
              <img src={imageUrl} alt="" className={`h-full w-full object-cover ${rounded}`} />
            ) : (
              <div
                className={`h-full w-full ${rounded}`}
                style={{ background: coverFallback(title) }}
                aria-hidden
              />
            )}
          </div>
        )}

        <div className="min-w-0">
          <RowTitle title={title} href={titleHref} />
          {subtitle ? <RowSubtitle text={subtitle} href={subtitleHref} /> : null}
        </div>

        {stat ? (
          <div className="shrink-0 text-xs font-medium tabular-nums text-[var(--color-text-muted)]">
            {stat}
          </div>
        ) : (
          <span aria-hidden />
        )}

        {actionSlot ? (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {actionSlot}
          </div>
        ) : (
          <span className="w-8" aria-hidden />
        )}
      </div>
    </li>
  );
}
