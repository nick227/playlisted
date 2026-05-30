import type { UserDetail } from "@playlisted/client-sdk";
import { ExternalLink, Share2 } from "lucide-react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { formatPlayCount } from "@/lib/format";
import { coverFallback } from "@/lib/routes";
import { shareContent } from "@/lib/shareContent";
import { getProfileLinkPlatform } from "./profileLinks";

type ArtistProfileHeroProps = {
  user: UserDetail;
  totalStreams: number;
  isOwner: boolean;
  preview?: Partial<Pick<UserDetail, "displayName" | "username" | "bio" | "profileLinks">>;
};

export function ArtistProfileHero({ user, totalStreams, isOwner, preview }: ArtistProfileHeroProps) {
  const displayName = preview?.displayName ?? user.displayName;
  const username = preview?.username ?? user.username;
  const bio = preview?.bio ?? user.bio;
  const profileLinks = preview?.profileLinks ?? user.profileLinks ?? [];

  async function handleShare() {
    await shareContent(`${window.location.origin}/@/${encodeURIComponent(username)}`, displayName);
  }

  return (
    <section className="border-b border-white/10 pb-12">
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
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition hover:text-white"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>

          <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-tight text-white md:text-5xl">
            {displayName}
          </h1>

          {bio ? (
            <p className="max-w-prose text-sm leading-relaxed text-[var(--color-text-muted)]">{bio}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--color-text-muted)]">
            <span>{formatPlayCount(totalStreams) || "0"} streams</span>
            {!isOwner ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  Like
                  <FavoriteHeartButton
                    target="artist"
                    id={user.id}
                    variant="inline"
                    className="!relative !opacity-100 !p-0"
                  />
                </span>
              </>
            ) : null}
          </div>

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
        </div>
      </div>

      {user.heroImageUrl ? (
        <figure className="mt-10 overflow-hidden rounded-lg">
          <img src={user.heroImageUrl} alt="" className="aspect-[21/9] w-full object-cover" />
        </figure>
      ) : null}
    </section>
  );
}
