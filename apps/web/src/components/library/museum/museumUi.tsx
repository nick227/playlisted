import type { ReactNode } from "react";
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
        "museum-panel relative w-full min-w-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.035]",
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
  const itemSize =
    variant === "circle"
      ? "[&>*]:w-[6.25rem] sm:[&>*]:w-[7.5rem] md:[&>*]:w-[8rem]"
      : variant === "portrait"
        ? "[&>*]:w-[10.25rem] sm:[&>*]:w-[11.5rem] md:[&>*]:w-[12.5rem]"
        : variant === "cinematic"
          ? "[&>*]:w-[17rem] sm:[&>*]:w-[20rem] md:[&>*]:w-[22rem]"
          : "[&>*]:w-[8.75rem] sm:[&>*]:w-[10rem] md:[&>*]:w-[11rem]";

  return (
    <div
      className={[
        "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-0.5 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-5 md:gap-4 md:px-5",
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
        <h2 className="truncate text-base font-semibold leading-6 text-white md:text-lg">
          {label}
        </h2>
      </div>
      {href ? (
        <Link
          to={href}
          className="shrink-0 text-sm font-medium text-white/58 transition hover:text-white"
        >
          {hrefLabel}
        </Link>
      ) : (
        <span className="shrink-0 text-sm opacity-0" aria-hidden>
          View all
        </span>
      )}
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
