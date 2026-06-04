import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Disc3,
  Eye,
  LayoutGrid,
  ListMusic,
  Mic2,
  Sparkles,
  Upload,
  UserPen,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  ARTISTS_PATH,
  GENRES_PATH,
  PLAYLISTS_PATH,
  SONGS_PATH,
} from "@/lib/browsePaths";
import { profilePath, STUDIO_PATH } from "@/lib/routes";

const STUDIO_PROFILE_PATH = "/studio/profile";
const STUDIO_COLLECTIONS_PATH = "/studio/collections";

type BentoTile = {
  href: string;
  label: string;
  title: string;
  titleLine2?: string;
  description: string;
  icon: LucideIcon;
  placement: string;
  glow: string;
  iconTint: string;
};

const TILES: BentoTile[] = [
  {
    href: STUDIO_PATH,
    label: "Creator hub",
    title: "Artist",
    titleLine2: "Studio",
    description: "Collections, analytics, and your creator dashboard in one place.",
    icon: Mic2,
    placement: "md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1",
    glow: "from-violet-600/35 via-fuchsia-500/10 to-transparent",
    iconTint: "text-violet-300",
  },
  {
    href: SONGS_PATH,
    label: "Browse",
    title: "Songs",
    description: "Stream every public track on the platform.",
    icon: Disc3,
    placement: "md:col-start-3 md:row-start-1",
    glow: "from-sky-500/30 to-transparent",
    iconTint: "text-sky-300",
  },
  {
    href: GENRES_PATH,
    label: "Browse",
    title: "Genres",
    description: "Dig in by mood, style, and sonic territory.",
    icon: Sparkles,
    placement: "md:col-start-4 md:row-start-1",
    glow: "from-amber-500/28 to-transparent",
    iconTint: "text-amber-300",
  },
  {
    href: ARTISTS_PATH,
    label: "Community",
    title: "Artists",
    description: "Profiles, pins, and the humans behind the music.",
    icon: Users,
    placement: "md:col-span-2 md:col-start-3 md:row-start-2",
    glow: "from-emerald-500/25 to-transparent",
    iconTint: "text-emerald-300",
  },
  {
    href: PLAYLISTS_PATH,
    label: "Collections",
    title: "Playlists",
    description: "Curated sets and listener-made mixes worth a spin.",
    icon: ListMusic,
    placement: "md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-3",
    glow: "from-rose-500/30 via-pink-500/10 to-transparent",
    iconTint: "text-rose-300",
  },
  {
    href: STUDIO_COLLECTIONS_PATH,
    label: "Publish",
    title: "Upload",
    description: "Add audio, artwork, and ship your next release.",
    icon: Upload,
    placement: "md:col-start-3 md:row-start-3",
    glow: "from-orange-500/28 to-transparent",
    iconTint: "text-orange-300",
  },
  {
    href: STUDIO_PROFILE_PATH,
    label: "Account",
    title: "Profile",
    titleLine2: "Edit",
    description: "Bio, avatar, links, and how you show up.",
    icon: UserPen,
    placement: "md:col-start-4 md:row-start-3",
    glow: "from-cyan-500/25 to-transparent",
    iconTint: "text-cyan-300",
  },
  {
    href: ARTISTS_PATH,
    label: "Public page",
    title: "Profile",
    titleLine2: "View",
    description: "See your live artist page as listeners do.",
    icon: Eye,
    placement: "md:col-span-2 md:col-start-3 md:row-start-4",
    glow: "from-indigo-500/28 to-transparent",
    iconTint: "text-indigo-300",
  },
];

function BentoCard({
  tile,
  profileViewHref,
}: {
  tile: BentoTile;
  profileViewHref: string;
}) {
  const href = tile.titleLine2 === "View" ? profileViewHref : tile.href;
  const Icon = tile.icon;
  const isHero = tile.placement.includes("row-span-2") && tile.placement.includes("col-span-2");

  return (
    <Link
      to={href}
      className={[
        "group relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.09] bg-[var(--color-surface)] p-5 transition duration-300",
        "hover:border-white/[0.16] hover:bg-white/[0.03] hover:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]",
        tile.placement,
      ].join(" ")}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tile.glow} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/[0.04] blur-2xl transition group-hover:bg-white/[0.07]"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
          {tile.label}
        </span>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-black/25 ${tile.iconTint} transition group-hover:scale-105 group-hover:border-white/[0.18]`}
        >
          <Icon size={isHero ? 22 : 18} strokeWidth={1.75} aria-hidden />
        </span>
      </div>

      <div className="relative mt-auto pt-6">
        <h3
          className={[
            "font-black leading-[0.92] tracking-tighter text-white",
            isHero ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
          ].join(" ")}
        >
          {tile.title}
          {tile.titleLine2 ? (
            <span className="block bg-gradient-to-r from-white to-white/55 bg-clip-text text-transparent">
              {tile.titleLine2}
            </span>
          ) : null}
        </h3>
        <p
          className={[
            "mt-2 text-[var(--color-text-muted)]",
            isHero ? "max-w-sm text-sm leading-relaxed" : "text-xs leading-relaxed sm:text-sm",
          ].join(" ")}
        >
          {tile.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/70 transition group-hover:text-white">
          Open
          <ArrowUpRight
            size={14}
            className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}

export function HomeExploreBento({ username }: { username?: string }) {
  const profileViewHref = username ? profilePath(username) : ARTISTS_PATH;

  return (
    <section className="mb-10" aria-labelledby="home-explore-bento-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-[var(--color-brand)]">
            <LayoutGrid size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h2
              id="home-explore-bento-heading"
              className="text-xl font-bold tracking-tight text-white"
            >
              Explore the site
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              Jump to browse, publish, and manage your presence
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-4 md:auto-rows-fr">
        {TILES.map((tile) => (
          <BentoCard key={`${tile.href}-${tile.title}`} tile={tile} profileViewHref={profileViewHref} />
        ))}
      </div>
    </section>
  );
}
