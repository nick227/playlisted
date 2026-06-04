import type { TopArtistItem, UserDetail } from "@playlisted/client-sdk";
import { useMemo } from "react";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useTopArtists } from "@/hooks/useCharts";
import { genresFromSongs } from "@/components/library/libraryFilterUtils";
import { artistDetailCrumbs, ARTIST_PROFILE_LAYOUT_CLASS } from "@/lib/browsePaths";
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
  const { data: related } = useTopArtists("7d", relatedArtistLimit + 1);
  const { user: authUser } = useAuth();
  const { tracks, isLoading: tracksLoading } = useArtistTracks(user.id);

  const isOwner = authUser?.id === user.id;
  const totalStreams = useMemo(() => computeArtistStreams(tracks), [tracks]);
  const genreNames = useMemo(
    () => genresFromSongs(tracks).map((genre) => genre.name).join(" · "),
    [tracks],
  );
  const displayName = preview?.displayName ?? user.displayName;
  const browseCrumbs = artistDetailCrumbs(displayName);
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

  return (
    <div className="pb-16">
      <div className={ARTIST_PROFILE_LAYOUT_CLASS}>
        <BrowseBreadcrumbs crumbs={browseCrumbs} />
      </div>

      <div className="mx-auto mt-5 max-w-7xl space-y-10">
        <ArtistProfileHero
          user={user}
          genreNames={genreNames}
          totalStreams={totalStreams}
          isOwner={isOwner}
          preview={preview}
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
        <div className={`${ARTIST_PROFILE_LAYOUT_CLASS} mt-14`}>
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
