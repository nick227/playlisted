import { useCallback, useEffect, useRef, useState } from "react";
import type { LibraryGenre } from "@playlisted/client-sdk";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";

interface RadioStationTilesProps {
  genres: LibraryGenre[];
  activeStationSlug: string | null;
  playing: boolean;
  onStationClick: (slug: string | null) => void;
}

/** Stable per-genre hue, so each station keeps its own marker color. */
function stationColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 60% 62%)`;
}

function StationTile({
  name,
  meta,
  color,
  isActive,
  playing,
  onClick,
}: {
  name: string;
  meta: string;
  color: string;
  isActive: boolean;
  playing: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`${isActive && playing ? "Pause" : "Play"} ${name}`}
      className={[
        "flex h-16 w-40 shrink-0 snap-start flex-col justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        isActive
          ? "border-white/30 bg-white/[0.08]"
          : "border-[var(--color-border)] hover:border-white/20 hover:bg-white/[0.03]",
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-2">
        {isActive ? (
          <PlaybackBars active playing={playing} variant="row-compact" />
        ) : (
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        )}
        <span className={`min-w-0 truncate text-[13px] font-medium ${isActive ? "text-white" : "text-white/80"}`}>
          {name}
        </span>
      </span>
      <span className="text-[11px] tabular-nums text-[var(--color-text-subtle)]">{meta}</span>
    </button>
  );
}

/** Station shelf: the main station first, then one tile per genre. */
export function RadioStationTiles({ genres, activeStationSlug, playing, onStationClick }: RadioStationTilesProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollLeft(scroller.scrollLeft > 2);
    setCanScrollRight(scroller.scrollLeft < maxScroll - 2);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [genres.length, updateScrollState]);

  const scrollBy = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrowClassName =
    "absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-white transition-colors hover:bg-[var(--color-surface)] md:flex";

  return (
    <div className="relative">
      {canScrollLeft ? (
        <button type="button" onClick={() => scrollBy(-1)} className={`${arrowClassName} -left-4`} aria-label="Scroll stations left">
          <ChevronLeft size={16} />
        </button>
      ) : null}
      <div ref={scrollerRef} className="radio-station-scroller flex snap-x snap-mandatory gap-2 overflow-x-auto">
        <StationTile
          name="Playlisted Radio"
          meta="All genres"
          color="var(--color-brand)"
          isActive={activeStationSlug === null}
          playing={playing}
          onClick={() => onStationClick(null)}
        />
        {genres.map((genre) => (
          <StationTile
            key={genre.slug}
            name={genre.name}
            meta={`${genre.songCount} ${genre.songCount === 1 ? "song" : "songs"}`}
            color={stationColor(genre.name)}
            isActive={activeStationSlug === genre.slug}
            playing={playing}
            onClick={() => onStationClick(genre.slug)}
          />
        ))}
      </div>
      {canScrollRight ? (
        <button type="button" onClick={() => scrollBy(1)} className={`${arrowClassName} -right-4`} aria-label="Scroll stations right">
          <ChevronRight size={16} />
        </button>
      ) : null}
    </div>
  );
}
