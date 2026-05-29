import { useParams } from "react-router-dom";

import { ArtistProfileView } from "@/components/profile/ArtistProfileView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useUser } from "@/hooks/useUser";
import { useUserByUsername } from "@/hooks/useUserByUsername";
import { usePageMeta } from "@/hooks/usePageMeta";

export function MemberPage() {
  const { userId, username } = useParams<{ userId?: string; username?: string }>();
  const byUsername = useUserByUsername(username);
  const byId = useUser(userId);
  const query = username ? byUsername : byId;
  const { data: user, isLoading, isError } = query;

  usePageMeta({
    title: user ? `${user.displayName} (@${user.username})` : "Artist",
    description: user ? `Listen to ${user.displayName}'s playlists on Playlisted.` : undefined,
    image: user?.avatarUrl,
  });

  if (isLoading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-[420px] w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !user) {
    return <EmptyState title="Artist not found" />;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <ArtistProfileView user={user} />
    </div>
  );
}
