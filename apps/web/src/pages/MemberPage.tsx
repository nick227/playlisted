import { useParams } from "react-router-dom";

import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import { ArtistProfileView } from "@/components/profile/ArtistProfileView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useUser } from "@/hooks/useUser";
import { useUserByUsername } from "@/hooks/useUserByUsername";
import { usePageMeta } from "@/hooks/usePageMeta";
import { artistDetailCrumbs, BROWSE_LAYOUT_CLASS } from "@/lib/browsePaths";

export function MemberPage() {
  const { userId, username } = useParams<{ userId?: string; username?: string }>();
  const byUsername = useUserByUsername(username);
  const byId = useUser(userId);
  const query = username ? byUsername : byId;
  const { data: user, isLoading, isError } = query;
  const fallbackName = username ? decodeURIComponent(username).replace(/^@/, "") : "Artist";

  usePageMeta({
    title: user ? `${user.displayName} (@${user.username})` : "Artist",
    description: user ? `Listen to ${user.displayName}'s playlists on Playlisted.` : undefined,
    image: user?.avatarUrl,
  });

  if (isLoading) {
    return (
      <div className="pb-16">
        <div className={BROWSE_LAYOUT_CLASS}>
          <BrowseBreadcrumbs crumbs={artistDetailCrumbs(fallbackName)} />
        </div>
        <div className="mx-auto mt-5 max-w-7xl space-y-10">
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

  if (isError || !user) {
    return <EmptyState title="Artist not found" />;
  }

  return <ArtistProfileView user={user} />;
}
