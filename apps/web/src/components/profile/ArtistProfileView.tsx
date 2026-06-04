import type { UserDetail } from "@playlisted/client-sdk";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { artistPath } from "@/lib/browsePaths";
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
  const { user: authUser } = useAuth();
  const { tracks, isLoading: tracksLoading } = useArtistTracks(user.id);

  const isOwner = authUser?.id === user.id;
  const totalStreams = useMemo(() => computeArtistStreams(tracks), [tracks]);

  const sortedPlaylists = useMemo(() => {
    return [...user.publicPlaylists].sort((a, b) => {
      if (a.isPinnedOnProfile !== b.isPinnedOnProfile) return a.isPinnedOnProfile ? -1 : 1;
      const aDate = a.publishedAt ?? a.createdAt;
      const bDate = b.publishedAt ?? b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [user.publicPlaylists]);

  return (
    <div className="space-y-10 pb-16">
      <ArtistProfileHero user={user} totalStreams={totalStreams} isOwner={isOwner} preview={preview} />

      <p>
        <Link
          to={artistPath(user.username)}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          Browse catalog
        </Link>
      </p>

      {sortedPlaylists.length > 0 ? (
        <section>
          <div>
            {sortedPlaylists.map((playlist) => (
              <ArtistProfileCollectionPanel key={playlist.id} playlist={playlist} owner={user} />
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
  );
}
