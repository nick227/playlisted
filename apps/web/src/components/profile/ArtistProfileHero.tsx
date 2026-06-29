import type { UserDetail } from "@playlisted/client-sdk";
import { Check, ExternalLink, Pause, Play, Plus, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useTheatreMode } from "@/components/app-shell/useTheatreMode";
import { useAuthAction } from "@/hooks/useAuthAction";
import { useFollowedArtistIds, useToggleFollowArtist } from "@/hooks/useFavorites";
import { formatPlayCount } from "@/lib/format";
import { coverFallback } from "@/lib/routes";
import { shareContent } from "@/lib/shareContent";
import { getProfileLinkPlatform } from "./profileLinks";

type ArtistProfileHeroProps = {
  user: UserDetail;
  genreNames: string;
  totalStreams: number;
  isOwner: boolean;
  preview?: Partial<Pick<UserDetail, "displayName" | "username" | "bio" | "profileLinks">>;
  onPlay?: () => void;
  isPlaying?: boolean;
  isPaused?: boolean;
};

function ArtistFollowButton({ artistId }: { artistId: string }) {
  const requireAuth = useAuthAction();
  const { ids: followedArtistIds } = useFollowedArtistIds();
  const { add, remove } = useToggleFollowArtist();
  const serverFollowing = followedArtistIds.has(artistId);
  const pending = add.isPending || remove.isPending;
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);
  const isFollowing = optimisticFollowing ?? serverFollowing;

  useEffect(() => {
    if (!pending && optimisticFollowing === serverFollowing) {
      setOptimisticFollowing(null);
    }
  }, [optimisticFollowing, pending, serverFollowing]);

  function handleClick() {
    requireAuth(() => {
      const nextFollowing = !isFollowing;
      setOptimisticFollowing(nextFollowing);
      const reset = () => setOptimisticFollowing(serverFollowing);

      if (isFollowing) remove.mutate(artistId, { onError: reset });
      else add.mutate(artistId, { onError: reset });
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={isFollowing ? "Unfollow artist" : "Follow artist"}
      aria-pressed={isFollowing}
      className={[
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10",
        isFollowing ? "bg-white/10" : "",
      ].join(" ")}
    >
      {isFollowing ? <Check size={18} /> : <Plus size={18} />}
      <span>{isFollowing ? "Following" : "Follow"}</span>
    </button>
  );
}

export function ArtistProfileHero({
  user,
  genreNames,
  totalStreams,
  isOwner,
  preview,
  onPlay,
  isPlaying,
  isPaused,
}: ArtistProfileHeroProps) {
  const displayName = preview?.displayName ?? user.displayName;
  const username = preview?.username ?? user.username;
  const bio = preview?.bio ?? user.bio;
  const profileLinks = preview?.profileLinks ?? user.profileLinks ?? [];
  const { theatreActive } = useTheatreMode();

  async function handleShare() {
    await shareContent(`${window.location.origin}/@/${encodeURIComponent(username)}`, displayName);
  }

  return (
    <section className="border-b border-white/10 pb-12 bg-[var(--color-canvas)]/50 rounded-lg p-4">
      <div className="grid gap-10 md:grid-cols-[minmax(140px,180px)_1fr] md:items-start">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="aspect-square w-full rounded-lg object-cover sm:max-w-[180px]"
          />
        ) : (
          <div
            className="aspect-square w-full max-w-[180px] rounded-lg"
            style={{ background: coverFallback(displayName) }}
          />
        )}

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-sm text-[var(--color-text-muted)]">@{username}</p>
          </div>

          <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-tight text-white md:text-5xl">
            {displayName}
          </h1>

          {bio ? (
            <p className="max-w-prose text-sm leading-relaxed text-[var(--color-text-muted)]">{bio}</p>
          ) : null}

          <p className="flex min-w-0 items-center overflow-hidden text-sm text-[var(--color-text-muted)]">
            {genreNames ? (
              <>
                <span className="min-w-0 truncate">{genreNames}</span>
                <span aria-hidden className="mx-1.5 shrink-0 text-white/20">
                  ·
                </span>
              </>
            ) : null}
            <span className="shrink-0 whitespace-nowrap">
              {formatPlayCount(totalStreams) || "0"} streams
            </span>
          </p>

          {profileLinks.length > 0 ? (
            <nav aria-label={`${displayName} links`} className="flex flex-wrap gap-2">
              {profileLinks.map((link) => {
                const platform = getProfileLinkPlatform(link.platform);
                const Icon = platform.icon;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-xs font-semibold text-[var(--color-text-muted)] transition hover:border-white/25 hover:text-white"
                    title={link.label}
                  >
                    <Icon size={14} />
                    <span>{link.label}</span>
                    <ExternalLink size={12} className="opacity-50" />
                  </a>
                );
              })}
            </nav>
          ) : null}

          <div className="mt-6 flex flex-nowrap items-center gap-3 overflow-x-auto collection-controls">
            {onPlay ? (
              <button
                type="button"
                onClick={onPlay}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black"
              >
                {isPlaying ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
                {isPlaying ? "Playing" : isPaused ? "Resume" : "Play"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex h-10 w-20 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
            {!isOwner ? (
              <>
                <FavoriteHeartButton
                  target="artist"
                  id={user.id}
                  variant="inline"
                  className="!h-10 !w-10 !rounded-full !border !border-white/20 !bg-transparent !opacity-100"
                />
                <ArtistFollowButton artistId={user.id} />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {user.heroImageUrl ? (
        <figure className="mt-10 overflow-hidden rounded-lg">
          <img
            src={user.heroImageUrl}
            alt=""
            className={[
              "theatre-crossfade aspect-[21/9] w-full object-cover",
              theatreActive ? "is-theatre-active" : "",
            ].join(" ")}
          />
        </figure>
      ) : null}
    </section>
  );
}
