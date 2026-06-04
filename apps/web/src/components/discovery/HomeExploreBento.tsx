import type { LibraryGenre, TopArtistItem } from "@playlisted/client-sdk";
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

import { useTopArtists, useTopPlaylists } from "@/hooks/useCharts";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { usePlaylists } from "@/hooks/usePlaylists";
import {
  ARTISTS_PATH,
  GENRES_PATH,
  PLAYLISTS_PATH,
  SONGS_PATH,
} from "@/lib/browsePaths";
import { coverFallback, profilePath, STUDIO_PATH } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

import {
  BentoAvatarStrip,
  BentoCoverMosaic,
  BentoGenreTags,
  collectionsToCovers,
  playlistsToCovers,
} from "./homeExploreBentoFills";

const STUDIO_PROFILE_PATH = "/studio/profile";
const STUDIO_COLLECTIONS_PATH = "/studio/collections";

type BentoTile = {
  id: string;
  href: string;
  label: string;
  title: string;
  titleLine2?: string;
  description: string;
  icon: LucideIcon;
  placement: string;
  iconTint: string;
  fill?: "studio" | "playlists" | "artists" | "genres" | "profile-view";
};

const TILES: BentoTile[] = [
  {
    id: "studio",
    href: STUDIO_PATH,
    label: "Creator hub",
    title: "Artist",
    titleLine2: "Studio",
    description: "Collections, analytics, and your creator dashboard in one place.",
    icon: Mic2,
    placement: "md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1",
    iconTint: "text-violet-300",
    fill: "studio",
  },
  {
    id: "songs",
    href: SONGS_PATH,
    label: "Browse",
    title: "Songs",
    description: "Stream every public track on the platform.",
    icon: Disc3,
    placement: "md:col-start-3 md:row-start-1",
    iconTint: "text-sky-300",
  },
  {
    id: "genres",
    href: GENRES_PATH,
    label: "Browse",
    title: "Genres",
    description: "Dig in by mood, style, and sonic territory.",
    icon: Sparkles,
    placement: "md:col-start-4 md:row-start-1",
    iconTint: "text-amber-300",
    fill: "genres",
  },
  {
    id: "artists",
    href: ARTISTS_PATH,
    label: "Community",
    title: "Artists",
    description: "Profiles, pins, and the humans behind the music.",
    icon: Users,
    placement: "md:col-span-2 md:col-start-3 md:row-start-2",
    iconTint: "text-emerald-300",
    fill: "artists",
  },
  {
    id: "playlists",
    href: PLAYLISTS_PATH,
    label: "Collections",
    title: "Playlists",
    description: "Curated sets and listener-made mixes worth a spin.",
    icon: ListMusic,
    placement: "md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-3",
    iconTint: "text-rose-300",
    fill: "playlists",
  },
  {
    id: "upload",
    href: STUDIO_COLLECTIONS_PATH,
    label: "Publish",
    title: "Upload",
    description: "Add audio, artwork, and ship your next release.",
    icon: Upload,
    placement: "md:col-start-3 md:row-start-3",
    iconTint: "text-orange-300",
  },
  {
    id: "profile-edit",
    href: STUDIO_PROFILE_PATH,
    label: "Account",
    title: "Profile",
    titleLine2: "Edit",
    description: "Bio, avatar, links, and how you show up.",
    icon: UserPen,
    placement: "md:col-start-4 md:row-start-3",
    iconTint: "text-cyan-300",
  },
  {
    id: "profile-view",
    href: ARTISTS_PATH,
    label: "Public page",
    title: "Profile",
    titleLine2: "View",
    description: "See your live artist page as listeners do.",
    icon: Eye,
    placement: "md:col-span-2 md:col-start-3 md:row-start-4",
    iconTint: "text-indigo-300",
    fill: "profile-view",
  },
];

function BentoCardFill({
  kind,
  studioCovers,
  playlistCovers,
  artists,
  genres,
  avatarUrl,
  displayName,
}: {
  kind: BentoTile["fill"];
  studioCovers: ReturnType<typeof collectionsToCovers>;
  playlistCovers: ReturnType<typeof playlistsToCovers>;
  artists?: TopArtistItem[];
  genres?: LibraryGenre[];
  avatarUrl?: string | null;
  displayName?: string;
}) {
  if (!kind) return null;

  if (kind === "studio") {
    const covers = studioCovers.length > 0 ? studioCovers : playlistCovers;
    return (
      <div className="flex flex-1 items-center justify-center py-2">
        <BentoCoverMosaic items={covers} />
      </div>
    );
  }

  if (kind === "playlists") {
    return (
      <div className="flex flex-1 items-center justify-center py-2">
        <BentoCoverMosaic items={playlistCovers} />
      </div>
    );
  }

  if (kind === "artists" && artists) {
    return (
      <div className="flex flex-1 items-center py-1">
        <BentoAvatarStrip artists={artists} />
      </div>
    );
  }

  if (kind === "genres" && genres) {
    const sorted = [...genres].sort((a, b) => b.songCount - a.songCount);
    return (
      <div className="flex flex-1 items-end justify-end pb-1">
        <BentoGenreTags genres={sorted} />
      </div>
    );
  }

  if (kind === "profile-view" && (avatarUrl || displayName)) {
    return (
      <div className="pointer-events-none absolute right-4 top-14 h-24 w-24 overflow-hidden rounded-2xl border border-white/[0.1] opacity-40 sm:h-28 sm:w-28 sm:opacity-50">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: coverFallback(displayName ?? "Artist") }}
            aria-hidden
          />
        )}
      </div>
    );
  }

  return null;
}

function BentoCard({
  tile,
  profileViewHref,
  studioCovers,
  playlistCovers,
  artists,
  genres,
  avatarUrl,
  displayName,
}: {
  tile: BentoTile;
  profileViewHref: string;
  studioCovers: ReturnType<typeof collectionsToCovers>;
  playlistCovers: ReturnType<typeof playlistsToCovers>;
  artists?: TopArtistItem[];
  genres?: LibraryGenre[];
  avatarUrl?: string | null;
  displayName?: string;
}) {
  const href = tile.id === "profile-view" ? profileViewHref : tile.href;
  const Icon = tile.icon;
  const isHero = tile.placement.includes("row-span-2") && tile.placement.includes("col-span-2");
  const hasFill = Boolean(tile.fill);

  return (
    <Link
      to={href}
      className={[
        "group relative flex min-h-[9.5rem] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[var(--color-surface)] p-5 transition duration-300",
        "hover:border-white/[0.16] hover:bg-white/[0.04] hover:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]",
        tile.placement,
      ].join(" ")}
    >
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

      {hasFill ? (
        <BentoCardFill
          kind={tile.fill}
          studioCovers={studioCovers}
          playlistCovers={playlistCovers}
          artists={artists}
          genres={genres}
          avatarUrl={avatarUrl}
          displayName={displayName}
        />
      ) : null}

      <div className={`relative ${hasFill ? "mt-2" : "mt-auto pt-6"}`}>
        <h3
          className={[
            "font-black leading-[0.92] tracking-tighter text-white",
            isHero ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
          ].join(" ")}
        >
          {tile.title}
          {tile.titleLine2 ? (
            <span className="block text-white/55">{tile.titleLine2}</span>
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
  const { user } = useAuth();
  const profileViewHref = username ? profilePath(username) : ARTISTS_PATH;

  const topArtists = useTopArtists("7d", 5);
  const topPlaylists = useTopPlaylists("7d", 4);
  const libraryGenres = useLibraryGenres();
  const myPlaylists = usePlaylists(4, user?.id, Boolean(user?.id));

  const playlistCovers = playlistsToCovers(topPlaylists.data?.data ?? []);
  const studioCovers = collectionsToCovers(myPlaylists.data?.data ?? []);
  const artists = topArtists.data?.data;
  const genres = libraryGenres.data?.data;

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
          <BentoCard
            key={tile.id}
            tile={tile}
            profileViewHref={profileViewHref}
            studioCovers={studioCovers}
            playlistCovers={playlistCovers}
            artists={artists}
            genres={genres}
            avatarUrl={user?.avatarUrl}
            displayName={user?.displayName}
          />
        ))}
      </div>
    </section>
  );
}
