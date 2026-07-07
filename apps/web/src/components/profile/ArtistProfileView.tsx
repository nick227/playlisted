import type { TopArtistItem, UserDetail } from "@playlisted/client-sdk";
import { useCallback, useMemo } from "react";

import { SwipeBrowseShell } from "@/components/browse/SwipeBrowseShell";
import { ArtistCard } from "@/components/cards/ArtistCard";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useTopArtists } from "@/hooks/useCharts";
import { genresFromSongs } from "@/components/library/libraryFilterUtils";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { artistDetailCrumbs } from "@/lib/browsePaths";
import { resolveArtistBrowseSequence } from "@/lib/browseNavigation/resolveArtistNeighbors";
import { artistProfileArtistOrigin } from "@/lib/playbackOrigin";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

import { ArtistProfileCollectionPanel } from "./ArtistProfileCollectionPanel";
import { ArtistProfileHero } from "./ArtistProfileHero";
import { computeArtistStreams } from "./artistProfileUtils";

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
  const relatedArtistLimit = 12;
  const { data: related } = useTopArtists("30d", relatedArtistLimit + 1);
  const { user: authUser } = useAuth();
  const { setQueue, togglePlay, ensurePlayback, activeOriginKey, state } = useAudioPlayer();
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
  const artistHasCurrent = activeOriginKey === playbackOrigin;
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

  const sortedPlaylists = useMemo(() => {
    return [...user.publicPlaylists].sort((a, b) => {
      if (a.isPinnedOnProfile !== b.isPinnedOnProfile) return a.isPinnedOnProfile ? -1 : 1;
      const aDate = a.publishedAt ?? a.createdAt;
      const bDate = b.publishedAt ?? b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [user.publicPlaylists]);

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
      <div className="mx-auto w-full min-w-0 max-w-3xl overflow-x-clip bg-[var(--color-canvas)]/80 shadow-[0_0_20px_rgba(0,0,0,0.5)]  pb-4">
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
            <section className="min-w-0 space-y-8">
              {sortedPlaylists.map((playlist) => (
                <ArtistProfileCollectionPanel
                  key={playlist.id}
                  playlist={playlist}
                  owner={user}
                  editHref={collectionEditHref?.(playlist)}
                />
              ))}
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

        <div className="mt-8 min-w-0 p-2">
          {relatedArtists.length > 0 ? (
            <ContentRow title="More Artists">
              {relatedArtists.map((item: TopArtistItem) => (
                <ArtistCard
                  key={item.userId}
                  id={item.userId}
                  username={item.username}
                  displayName={item.displayName}
                  avatarUrl={item.avatarUrl}
                />
              ))}
            </ContentRow>
          ) : null}
        </div>
      </div>
    </SwipeBrowseShell>
  );
}
