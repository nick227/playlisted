import {
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

import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { usePlaylists } from "@/hooks/usePlaylists";
import {
  ARTISTS_PATH,
  GENRES_PATH,
  PLAYLISTS_PATH,
  SONGS_PATH,
} from "@/lib/browsePaths";
import { profilePath, STUDIO_PATH } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

import {
  BentoArtistPreview,
  BentoGenrePreview,
  BentoPreviewSkeleton,
  BentoProfilePreview,
  BentoSongPreview,
  BentoStudioPreview,
  BentoTileLink,
  BentoUploadPreview,
  BentoCoverGrid,
  pickBentoGenres,
  playlistsToCovers,
} from "./homeExploreBentoParts";

const STUDIO_PROFILE_PATH = "/studio/profile";
const STUDIO_COLLECTIONS_PATH = "/studio/collections";

const PREVIEW_LIMIT = { songs: 3, genres: 8, artists: 5, playlists: 4, collections: 4 } as const;

export function HomeExploreBento({ username }: { username?: string }) {
  const { user } = useAuth();
  const profileViewHref = username ? profilePath(username) : ARTISTS_PATH;

  const topSongs = useTopSongs("7d", PREVIEW_LIMIT.songs);
  const topArtists = useTopArtists("7d", PREVIEW_LIMIT.artists);
  const topPlaylists = useTopPlaylists("7d", PREVIEW_LIMIT.playlists);
  const libraryGenres = useLibraryGenres();
  const myPlaylists = usePlaylists(PREVIEW_LIMIT.collections, user?.id, Boolean(user?.id));

  const songs = topSongs.data?.data ?? [];
  const artists = topArtists.data?.data ?? [];
  const playlists = topPlaylists.data?.data ?? [];
  const genres = pickBentoGenres(libraryGenres.data?.data ?? [], PREVIEW_LIMIT.genres);
  const myCollections = myPlaylists.data?.data ?? [];
  const latestCollection = myCollections[0];

  return (
    <section className="mb-10" aria-labelledby="home-explore-bento-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-brand)]">
            <LayoutGrid size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h2 id="home-explore-bento-heading" className="text-xl font-bold tracking-tight text-white">
              Explore the site
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              Live picks from charts and your library — tap any tile to go deeper
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6 lg:grid-rows-[repeat(3,minmax(10.5rem,auto))]">
        <BentoTileLink
          href={STUDIO_PATH}
          accent="violet"
          placement="lg:col-span-3 lg:row-span-2"
          label="Creator hub"
          title="Artist"
          titleLine2="Studio"
          description="Collections, analytics, and your dashboard."
          icon={Mic2}
        >
          {myPlaylists.isLoading && !user ? (
            <BentoPreviewSkeleton rows={2} />
          ) : (
            <BentoStudioPreview
              collections={myCollections}
              displayName={user?.displayName}
            />
          )}
        </BentoTileLink>

        <BentoTileLink
          href={SONGS_PATH}
          accent="sky"
          placement="lg:col-span-3 lg:row-start-1"
          label="Browse"
          title="Songs"
          description="Every public track on the platform."
          icon={Disc3}
        >
          {topSongs.isLoading ? <BentoPreviewSkeleton /> : <BentoSongPreview songs={songs} />}
        </BentoTileLink>

        <BentoTileLink
          href={GENRES_PATH}
          accent="amber"
          placement="lg:col-span-2 lg:row-start-2"
          label="Browse"
          title="Genres"
          description="Filter by mood, style, and scene."
          icon={Sparkles}
        >
          {libraryGenres.isLoading ? <BentoPreviewSkeleton rows={2} /> : <BentoGenrePreview genres={genres} />}
        </BentoTileLink>

        <BentoTileLink
          href={ARTISTS_PATH}
          accent="emerald"
          placement="lg:col-span-4 lg:row-start-2"
          label="Community"
          title="Artists"
          description="Profiles and creators behind the music."
          icon={Users}
        >
          {topArtists.isLoading ? <BentoPreviewSkeleton /> : <BentoArtistPreview artists={artists} />}
        </BentoTileLink>

        <BentoTileLink
          href={PLAYLISTS_PATH}
          accent="rose"
          placement="lg:col-span-3 lg:row-span-2 lg:row-start-3"
          label="Collections"
          title="Playlists"
          description="Curated sets worth a spin."
          icon={ListMusic}
        >
          {topPlaylists.isLoading ? (
            <BentoPreviewSkeleton rows={2} />
          ) : (
            <BentoCoverGrid items={playlistsToCovers(playlists)} />
          )}
        </BentoTileLink>

        <BentoTileLink
          href={STUDIO_COLLECTIONS_PATH}
          accent="orange"
          placement="lg:col-span-1 lg:row-start-3"
          label="Publish"
          title="Upload"
          description="Ship your next release."
          icon={Upload}
        >
          <BentoUploadPreview
            collectionTitle={latestCollection?.title}
            trackHint={
              latestCollection?.itemCount != null
                ? `${latestCollection.itemCount} track${latestCollection.itemCount === 1 ? "" : "s"}`
                : undefined
            }
          />
        </BentoTileLink>

        <BentoTileLink
          href={STUDIO_PROFILE_PATH}
          accent="cyan"
          placement="lg:col-span-1 lg:row-start-3"
          label="Account"
          title="Profile"
          titleLine2="Edit"
          description="Bio, avatar, and links."
          icon={UserPen}
        >
          <BentoProfilePreview
            variant="edit"
            displayName={user?.displayName}
            username={user?.username ?? username}
            avatarUrl={user?.avatarUrl}
          />
        </BentoTileLink>

        <BentoTileLink
          href={profileViewHref}
          accent="indigo"
          placement="lg:col-span-1 lg:row-start-3"
          label="Public page"
          title="Profile"
          titleLine2="View"
          description="Your page as listeners see it."
          icon={Eye}
        >
          <BentoProfilePreview
            variant="view"
            displayName={user?.displayName}
            username={user?.username ?? username}
            avatarUrl={user?.avatarUrl}
          />
        </BentoTileLink>
      </div>
    </section>
  );
}
