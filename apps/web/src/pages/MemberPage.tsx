import { useParams } from "react-router-dom";

import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { ArtistProfileView } from "@/components/profile/ArtistProfileView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import {
  ARTIST_PROFILE_HELD_PANEL_COUNT,
  ARTIST_PROFILE_RELATED_LIMIT,
  ARTIST_PROFILE_RELATED_RANGE,
  sortProfilePlaylists,
} from "@/components/profile/artistProfileUtils";
import { topArtistsQueryOptions } from "@/hooks/useCharts";
import { useHoldRouteUntilCached } from "@/hooks/useHoldRouteUntilCached";
import { librarySongsQueryOptions } from "@/hooks/useLibrary";
import { playlistByUsernameSlugQueryOptions } from "@/hooks/usePlaylistByUsernameSlug";
import { useAuth } from "@/providers/AuthProvider";
import { useUser, userQueryOptions } from "@/hooks/useUser";
import { userByUsernameQueryOptions, useUserByUsername } from "@/hooks/useUserByUsername";
import { usePageMeta } from "@/hooks/usePageMeta";
import { artistDetailCrumbs, ARTIST_PROFILE_LAYOUT_CLASS } from "@/lib/browsePaths";

export function MemberPage() {
  const { userId, username } = useParams<{ userId?: string; username?: string }>();
  const { accessToken } = useAuth();
  const byUsername = useUserByUsername(username);
  const byId = useUser(userId);
  const query = username ? byUsername : byId;
  const { data: user, isLoading, isFetching, isError, isPlaceholderData } = query;
  const fallbackName = username ? decodeURIComponent(username).replace(/^@/, "") : "Artist";

  usePageMeta({
    title: user ? `${user.displayName} (@${user.username})` : "Artist",
    description: user ? `Listen to ${user.displayName}'s playlists on Playlisted.` : undefined,
    image: user?.avatarUrl,
  });

  // Hero track stats and the related-artists row don't depend on the user, so they
  // load alongside it; once the user lands, the first viewport's collection panels
  // load in parallel. Last hook: suspending anywhere earlier would change the hook
  // list between attempts.
  const heldPanels =
    user && !isPlaceholderData
      ? sortProfilePlaylists(user.publicPlaylists).slice(0, ARTIST_PROFILE_HELD_PANEL_COUNT)
      : [];
  useHoldRouteUntilCached(
    username ? userByUsernameQueryOptions(username) : userQueryOptions(userId),
    librarySongsQueryOptions(null),
    topArtistsQueryOptions(ARTIST_PROFILE_RELATED_RANGE, ARTIST_PROFILE_RELATED_LIMIT + 1),
    ...heldPanels.map((playlist) => playlistByUsernameSlugQueryOptions(accessToken, user?.username, playlist.slug)),
  );

  if (isLoading && !user) {
    return (
      <div className="pb-16">
        <div className={ARTIST_PROFILE_LAYOUT_CLASS}>
          <BrowseBreadcrumbs crumbs={artistDetailCrumbs(fallbackName)} />
        </div>
        <div className="mx-auto mt-5 max-w-7xl space-y-10 bg-[var(--color-canvas)]/50">
          <Skeleton className="h-[420px] w-full rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError && !user) {
    return <EmptyState title="Artist not found" />;
  }

  if (!user) {
    return <EmptyState title="Artist not found" />;
  }

  return <ArtistProfileView user={user} isRefreshing={isFetching && !isLoading} />;
}
