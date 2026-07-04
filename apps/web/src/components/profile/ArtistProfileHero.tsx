import type { ProfileLink, UserDetail } from "@playlisted/client-sdk";
import { Check, ExternalLink, Pause, Play, Plus, Share2, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useTheatreMode } from "@/components/app-shell/useTheatreMode";
import { useAuthAction } from "@/hooks/useAuthAction";
import { useFollowedArtistIds, useToggleFollowArtist } from "@/hooks/useFavorites";
import { formatPlayCount } from "@/lib/format";
import { coverFallback } from "@/lib/routes";
import { shareContent } from "@/lib/shareContent";
import { getProfileLinkPlatform, createProfileLink, PROFILE_LINK_PLATFORMS, prepareProfileLinks } from "./profileLinks";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

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
  const { accessToken, refreshUser } = useAuth();
  const displayName = preview?.displayName ?? user.displayName;
  const username = preview?.username ?? user.username;
  const bio = preview?.bio ?? user.bio;
  const profileLinks = preview?.profileLinks ?? user.profileLinks ?? [];
  const { theatreActive } = useTheatreMode();

  const [savingField, setSavingField] = useState<string | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const [editingLinks, setEditingLinks] = useState(false);
  const [localLinks, setLocalLinks] = useState<ProfileLink[]>(profileLinks);

  const { data: analytics } = useQuery({
    queryKey: ["me", "analytics", "summary"],
    queryFn: () => authedApi(accessToken!).analytics.summary(),
    enabled: isOwner && !preview && !!accessToken,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { displayName?: string; bio?: string | null; avatarUrl?: string; profileLinks?: any[] }) => {
      if (!accessToken) throw new Error("Not logged in");
      const client = authedApi(accessToken);
      return client.users.updateMe({ ...data });
    },
    onSuccess: async (_, vars) => {
      await refreshUser();
      if (vars.displayName !== undefined) setSavingField("displayName");
      else if (vars.bio !== undefined) setSavingField("bio");
      else if (vars.avatarUrl !== undefined) setSavingField("avatarUrl");
      else if (vars.profileLinks !== undefined) setSavingField("profileLinks");
      
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSavingField(null), 2000);
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!accessToken) throw new Error("Not logged in");
      const client = authedApi(accessToken);
      const res = await client.ingest.upload(file, "image");
      await client.users.updateMe({ avatarUrl: res.url });
      return res.url;
    },
    onSuccess: async () => {
      await refreshUser();
      setSavingField("avatarUrl");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSavingField(null), 2000);
    },
  });

  const handleNameBlur = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const newName = e.currentTarget.textContent?.trim();
    if (newName && newName !== displayName) {
      updateMutation.mutate({ displayName: newName });
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleBioBlur = (e: React.FocusEvent<HTMLParagraphElement>) => {
    const newBio = e.currentTarget.textContent?.trim();
    if (newBio !== bio) {
      updateMutation.mutate({ bio: newBio || null });
    }
  };

  async function handleShare() {
    await shareContent(`${window.location.origin}/@/${encodeURIComponent(username)}`, displayName);
  }
  
  function saveLinks() {
    updateMutation.mutate({ profileLinks: prepareProfileLinks(localLinks) });
    setEditingLinks(false);
  }

  function patchLocalLink(linkId: string, patch: Partial<ProfileLink>) {
    setLocalLinks((links) =>
      links.map((link) => {
        if (link.id !== linkId) return link;
        if (patch.platform && patch.platform !== link.platform) {
          const previousPlatform = getProfileLinkPlatform(link.platform);
          const nextPlatform = getProfileLinkPlatform(patch.platform);
          return {
            ...link,
            ...patch,
            label: !link.label || link.label === previousPlatform.label ? nextPlatform.label : link.label,
          };
        }
        return { ...link, ...patch };
      })
    );
  }

  return (
    <section className="border-b border-white/10 pb-12 rounded-lg p-4">
      <div className="grid gap-10 md:grid-cols-[minmax(140px,180px)_1fr] md:items-start">
        <div className="relative group/avatar">
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
          
          {isOwner && !preview ? (
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition cursor-pointer rounded-lg">
              <div className="text-center text-white flex flex-col items-center gap-2">
                {uploadAvatarMutation.isPending ? (
                  <span className="text-sm font-semibold">Uploading...</span>
                ) : (
                  <>
                    <Upload size={24} />
                    <span className="text-xs font-semibold">Change Avatar</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatarMutation.mutate(file);
                }}
              />
            </label>
          ) : null}
          {savingField === "avatarUrl" && (
            <div className="absolute -top-2 -right-2 z-10">
               <span className="text-[10px] font-bold text-green-400 bg-green-900/80 px-1.5 py-0.5 rounded uppercase tracking-wider">Saved</span>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-sm text-[var(--color-text-muted)]">@{username}</p>
          </div>

          <div className="flex items-center gap-3">
            <h1 
              className="max-w-3xl text-4xl font-light leading-tight tracking-tight text-white md:text-5xl outline-none focus:bg-white/5 rounded px-1 -ml-1 py-0.5 transition-colors"
              contentEditable={isOwner && !preview}
              suppressContentEditableWarning={true}
              onBlur={isOwner && !preview ? handleNameBlur : undefined}
              onKeyDown={isOwner && !preview ? handleNameKeyDown : undefined}
            >
              {displayName}
            </h1>
            {savingField === "displayName" && <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Saved</span>}
          </div>

          {(bio || (isOwner && !preview)) ? (
            <div className="flex items-center gap-3">
              <p 
                className="max-w-prose text-sm leading-relaxed text-[var(--color-text-muted)] outline-none min-w-[200px] min-h-[1.5em] empty:before:content-['Add_a_bio...'] empty:before:text-white/20 transition-colors focus:bg-white/5 rounded px-1 -ml-1 py-0.5"
                contentEditable={isOwner && !preview}
                suppressContentEditableWarning={true}
                onBlur={isOwner && !preview ? handleBioBlur : undefined}
              >
                {bio}
              </p>
              {savingField === "bio" && <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Saved</span>}
            </div>
          ) : null}

          {isOwner && !preview && analytics ? (
            <ul className="flex items-center gap-6 divide-x divide-white/10 text-sm mt-2">
              <li className="flex flex-col pr-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Views</span>
                <span className="text-lg font-light text-white">{analytics.summary.totalPageViews.current.toLocaleString() ?? "-"}</span>
              </li>
              <li className="flex flex-col px-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Likes</span>
                <span className="text-lg font-light text-white">{analytics.summary.totalLikes.current.toLocaleString() ?? "-"}</span>
              </li>
              <li className="flex flex-col pl-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Hours</span>
                <span className="text-lg font-light text-white">{(analytics.summary.totalPlaySeconds.current / 3600).toFixed(1)}</span>
              </li>
            </ul>
          ) : (
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
          )}

          <div className="flex flex-wrap items-center gap-3">
            {profileLinks.length > 0 && !editingLinks ? (
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
            
            {isOwner && !preview && !editingLinks ? (
              <button
                type="button"
                onClick={() => {
                  setLocalLinks(profileLinks);
                  setEditingLinks(true);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-dashed border-white/20 px-3 text-xs font-semibold text-[var(--color-text-muted)] transition hover:border-white/50 hover:text-white"
              >
                <Plus size={14} />
                {profileLinks.length > 0 ? "Edit Links" : "Add Links"}
              </button>
            ) : null}
            
            {savingField === "profileLinks" && !editingLinks && <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Saved</span>}
          </div>

          {editingLinks && isOwner && (
            <div className="mt-4 max-w-2xl rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Edit Social Links</h3>
                <button
                  type="button"
                  onClick={() => setEditingLinks(false)}
                  className="text-[var(--color-text-muted)] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                {localLinks.map((link) => (
                  <div key={link.id} className="flex flex-wrap md:flex-nowrap gap-2 items-center">
                    <select
                      value={link.platform}
                      onChange={(event) =>
                        patchLocalLink(link.id, { platform: event.target.value as ProfileLink["platform"] })
                      }
                      className="w-full md:w-auto min-w-[120px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-brand)]"
                    >
                      {PROFILE_LINK_PLATFORMS.map((platform) => (
                        <option key={platform.value} value={platform.value}>
                          {platform.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={link.label}
                      onChange={(event) => patchLocalLink(link.id, { label: event.target.value })}
                      placeholder="Label"
                      className="w-full md:w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)]"
                    />
                    <input
                      value={link.url}
                      onChange={(event) => patchLocalLink(link.id, { url: event.target.value })}
                      placeholder="https://"
                      inputMode="url"
                      className="w-full flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)]"
                    />
                    <button
                      type="button"
                      onClick={() => setLocalLinks((links) => links.filter((item) => item.id !== link.id))}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 text-[var(--color-text-muted)] transition hover:border-red-400/60 hover:text-red-300"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => setLocalLinks((links) => [...links, createProfileLink()])}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-white/5 hover:text-white"
                >
                  <Plus size={14} />
                  Add another link
                </button>
              </div>
              
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingLinks(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveLinks}
                  disabled={updateMutation.isPending}
                  className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-60"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Links"}
                </button>
              </div>
            </div>
          )}

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
