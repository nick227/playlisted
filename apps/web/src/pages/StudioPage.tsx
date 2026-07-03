import type { ProfileLink } from "@playlisted/client-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { AuthField } from "@/components/auth/AuthField";
import { Skeleton } from "@/components/feedback/Skeleton";
import { ArtistProfileView } from "@/components/profile/ArtistProfileView";
import {
  createProfileLink,
  getProfileLinkPlatform,
  prepareProfileLinks,
  PROFILE_LINK_PLATFORMS,
} from "@/components/profile/profileLinks";
import { useUserByUsername } from "@/hooks/useUserByUsername";
import { api } from "@/lib/api";
import { authedApi, uploadImageFile } from "@/lib/authedApi";
import { BROWSE_LAYOUT_CLASS } from "@/lib/browsePaths";
import { profilePath, studioCollectionEditPath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";

function updateProfileLink(link: ProfileLink, patch: Partial<ProfileLink>): ProfileLink {
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
}

function sameProfileLinks(a: ProfileLink[], b: ProfileLink[]) {
  return JSON.stringify(prepareProfileLinks(a)) === JSON.stringify(prepareProfileLinks(b));
}

export function StudioPage() {
  const { user, accessToken, getErrorMessage, refreshUser } = useAuth();
  const client = useMemo(() => authedApi(accessToken), [accessToken]);
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  usePageMeta({ title: "Artist Studio" });

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [profileLinks, setProfileLinks] = useState<ProfileLink[]>(user?.profileLinks ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setUsername(user.username);
    setBio(user.bio ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
    setProfileLinks(user.profileLinks ?? []);
  }, [user]);

  const profileQuery = useUserByUsername(user?.username);

  const saveMutation = useMutation({
    mutationFn: () =>
      client.users.updateMe({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        profileLinks: prepareProfileLinks(profileLinks),
      }),
    onSuccess: async () => {
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["user", username] });
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!accessToken) throw new Error("You need to sign in again to upload an image.");
      const uploaded = await uploadImageFile(file, accessToken);
      await client.users.updateMe({ avatarUrl: uploaded.url });
      return uploaded.url;
    },
    onSuccess: async (url) => {
      setAvatarUrl(url);
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["user", username] });
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      client.playlists.create({
        ownerId: user!.id,
        title: "Untitled collection",
        type: "PLAYLIST",
        status: "PUBLISHED",
        visibility: "PUBLIC",
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      window.location.href = studioCollectionEditPath(created.id);
    },
  });

  async function checkUsername() {
    const slug = username.trim();
    if (!slug || slug === user?.username) return;
    const result = await api.users.checkUsername(slug);
    setError(result.available ? null : `@${slug} is already taken.`);
  }

  function patchProfileLink(linkId: string, patch: Partial<ProfileLink>) {
    setProfileLinks((links) =>
      links.map((link) => (link.id === linkId ? updateProfileLink(link, patch) : link)),
    );
  }

  if (!user) return null;

  const profileUser = profileQuery.data ?? null;
  const preview = {
    displayName,
    username,
    bio: bio.trim() || null,
    profileLinks: prepareProfileLinks(profileLinks),
  };
  const hasProfileChanges =
    displayName.trim() !== user.displayName ||
    username.trim() !== user.username ||
    (bio.trim() || null) !== (user.bio ?? null) ||
    (avatarUrl.trim() || null) !== (user.avatarUrl ?? null) ||
    !sameProfileLinks(profileLinks, user.profileLinks ?? []);
  const canSaveProfile =
    hasProfileChanges &&
    !saveMutation.isPending &&
    Boolean(displayName.trim()) &&
    Boolean(username.trim()) &&
    !error;

  return (
    <div className="mx-auto max-w-7xl space-y-14 bg-[var(--color-surface)]/90 min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-12 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <div>
            <h1 className="mt-2 text-4xl font-black tracking-tighter text-white md:text-5xl">
              Studio
            </h1>
            <Link
              to={profilePath(username || user.username)}
              target="_blank"
              className="mt-3 inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-[var(--color-brand)] hover:underline"
            >
              <span className="truncate">@{username || user.username}</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-start gap-3 w-full">
                
              <div className="w-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl font-black text-white">
                    {displayName.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarMutation.isPending}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-60"
              >
                {avatarMutation.isPending ? "Uploading..." : "Change image"}
              </button>

              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) avatarMutation.mutate(file);
                  event.target.value = "";
                }}
              />
            </div>

            <AuthField
              label="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
            <AuthField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onBlur={checkUsername}
              required
            />
            <div className="space-y-2">
              <label htmlFor="studio-bio" className="block text-sm font-semibold text-white">
                Bio
              </label>
              <textarea
                id="studio-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={5}
                className="min-h-32 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-base text-white outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/30"
              />
            </div>

            <div className="space-y-3 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                  Links
                </p>
                <button
                  type="button"
                  onClick={() => setProfileLinks((links) => [...links, createProfileLink()])}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/5"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {profileLinks.length > 0 ? (
                <div className="space-y-3">
                  {profileLinks.map((link) => (
                    <div key={link.id} className="space-y-2 rounded-lg border border-white/10 bg-black/15 p-3">
                      <div className="flex gap-2">
                        <select
                          value={link.platform}
                          onChange={(event) =>
                            patchProfileLink(link.id, { platform: event.target.value as ProfileLink["platform"] })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-brand)]"
                        >
                          {PROFILE_LINK_PLATFORMS.map((platform) => (
                            <option key={platform.value} value={platform.value}>
                              {platform.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setProfileLinks((links) => links.filter((item) => item.id !== link.id))}
                          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-[var(--color-text-muted)] transition hover:border-red-400/60 hover:text-red-300"
                          aria-label={`Remove ${link.label || "link"}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <input
                        value={link.label}
                        onChange={(event) => patchProfileLink(link.id, { label: event.target.value })}
                        placeholder="Label"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)]"
                      />
                      <input
                        value={link.url}
                        onChange={(event) => patchProfileLink(link.id, { url: event.target.value })}
                        placeholder="https://"
                        inputMode="url"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)]"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={!canSaveProfile}
              className="w-full rounded-full bg-white py-3 font-bold text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {saveMutation.isPending
                ? "Saving..."
                : error
                  ? "Try again"
                  : hasProfileChanges
                    ? "Save changes"
                    : "Saved"}
            </button>
          </form>
        </aside>

        <div className="min-w-0">
          {profileQuery.isLoading || !profileUser ? (
            <div className={`${BROWSE_LAYOUT_CLASS} space-y-8`}>
              <Skeleton className="h-[360px] w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <ArtistProfileView
                user={{ ...profileUser, avatarUrl }}
                preview={preview}
                showRelatedArtists={false}
                collectionEditHref={(playlist) => studioCollectionEditPath(playlist.id)}
              />
              <div className="mt-4 flex w-full items-end justify-center">
                <button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
                >
                  <Plus size={15} />
                  {createMutation.isPending ? "Creating..." : "New collection"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
