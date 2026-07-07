import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { coverFallback } from "@/lib/routes";

export const MUSEUM_GRID = "grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-6";
export const MUSEUM_EXHIBIT_PAD = "p-5 md:p-6";
export const MUSEUM_EXHIBIT_RADIUS = "rounded-[1.25rem]";

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
    <div className={["library-exhibit-enter min-w-0", className ?? ""].join(" ")}>
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
      ? "px-2 py-1 md:px-3 md:py-1.5"
      : padding === "roomy"
        ? MUSEUM_EXHIBIT_PAD
        : "";

  return (
    <div
      className={[
        "museum-panel relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] shadow-[0_20px_70px_rgba(0,0,0,0.32)]",
        pad,
        className ?? "",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        aria-hidden
      />
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
    <div className="mb-3 flex min-h-[1.75rem] items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/42">{label}</p>
        <div className="mt-2 h-px w-10 bg-gradient-to-r from-[var(--color-brand)]/70 to-transparent" />
      </div>
      {href ? (
        <Link
          to={href}
          className="shrink-0 pb-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/24 transition hover:text-[var(--color-brand)]"
        >
          {hrefLabel}
        </Link>
      ) : (
        <span className="shrink-0 pb-0.5 text-[10px] opacity-0" aria-hidden>
          —
        </span>
      )}
    </div>
  );
}

export function MuseumExhibitDivider() {
  return (
    <div className="flex min-w-0 items-center gap-3 py-1" aria-hidden>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />
      <div className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-brand)]/45 shadow-[0_0_12px_rgba(124,77,255,0.45)]" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />
    </div>
  );
}

export function MuseumTrackPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <MuseumPanel padding="tight" className={["bg-black/20 backdrop-blur-md", className ?? ""].join(" ")}>
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
  const opacity = intensity === "soft" ? "opacity-20" : intensity === "bold" ? "opacity-35" : "opacity-28";

  return (
    <div className={["pointer-events-none absolute inset-0 overflow-hidden", className ?? ""].join(" ")}>
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            className={["absolute inset-0 h-full w-full scale-110 object-cover blur-3xl saturate-150", opacity].join(" ")}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,77,255,0.12),transparent_42%),radial-gradient(circle_at_80%_100%,rgba(255,255,255,0.04),transparent_38%)]" />
        </>
      ) : (
        <div className="absolute inset-0 opacity-50" style={{ background: coverFallback(title) }} aria-hidden />
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
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
