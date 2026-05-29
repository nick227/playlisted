import type { UserDetail } from "@playlisted/client-sdk";
import { Share2 } from "lucide-react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { formatProfileDate } from "@/lib/format";
import { coverFallback } from "@/lib/routes";
import { shareContent } from "@/lib/shareContent";

import { profileAccentHue, type ArtistProfileStats } from "./artistProfileUtils";

type ArtistProfileHeroProps = {
  user: UserDetail;
  stats: ArtistProfileStats;
  isOwner: boolean;
  preview?: Partial<Pick<UserDetail, "displayName" | "username" | "bio">>;
};

export function ArtistProfileHero({ user, stats, isOwner, preview }: ArtistProfileHeroProps) {
  const displayName = preview?.displayName ?? user.displayName;
  const username = preview?.username ?? user.username;
  const bio = preview?.bio ?? user.bio;
  const hue = profileAccentHue(username);
  const heroBg = user.heroImageUrl
    ? `linear-gradient(135deg, hsl(${hue} 55% 12% / 0.95), hsl(${hue} 40% 6% / 0.98)), url(${user.heroImageUrl}) center/cover`
    : `radial-gradient(ellipse 80% 60% at 70% 20%, hsl(${hue} 70% 35% / 0.35), transparent), linear-gradient(160deg, hsl(${hue} 45% 14%), var(--color-canvas))`;

  async function handleShare() {
    await shareContent(`${window.location.origin}/@/${encodeURIComponent(username)}`, displayName);
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/6"
      style={{ background: heroBg, minHeight: "min(520px, 70vh)" }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: `hsl(${hue} 80% 55% / 0.18)` }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full blur-3xl"
        style={{ background: `hsl(${(hue + 60) % 360} 70% 50% / 0.12)` }}
      />

      <div className="relative flex min-h-[inherit] flex-col justify-between gap-12 p-8 md:p-12 lg:p-16">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            {user.isFeaturedArtist ? (
              <span
                className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ background: `hsl(${hue} 70% 50% / 0.2)`, color: `hsl(${hue} 80% 78%)` }}
              >
                Featured artist
              </span>
            ) : null}
            <p className="text-sm font-medium tracking-widest text-white/50 uppercase">@{username}</p>
          </div>

          <div className="flex items-center gap-3">
            {!isOwner ? (
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur-sm">
                <FavoriteHeartButton
                  target="artist"
                  id={user.id}
                  variant="inline"
                  className="!relative !opacity-100 !p-1 text-rose-400 hover:text-rose-300"
                />
                <span className="pr-1 text-sm font-semibold text-white/80">Favorite artist</span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void handleShare()}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/10"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0 space-y-6">
            <h1 className="text-5xl font-black leading-[0.92] tracking-tighter text-white sm:text-6xl md:text-7xl lg:text-8xl">
              {displayName}
            </h1>
            {bio ? (
              <p className="max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">{bio}</p>
            ) : (
              <p className="text-sm text-white/35">No bio yet.</p>
            )}
            <p className="text-xs tracking-wide text-white/40 uppercase">
              Member since {formatProfileDate(stats.memberSince)}
            </p>
          </div>

          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-36 w-36 shrink-0 rounded-2xl object-cover shadow-2xl ring-1 ring-white/20 md:h-44 md:w-44 lg:h-52 lg:w-52"
            />
          ) : (
            <div
              className="h-36 w-36 shrink-0 rounded-2xl shadow-2xl ring-1 ring-white/20 md:h-44 md:w-44 lg:h-52 lg:w-52"
              style={{ background: coverFallback(displayName) }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
