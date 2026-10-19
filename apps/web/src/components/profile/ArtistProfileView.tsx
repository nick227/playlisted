import type { TopArtistItem, UserDetail } from "@playlisted/client-sdk";
import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import { SwipeBrowseShell } from "@/components/browse/SwipeBrowseShell";
import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { MuseumScrollRow } from "@/components/library/museum/museumUi";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useTopArtists } from "@/hooks/useCharts";
import { genresFromSongs } from "@/components/library/libraryFilterUtils";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { artistDetailCrumbs, artistPath } from "@/lib/browsePaths";
import { resolveArtistBrowseSequence } from "@/lib/browseNavigation/resolveArtistNeighbors";
import { artistProfileArtistOrigin } from "@/lib/playbackOrigin";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

import { ArtistProfileCollectionPanel } from "./ArtistProfileCollectionPanel";
import { ArtistProfileHero } from "./ArtistProfileHero";
import {
  ARTIST_PROFILE_RELATED_LIMIT,
  ARTIST_PROFILE_RELATED_RANGE,
  computeArtistStreams,
  sortProfilePlaylists,
} from "./artistProfileUtils";

export type ArtistProfilePreview = Partial<Pick<UserDetail, "displayName" | "username" | "bio" | "profileLinks">>;

type ArtistProfileViewProps = {
  user: UserDetail;
  preview?: ArtistProfilePreview;
  showRelatedArtists?: boolean;
  collectionEditHref?: (playlist: UserDetail["publicPlaylists"][number]) => string;
  isRefreshing?: boolean;
};

export function ArtistProfileView({
  user,
  preview,
  showRelatedArtists = true,
  collectionEditHref,
  isRefreshing = false,
}: ArtistProfileViewProps) {
  const relatedArtistLimit = ARTIST_PROFILE_RELATED_LIMIT;
  const { data: related } = useTopArtists(ARTIST_PROFILE_RELATED_RANGE, relatedArtistLimit + 1);
  const { user: authUser } = useAuth();
  const { setQueue, currentTrack, togglePlay, ensurePlayback, activeOriginKey, state } = useAudioPlayer();
  const { tracks, isLoading: tracksLoading } = useArtistTracks(user.id);

  const isOwner = authUser?.id === user.id;
  const totalStreams = useMemo(() => computeArtistStreams(tracks), [tracks]);
  const genreNames = useMemo(
    () => genresFromSongs(tracks).map((genre) => genre.name).join(" · "),
    [tracks],
  );
  const displayName = preview?.displayName ?? user.displayName;
  const browseCrumbs = artistDetailCrumbs(displayName);
  const playbackOrigin = artistProfileArtistOrigin(user.id);
  const artistContainsCurrentTrack = Boolean(
    currentTrack?.id &&
      (currentTrack.uploaderId === user.id || tracks.some((track) => track.id === currentTrack.id)),
  );
  const artistHasCurrent = activeOriginKey === playbackOrigin || artistContainsCurrentTrack;
  const artistIsPlaying = artistHasCurrent && state === "playing";
  const artistIsPaused = artistHasCurrent && state === "paused";
  const queueTracks = useMemo(
    () => tracks.map((track) => librarySongToQueueTrack(track, displayName)),
    [displayName, tracks],
  );
  const relatedArtists = useMemo(() => {
    if (!showRelatedArtists) return [];
    return (related?.data ?? [])
      .filter((item: TopArtistItem) => item.userId !== user.id)
      .slice(0, relatedArtistLimit);
  }, [related?.data, showRelatedArtists, user.id]);

  const sortedPlaylists = useMemo(() => sortProfilePlaylists(user.publicPlaylists), [user.publicPlaylists]);

  function playArtist() {
    if (artistHasCurrent) {
      if (artistIsPlaying) {
        togglePlay();
      } else {
        ensurePlayback();
      }
      return;
    }

    if (queueTracks.length === 0) return;

    const firstTrack = queueTracks[0];
    setQueue(
      queueTracks,
      0,
      {
        playlistId: firstTrack.publishedPlaylistId,
        playlistOwnerUsername: user.username,
        playlistSlug: firstTrack.playlistSlug ?? undefined,
        sourceContext: "artist-profile",
      },
      {
        segmentLabel: displayName,
        playbackOrigin,
        originScope: "artist",
      },
    );
  }

  const resolveNeighbors = useCallback(
    () => resolveArtistBrowseSequence(user.id),
    [user.id],
  );

  return (
    <SwipeBrowseShell
      neighborsKey={`artist:${user.id}`}
      resolveNeighbors={resolveNeighbors}
      endLabel="artists"
      isRefreshing={isRefreshing}
    >
      <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-clip bg-[var(--color-canvas)]/90 pb-4">
        <div className="px-4 py-2">
          <BrowseBreadcrumbs crumbs={browseCrumbs} />
        </div>

        <div className="min-w-0 space-y-10">
          <ArtistProfileHero
            user={user}
            genreNames={genreNames}
            totalStreams={totalStreams}
            isOwner={isOwner}
            preview={preview}
            onPlay={queueTracks.length > 0 ? playArtist : undefined}
            isPlaying={artistIsPlaying}
            isPaused={artistIsPaused}
          />

          {sortedPlaylists.length > 0 ? (
            <section className="min-w-0 px-4" aria-labelledby="artist-releases-heading">
              <h2
                id="artist-releases-heading"
                className="border-b border-white/10 pb-3 text-sm font-bold uppercase tracking-[0.18em] text-white/90"
              >
                Playlists / Albums
              </h2>
              <div className="divide-y divide-white/10">
                {sortedPlaylists.map((playlist) => (
                  <ArtistProfileCollectionPanel
                    key={playlist.id}
                    playlist={playlist}
                    owner={user}
                    editHref={collectionEditHref?.(playlist)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {!tracksLoading && sortedPlaylists.length === 0 ? (
            <EmptyState
              title="No public music yet"
              description={
                isOwner
                  ? "Upload tracks and publish collections to fill out your profile."
                  : "This creator has not published yet."
              }
            />
          ) : null}
        </div>

        {relatedArtists.length > 0 ? (
          <section className="mt-8 min-w-0 px-4">
            <SectionHeader title="More Artists" />
            <MuseumScrollRow variant="portrait">
              {relatedArtists.map((item: TopArtistItem) => (
                <div key={item.userId} className="min-w-0">
                  <SmartArtistCard
                    id={item.userId}
                    username={item.username}
                    displayName={item.displayName}
                    avatarUrl={item.avatarUrl}
                    shape="rounded-sm"
                    className="relative w-full"
                    hideDetails
                  />
                  <Link
                    to={artistPath(item.username)}
                    className="mt-2.5 block truncate text-sm font-semibold leading-5 text-white transition hover:text-white/80"
                  >
                    {item.displayName}
                  </Link>
                </div>
              ))}
            </MuseumScrollRow>
          </section>
        ) : null}
      </div>
    </SwipeBrowseShell>
  );
}
