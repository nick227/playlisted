import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import { Link } from "react-router-dom";

import { coverFallback } from "@/lib/routes";

export const MUSEUM_GRID = "grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5";
export const MUSEUM_EXHIBIT_PAD = "p-3 md:p-4";
export const MUSEUM_EXHIBIT_RADIUS = "rounded-xl";

export const MUSEUM_BANK_COUNTS = {
  circleRow: 12,
  trackRow: 6,
  portraitGrid: 8,
  cinematicRow: 6,
  squareGrid: 10,
  songSpotlight: 1,
  special: 1,
} as const;

type MuseumContainerType = keyof typeof MUSEUM_BANK_COUNTS;

const DRAG_THRESHOLD_PX = 3;
const INERTIA_MIN_VELOCITY = 0.015;
const INERTIA_DECAY_MS = 480;
const INERTIA_VELOCITY_BOOST = 1.35;
const VELOCITY_SAMPLE_COUNT = 5;

export const MUSEUM_COL_LEFT = "min-w-0 md:col-span-4";
export const MUSEUM_COL_RIGHT = "min-w-0 md:col-span-8";
export const MUSEUM_COL_TRACKS = "min-w-0 md:col-span-5";
export const MUSEUM_COL_PLAYLIST = "min-w-0 md:col-span-3";
export const MUSEUM_COL_LYRIC = "min-w-0 md:col-span-8";
export const MUSEUM_COL_PEERS = "min-w-0 md:col-span-4";
export const MUSEUM_COL_FULL = "min-w-0 md:col-span-12";

export function MuseumExhibitShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["library-exhibit-enter min-w-0", className ?? ""].join(" ")}
    >
      {children}
    </div>
  );
}

export function MuseumExhibitFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative min-w-0 overflow-hidden",
        MUSEUM_EXHIBIT_RADIUS,
        MUSEUM_EXHIBIT_PAD,
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function MuseumPanel({
  children,
  className,
  padding = "none",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "tight" | "roomy";
}) {
  const pad =
    padding === "tight"
      ? "px-1 py-1 md:px-1.5"
      : padding === "roomy"
        ? "p-3 md:p-4"
        : "";

  return (
    <div
      className={[
        "museum-panel relative w-full min-w-0 overflow-hidden rounded-xl",
        pad,
        className ?? "",
      ].join(" ")}
    >
      <div className="pointer-events-none" aria-hidden />
      {children}
    </div>
  );
}

export function MuseumBankSection({
  label,
  href,
  hrefLabel,
  type,
  children,
  className,
}: {
  label: string;
  href?: string;
  hrefLabel?: string;
  type: MuseumContainerType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={["min-w-0", className ?? ""].join(" ")}
      data-museum-container={type}
    >
      <MuseumSectionHeader label={label} href={href} hrefLabel={hrefLabel} />
      {children}
    </section>
  );
}

export function MuseumScrollRow({
  children,
  variant,
  className,
}: {
  children: ReactNode;
  variant: "circle" | "portrait" | "cinematic" | "square";
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocitySamples: [] as number[],
    moved: false,
  });
  const inertiaFrameRef = useRef<number | null>(null);
  const inertiaLastTimeRef = useRef(0);
  const clickSuppressionUntilRef = useRef(0);
  const clickSuppressionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const itemSize =
    variant === "circle"
      ? "[&>*]:w-[6.25rem] sm:[&>*]:w-[7.5rem] md:[&>*]:w-[8rem]"
      : variant === "portrait"
        ? "[&>*]:w-[10.25rem] sm:[&>*]:w-[11.5rem] md:[&>*]:w-[12.5rem]"
        : variant === "cinematic"
          ? "[&>*]:w-[17rem] sm:[&>*]:w-[20rem] md:[&>*]:w-[22rem]"
          : "[&>*]:w-[8.75rem] sm:[&>*]:w-[10rem] md:[&>*]:w-[11rem]";

  useEffect(() => {
    return () => {
      stopInertia();
      if (clickSuppressionTimeoutRef.current !== null) {
        clearTimeout(clickSuppressionTimeoutRef.current);
      }
    };
  }, []);

  function stopInertia() {
    if (inertiaFrameRef.current === null) return;
    cancelAnimationFrame(inertiaFrameRef.current);
    inertiaFrameRef.current = null;
  }

  function clampScroll(scroller: HTMLDivElement, nextScrollLeft: number) {
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    return Math.max(0, Math.min(maxScroll, nextScrollLeft));
  }

  function suppressClicksAfterDrag() {
    clickSuppressionUntilRef.current = performance.now() + 420;
    if (clickSuppressionTimeoutRef.current !== null) {
      clearTimeout(clickSuppressionTimeoutRef.current);
    }
    clickSuppressionTimeoutRef.current = setTimeout(() => {
      clickSuppressionTimeoutRef.current = null;
    }, 420);
  }

  function pushVelocitySample(samples: number[], velocity: number) {
    const nextSamples = [...samples, velocity];
    if (nextSamples.length > VELOCITY_SAMPLE_COUNT) nextSamples.shift();
    return nextSamples;
  }

  function averageVelocity(samples: number[]) {
    if (samples.length === 0) return 0;
    const total = samples.reduce((sum, value) => sum + value, 0);
    return (total / samples.length) * INERTIA_VELOCITY_BOOST;
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
      const nextScrollLeft = clampScroll(
        scroller,
        scroller.scrollLeft + velocity * elapsed,
      );

      scroller.scrollLeft = nextScrollLeft;
      if (
        nextScrollLeft === 0 ||
        nextScrollLeft === scroller.scrollWidth - scroller.clientWidth
      ) {
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
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;

    stopInertia();
    clickSuppressionUntilRef.current = 0;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocitySamples: [],
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
    const velocity = (drag.lastX - event.clientX) / elapsed;
    drag.velocitySamples = pushVelocitySample(drag.velocitySamples, velocity);
    drag.lastX = event.clientX;
    drag.lastTime = now;
    drag.moved = true;
    setIsDragging(true);

    if (!scroller.hasPointerCapture(event.pointerId)) {
      scroller.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    scroller.scrollLeft = clampScroll(
      scroller,
      drag.startScrollLeft - distance,
    );
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
      suppressClicksAfterDrag();
      startInertia(averageVelocity(drag.velocitySamples));
    }
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (performance.now() < clickSuppressionUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    if (maxScroll <= 0) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0)
      return;

    const nextScrollLeft = clampScroll(
      scroller,
      scroller.scrollLeft + event.deltaY * 1.2,
    );
    if (nextScrollLeft === scroller.scrollLeft) return;

    stopInertia();
    event.preventDefault();
    scroller.scrollLeft = nextScrollLeft;
    suppressClicksAfterDrag();
  }

  return (
    <div
      ref={scrollerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onClickCapture={handleClickCapture}
      onWheel={handleWheel}
      className={[
        "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-0.5 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-5 md:gap-4 md:px-5",
        "select-none touch-pan-x",
        isDragging ? "cursor-grabbing snap-none" : "cursor-grab",
        "[&>*]:shrink-0 [&>*]:snap-start",
        itemSize,
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function MuseumResponsiveGrid({
  children,
  variant,
  className,
}: {
  children: ReactNode;
  variant: "portrait" | "square";
  className?: string;
}) {
  const cols =
    variant === "portrait"
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5";

  return (
    <div
      className={[
        "grid min-w-0 items-start gap-3 md:gap-4",
        cols,
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function MuseumSectionHeader({
  label,
  href,
  hrefLabel = "View all",
}: {
  label: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-2.5 flex min-h-6 items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-5xl font-extrabold tracking-tighter leading-none text-white md:text-6xl pl-4">
          {label}
        </h2>
      </div>
      {href ? (
        <Link
          to={href}
          className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white"
        >
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function MuseumExhibitDivider() {
  return null;
}

export function MuseumTrackPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <MuseumPanel
      padding="tight"
      className={["bg-black/16", className ?? ""].join(" ")}
    >
      {children}
    </MuseumPanel>
  );
}

export function MuseumArtBackdrop({
  imageUrl,
  title,
  className,
  intensity = "medium",
}: {
  imageUrl?: string | null;
  title: string;
  className?: string;
  intensity?: "soft" | "medium" | "bold";
}) {
  const opacity =
    intensity === "soft"
      ? "opacity-20"
      : intensity === "bold"
        ? "opacity-35"
        : "opacity-28";

  return (
    <div
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden",
        className ?? "",
      ].join(" ")}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            className={[
              "absolute inset-0 h-full w-full scale-110 object-cover blur-3xl saturate-150",
              opacity,
            ].join(" ")}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,77,255,0.12),transparent_42%),radial-gradient(circle_at_80%_100%,rgba(255,255,255,0.04),transparent_38%)]" />
        </>
      ) : (
        <div
          className="absolute inset-0 opacity-50"
          style={{ background: coverFallback(title) }}
          aria-hidden
        />
      )}
    </div>
  );
}

export function MuseumGenrePills({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/55"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
