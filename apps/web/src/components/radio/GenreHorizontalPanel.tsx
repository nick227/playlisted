import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
import type { LibraryGenre } from "@playlisted/client-sdk";
import { ChevronLeft, ChevronRight, Pause, Play, Radio } from "lucide-react";

interface GenreHorizontalPanelProps {
  genres: LibraryGenre[];
  genreStationActive: boolean;
  activeGenreSlug: string | null;
  pendingGenreSlug: string | null;
  onPlaylistedRadioClick: () => void;
  onGenreClick: (genre: LibraryGenre) => void;
  isGenreStationPlaying: (slug: string) => boolean;
}

const DRAG_THRESHOLD_PX = 5;
const INERTIA_MIN_VELOCITY = 0.02;
const INERTIA_DECAY_MS = 325;
const SCROLL_MASKS = {
  none: "none",
  left: "linear-gradient(to right, transparent, black 2rem, black 100%)",
  right: "linear-gradient(to right, black 0%, black calc(100% - 2rem), transparent)",
  both: "linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent)",
} as const;

export function GenreHorizontalPanel({
  genres,
  genreStationActive,
  activeGenreSlug,
  pendingGenreSlug,
  onPlaylistedRadioClick,
  onGenreClick,
  isGenreStationPlaying,
}: GenreHorizontalPanelProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    moved: false,
  });
  const inertiaFrameRef = useRef<number | null>(null);
  const inertiaLastTimeRef = useRef(0);
  const clickSuppressionUntilRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const inUseGenres = useMemo(
    () => genres.filter((genre) => genre.songCount > 0),
    [genres],
  );
  const scrollMask = canScrollLeft && canScrollRight
    ? SCROLL_MASKS.both
    : canScrollLeft
      ? SCROLL_MASKS.left
      : canScrollRight
        ? SCROLL_MASKS.right
        : SCROLL_MASKS.none;

  const updateScrollButtons = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollLeft(scroller.scrollLeft > 2);
    setCanScrollRight(scroller.scrollLeft < maxScroll - 2);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateScrollButtons();
    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(scroller);

    return () => {
      resizeObserver.disconnect();
    };
  }, [inUseGenres.length, updateScrollButtons]);

  useEffect(() => {
    return () => {
      if (inertiaFrameRef.current !== null) {
        cancelAnimationFrame(inertiaFrameRef.current);
      }
    };
  }, []);

  if (inUseGenres.length === 0) {
    return null;
  }

  function scrollByPage(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    stopInertia();
    scroller.scrollBy({
      left: direction * Math.max(160, scroller.clientWidth * 0.78),
      behavior: "smooth",
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    if (maxScroll <= 0) return;

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return;

    const nextScrollLeft = Math.max(0, Math.min(maxScroll, scroller.scrollLeft + event.deltaY * 1.35));
    if (nextScrollLeft === scroller.scrollLeft) return;

    stopInertia();
    event.preventDefault();
    scroller.scrollLeft = nextScrollLeft;
    updateScrollButtons();
  }

  function stopInertia() {
    if (inertiaFrameRef.current === null) return;

    cancelAnimationFrame(inertiaFrameRef.current);
    inertiaFrameRef.current = null;
  }

  function startInertia(velocity: number) {
    const scroller = scrollerRef.current;
    if (!scroller || Math.abs(velocity) < INERTIA_MIN_VELOCITY) return;

    stopInertia();
    inertiaLastTimeRef.current = performance.now();

    function step(now: number) {
      const scroller = scrollerRef.current;
      if (!scroller) {
        inertiaFrameRef.current = null;
        return;
      }

      const elapsed = Math.min(32, now - inertiaLastTimeRef.current);
      inertiaLastTimeRef.current = now;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const nextScrollLeft = Math.max(0, Math.min(maxScroll, scroller.scrollLeft + velocity * elapsed));

      scroller.scrollLeft = nextScrollLeft;
      updateScrollButtons();

      if (nextScrollLeft === 0 || nextScrollLeft === maxScroll) {
        inertiaFrameRef.current = null;
        return;
      }

      velocity *= Math.exp(-elapsed / INERTIA_DECAY_MS);
      if (Math.abs(velocity) < INERTIA_MIN_VELOCITY) {
        inertiaFrameRef.current = null;
        return;
      }

      inertiaFrameRef.current = requestAnimationFrame(step);
    }

    inertiaFrameRef.current = requestAnimationFrame(step);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;

    stopInertia();
    const now = performance.now();
    clickSuppressionUntilRef.current = 0;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      lastX: event.clientX,
      lastTime: now,
      velocity: 0,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const scroller = scrollerRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId || !scroller) return;

    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < DRAG_THRESHOLD_PX) return;

    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    drag.velocity = (drag.lastX - event.clientX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    drag.moved = true;
    setIsDragging(true);
    if (!scroller.hasPointerCapture(event.pointerId)) {
      scroller.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    scroller.scrollLeft = drag.startScrollLeft - distance;
    updateScrollButtons();
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const scroller = scrollerRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    if (scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }

    dragRef.current = { ...drag, active: false };
    setIsDragging(false);
    if (drag.moved) {
      clickSuppressionUntilRef.current = performance.now() + 450;
    }
    startInertia(drag.velocity);
  }

  function suppressClickAfterDrag(event: MouseEvent<HTMLDivElement>) {
    if (!dragRef.current.moved && performance.now() > clickSuppressionUntilRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
    clickSuppressionUntilRef.current = 0;
  }

  function preventMouseFocusScroll(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  return (
    <div className="w-full max-w-[min(92vw,30rem)] shrink-0 sm:mt-6">
      <h6 className="mb-2 w-full text-sm font-semibold text-white/58 opacity-0 lg:opacity-100">More Channels</h6>
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          disabled={!canScrollLeft}
          className="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white shadow-lg shadow-black/30 backdrop-blur transition hover:border-white/20 hover:bg-black/85 disabled:pointer-events-none disabled:opacity-0"
          aria-label="Scroll genres left"
        >
          <ChevronLeft size={16} />
        </button>
        <div
          ref={scrollerRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onClickCapture={suppressClickAfterDrag}
          onScroll={updateScrollButtons}
          className={`genre-horizontal-panel w-full touch-pan-y select-none overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            maskImage: scrollMask,
            WebkitMaskImage: scrollMask,
          }}
          aria-label="Radio genre stations"
        >
          <div className="flex min-w-max items-center gap-2 px-1">
            <button
              type="button"
              onClick={onPlaylistedRadioClick}
              onMouseDown={preventMouseFocusScroll}
              aria-label="Play Playlisted radio"
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition sm:h-8 sm:px-3 ${
                !genreStationActive
                  ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/15 text-white"
                  : "border-white/10 bg-[--color-canvas]/80 text-white/58 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <Radio size={13} />
              Playlisted
            </button>
            {inUseGenres.map((genre) => {
              const stationPlaying = isGenreStationPlaying(genre.slug);
              const pending = pendingGenreSlug === genre.slug;
              const active = activeGenreSlug === genre.slug;
              return (
                <button
                  key={genre.slug}
                  type="button"
                  onClick={() => onGenreClick(genre)}
                  onMouseDown={preventMouseFocusScroll}
                  disabled={pending}
                  aria-label={`${stationPlaying ? "Pause" : "Play"} ${genre.name} radio`}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 sm:h-8 sm:px-3 ${
                    active
                      ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/50 text-white"
                      : "border-white/10 bg-[--color-canvas]/80 text-white/58 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {stationPlaying ? (
                    <Pause size={12} fill="currentColor" />
                  ) : (
                    <Play size={12} fill="currentColor" className="ml-0.5" />
                  )}
                  {genre.name}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          disabled={!canScrollRight}
          className="absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 translate-x-1/3 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white shadow-lg shadow-black/30 backdrop-blur transition hover:border-white/20 hover:bg-black/85 disabled:pointer-events-none disabled:opacity-0"
          aria-label="Scroll genres right"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
