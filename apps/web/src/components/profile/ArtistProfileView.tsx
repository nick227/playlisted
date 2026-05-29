import type { UserDetail } from "@playlisted/client-sdk";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useAuth } from "@/providers/AuthProvider";

import { ArtistProfileCollectionPanel } from "./ArtistProfileCollectionPanel";
import { ArtistProfileHero } from "./ArtistProfileHero";
import { ArtistProfileMetrics } from "./ArtistProfileMetrics";
import { ArtistProfileTimeline } from "./ArtistProfileTimeline";
import { ArtistProfileTracks } from "./ArtistProfileTracks";
import {
  buildUploadMilestones,
  computeArtistStats,
  profileAccentHue,
} from "./artistProfileUtils";

export type ArtistProfilePreview = Partial<Pick<UserDetail, "displayName" | "username" | "bio">>;

type ArtistProfileViewProps = {
  user: UserDetail;
  preview?: ArtistProfilePreview;
};

export function ArtistProfileView({ user, preview }: ArtistProfileViewProps) {
  const { user: authUser } = useAuth();
  const { tracks, isLoading: tracksLoading } = useArtistTracks(user.id);
  const [scrollToTrackId, setScrollToTrackId] = useState<string | null>(null);

  const isOwner = authUser?.id === user.id;
  const stats = useMemo(() => computeArtistStats(user, tracks), [user, tracks]);
  const milestones = useMemo(() => buildUploadMilestones(tracks), [tracks]);
  const accentHue = profileAccentHue(preview?.username ?? user.username);

  const sortedPlaylists = useMemo(() => {
    return [...user.publicPlaylists].sort((a, b) => {
      if (a.isPinnedOnProfile !== b.isPinnedOnProfile) return a.isPinnedOnProfile ? -1 : 1;
      const aDate = a.publishedAt ?? a.createdAt;
      const bDate = b.publishedAt ?? b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [user.publicPlaylists]);

  const hasContent = user.publicPlaylists.length > 0 || tracks.length > 0;

  return (
    <div className="space-y-14 pb-20">
      <ArtistProfileHero user={user} stats={stats} isOwner={isOwner} preview={preview} />
      <ArtistProfileMetrics stats={stats} accentHue={accentHue} />

      {sortedPlaylists.length > 0 ? (
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">Collections</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Expand any release to stream tracks inline
            </p>
          </div>
          <div className="space-y-5">
            {sortedPlaylists.map((playlist, index) => (
              <ArtistProfileCollectionPanel
                key={playlist.id}
                playlist={playlist}
                owner={user}
                defaultExpanded={playlist.isPinnedOnProfile || index === 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!tracksLoading && tracks.length > 0 ? (
        <>
          <ArtistProfileTracks
            tracks={tracks}
            artistName={preview?.displayName ?? user.displayName}
            scrollToId={scrollToTrackId}
            onScrolled={() => setScrollToTrackId(null)}
          />
          <ArtistProfileTimeline
            milestones={milestones}
            accentHue={accentHue}
            onSelect={setScrollToTrackId}
          />
        </>
      ) : null}

      {!tracksLoading && !hasContent ? (
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
