import type { ReactNode } from "react";

import { coverFallback } from "@/lib/routes";

import { ChartRowSubtitle, ChartRowTitle } from "./ChartRowText";

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
}

function ChartPanelArtwork({
  title,
  imageUrl,
  rounded,
}: {
  title: string;
  imageUrl?: string | null;
  rounded: string;
}) {
  return (
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
}: ChartPanelRowProps) {
  const rounded = imageShape === "circle" ? "rounded-full" : "rounded-md";

  return (
    <li>
      <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition hover:bg-white/[0.04]">
        <span className="w-5 text-center text-sm tabular-nums text-[var(--color-text-subtle)]">
          {rank}
        </span>

        {lead ?? <ChartPanelArtwork title={title} imageUrl={imageUrl} rounded={rounded} />}

        <div className="min-w-0">
          <ChartRowTitle title={title} href={titleHref} />
          {subtitle ? <ChartRowSubtitle text={subtitle} href={subtitleHref} /> : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-2 pl-2">
          {stat ? (
            <div className="text-xs font-medium tabular-nums text-[var(--color-text-muted)]">{stat}</div>
          ) : null}
          {actionSlot ? (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {actionSlot}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
