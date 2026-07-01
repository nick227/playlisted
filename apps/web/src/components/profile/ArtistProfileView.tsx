import type { TopArtistItem, UserDetail } from "@playlisted/client-sdk";
import { useMemo } from "react";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useTopArtists } from "@/hooks/useCharts";
import { genresFromSongs } from "@/components/library/libraryFilterUtils";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { artistDetailCrumbs, ARTIST_PROFILE_LAYOUT_CLASS } from "@/lib/browsePaths";
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
};

export function ArtistProfileView({ user, preview }: ArtistProfileViewProps) {
  const relatedArtistLimit = 6;
  const { data: related } = useTopArtists("30d", relatedArtistLimit + 1);
  const { user: authUser } = useAuth();
  const { setQueue, togglePlay, activeOriginKey, state } = useAudioPlayer();
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
    return (related?.data ?? [])
      .filter((item: TopArtistItem) => item.userId !== user.id)
      .slice(0, relatedArtistLimit);
  }, [related?.data, user.id]);

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
      togglePlay();
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

  return (
    <div className="pb-16 mx-auto max-w-3xl bg-[var(--color-canvas)]/80">
      <div className="py-2 px-4">
        <BrowseBreadcrumbs crumbs={browseCrumbs} />
      </div>

      <div className="space-y-10">
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
          <section>
            {sortedPlaylists.map((playlist) => (
              <ArtistProfileCollectionPanel key={playlist.id} playlist={playlist} owner={user} />
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

      {relatedArtists.length > 0 ? (
        <div className={`${ARTIST_PROFILE_LAYOUT_CLASS} mt-4`}>
          <ContentRow title="More Artists">
            {relatedArtists.map((item: TopArtistItem) => (
              <ArtistCard
                key={item.userId}
                id={item.userId}
                username={item.username}
                displayName={item.displayName}
                avatarUrl={item.avatarUrl}
                className="w-45 shrink-0"
              />
            ))}
          </ContentRow>
        </div>
      ) : null}
    </div>
  );
}
