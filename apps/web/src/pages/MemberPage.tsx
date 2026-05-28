import { Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { PlaylistCard } from "@/components/cards/PlaylistCard";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useUser } from "@/hooks/useUser";
import { useUserByUsername } from "@/hooks/useUserByUsername";
import { coverFallback, playlistPath } from "@/lib/routes";

export function MemberPage() {
  const { userId, username } = useParams<{ userId?: string; username?: string }>();
  const byUsername = useUserByUsername(username);
  const byId = useUser(userId);
  const query = username ? byUsername : byId;
  const { data: user, isLoading, isError } = query;

  if (isLoading) {
    return (
      <div>
        <Skeleton className="mb-8 h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-32 rounded-full" />
      </div>
    );
  }

  if (isError || !user) {
    return <EmptyState title="Artist not found" />;
  }

  const pinned = user.publicPlaylists.find((p) => p.isPinnedOnProfile) ?? user.publicPlaylists[0];
  const heroBg = user.heroImageUrl
    ? `linear-gradient(to top, #0c1016, transparent 50%), url(${user.heroImageUrl}) center/cover`
    : coverFallback(user.displayName);

  return (
    <div className="mx-auto max-w-6xl">
      <section
        className="relative -mx-4 mb-8 overflow-hidden rounded-none md:-mx-8 md:rounded-2xl"
        style={{ background: heroBg, minHeight: "240px" }}
      >
        <div className="flex min-h-[240px] flex-col justify-end bg-gradient-to-t from-[var(--color-canvas)] to-transparent p-8">
          <div className="flex items-end gap-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-28 w-28 rounded-full border-4 border-[var(--color-canvas)] object-cover shadow-xl"
              />
            ) : (
              <div
                className="h-28 w-28 rounded-full border-4 border-[var(--color-canvas)] shadow-xl"
                style={{ background: coverFallback(user.username) }}
              />
            )}
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{user.displayName}</h1>
              <p className="text-[var(--color-text-muted)]">@{user.username}</p>
            </div>
          </div>
        </div>
      </section>

      {user.bio ? (
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">{user.bio}</p>
      ) : null}

      {pinned ? (
        <section className="mb-12 flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:flex-row md:items-center">
          {pinned.coverArtUrl ? (
            <img src={pinned.coverArtUrl} alt="" className="h-32 w-32 rounded-lg object-cover" />
          ) : (
            <div
              className="h-32 w-32 rounded-lg"
              style={{ background: coverFallback(pinned.title) }}
            />
          )}
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Pinned release
            </p>
            <h2 className="mt-1 text-2xl font-bold">{pinned.title}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{pinned.description}</p>
          </div>
          <Link
            to={playlistPath({ id: pinned.id, slug: pinned.slug, owner: { username: user.username } })}
            className="inline-flex items-center gap-2 self-start rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black md:self-center"
          >
            <Play size={18} fill="currentColor" />
            Play
          </Link>
        </section>
      ) : null}

      {user.publicPlaylists.length > 0 ? (
        <ContentRow title="Collections">
          {user.publicPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              id={playlist.id}
              title={playlist.title}
              creatorName={user.displayName}
              coverArtUrl={playlist.coverArtUrl}
              meta={`${playlist.itemCount} tracks`}
            />
          ))}
        </ContentRow>
      ) : (
        <EmptyState title="No public collections" description="This creator has not published yet." />
      )}
    </div>
  );
}
