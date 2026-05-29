import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, BarChart3, Clock3, Code2, ImagePlus, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { AuthField } from "@/components/auth/AuthField";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { StudioCollectionCard } from "@/components/studio/StudioCollectionCard";
import type { StudioCollectionListItem } from "@/components/studio/studioCollectionUtils";
import { formatPlaylistDuration } from "@/components/studio/studioCollectionUtils";
import { useAnalyticsSummary } from "@/hooks/useAnalytics";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import { authedApi, uploadImageFile } from "@/lib/authedApi";
import { profilePath, studioCollectionEditPath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";

const typeOptions = [{ value: "PLAYLIST" as const, label: "Collection" }];

const studioLinks = [
  {
    to: "/studio/analytics",
    title: "Analytics",
    desc: "Open the full track performance view.",
    icon: BarChart3,
  },
  {
    to: "/studio/history",
    title: "Play history",
    desc: "Review tracks you have listened to.",
    icon: Clock3,
  },
  {
    to: "/studio/developer",
    title: "API Keys",
    desc: "Manage keys for the Ingest API.",
    icon: Code2,
  },
];

function fmtNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtSeconds(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function MetricCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[var(--color-surface)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-4 h-8 w-24" />
      ) : (
        <p className="mt-3 text-3xl font-extrabold tracking-tight text-white">{value}</p>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-black/15 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

export function StudioPage() {
  const { user, accessToken, getErrorMessage, refreshUser } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  usePageMeta({ title: "Artist Studio" });

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setUsername(user.username);
    setBio(user.bio ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
  }, [user]);

  const analytics = useAnalyticsSummary("30d");
  const summary = analytics.data?.summary;

  const ownedCollectionsQuery = useQuery({
    queryKey: ["me", "playlists"],
    queryFn: () => client.me.playlists(),
    enabled: Boolean(accessToken),
  });

  const followedCollectionsQuery = useQuery({
    queryKey: ["me", "collections", "playlists", 100],
    queryFn: () => client.me.collectionPlaylists({ pageSize: 100 }),
    enabled: Boolean(accessToken),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      client.users.updateMe({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
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
      setSaved(true);
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const createMutation = useMutation({
    mutationFn: (type: (typeof typeOptions)[number]["value"]) =>
      client.playlists.create({
        ownerId: user!.id,
        title: "Untitled collection",
        type,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      window.location.href = studioCollectionEditPath(created.id);
    },
  });

  const removeCollectionMutation = useMutation({
    mutationFn: (playlistId: string) => client.me.removeCollectionPlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "collections", "playlists"] });
    },
  });

  async function checkUsername() {
    const slug = username.trim();
    if (!slug || slug === user?.username) return;
    const result = await api.users.checkUsername(slug);
    setError(result.available ? null : `@${slug} is already taken.`);
  }

  if (!user) return null;

  const ownedCollections = ownedCollectionsQuery.data?.data ?? [];
  const ownedCollectionIds = new Set(ownedCollections.map((playlist) => playlist.id));
  const followedCollections =
    followedCollectionsQuery.data?.data.filter((playlist) => !ownedCollectionIds.has(playlist.id)) ?? [];
  const ownedItems: StudioCollectionListItem[] = ownedCollections.map((playlist) => ({
    ...playlist,
    listSource: "owned",
  }));
  const followedItems: StudioCollectionListItem[] = followedCollections.map((playlist) => ({
    ...playlist,
    listSource: "followed",
  }));
  const allItems = [...ownedItems, ...followedItems];
  const totalTracks = allItems.reduce((sum, playlist) => sum + playlist.itemCount, 0);
  const totalDuration = allItems.reduce((sum, playlist) => sum + playlist.totalDurationSeconds, 0);
  const collectionsLoading = ownedCollectionsQuery.isLoading || followedCollectionsQuery.isLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">
            Artist studio
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
            Hey, {user.displayName}
          </h1>
          <Link
            to={profilePath(user.username)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            View public profile <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
          {studioLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-brand)]/50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-[var(--color-brand)]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">{item.title}</span>
                  <span className="block truncate text-xs text-[var(--color-text-muted)]">{item.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Profile views"
          value={fmtNumber(summary?.totalPageViews.current ?? 0)}
          loading={analytics.isLoading}
        />
        <MetricCard
          label="Total plays"
          value={fmtNumber(summary?.totalPlays.current ?? 0)}
          loading={analytics.isLoading}
        />
        <MetricCard
          label="Time listened"
          value={fmtSeconds(summary?.totalPlaySeconds.current ?? 0)}
          loading={analytics.isLoading}
        />
        <MetricCard
          label="Avg completion"
          value={`${summary?.avgCompletionRate.current ?? 0}%`}
          loading={analytics.isLoading}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <form
          className="space-y-5 rounded-2xl border border-white/6 bg-[var(--color-surface)]/80 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-text-subtle)] uppercase">
              Profile settings
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Live URL:{" "}
              <Link to={profilePath(username)} className="font-semibold text-[var(--color-brand)] hover:underline">
                {window.location.origin}
                {profilePath(username)}
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-black text-white">
                  {displayName.trim().charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-brand)] disabled:opacity-60"
              >
                <ImagePlus size={15} />
                {avatarMutation.isPending ? "Uploading..." : "Change image"}
              </button>
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
          </div>

          <AuthField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <AuthField
            label="Username (unique URL)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={checkUsername}
            hint="Letters, numbers, and hyphens only"
            required
          />
          <AuthField label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {saved ? <p className="text-sm text-green-400">Profile saved.</p> : null}

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full rounded-full bg-white py-3 font-bold text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving..." : "Save profile"}
          </button>
        </form>

        <div className="rounded-2xl border border-white/6 bg-[var(--color-surface)]/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-text-subtle)] uppercase">
                Collections
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">Your library surface</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
                Collections you create and playlists you save from other artists, with cover art, status, and stats.
              </p>
            </div>
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => createMutation.mutate(opt.value)}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:opacity-60"
              >
                <Plus size={15} />
                New {opt.label}
              </button>
            ))}
          </div>

          {collectionsLoading ? (
            <div className="mt-8 space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : allItems.length > 0 ? (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryStat label="Yours" value={String(ownedItems.length)} />
                <SummaryStat label="Saved" value={String(followedItems.length)} />
                <SummaryStat label="Tracks" value={String(totalTracks)} />
                <SummaryStat label="Runtime" value={formatPlaylistDuration(totalDuration)} />
              </div>

              <div className="mt-8 space-y-8">
                {ownedItems.length > 0 ? (
                  <section>
                    <h3 className="text-lg font-bold text-white">Created by you</h3>
                    <ul className="mt-4 flex flex-col gap-4">
                      {ownedItems.map((playlist) => (
                        <li key={playlist.id}>
                          <StudioCollectionCard playlist={playlist} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {followedItems.length > 0 ? (
                  <section>
                    <h3 className="text-lg font-bold text-white">Saved from others</h3>
                    <ul className="mt-4 flex flex-col gap-4">
                      {followedItems.map((playlist) => (
                        <li key={playlist.id}>
                          <StudioCollectionCard
                            playlist={playlist}
                            onUnfollow={(id) => removeCollectionMutation.mutate(id)}
                            unfollowPending={removeCollectionMutation.isPending}
                            unfollowTargetId={removeCollectionMutation.variables}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-8">
              <EmptyState title="No collections yet" description="Create or save a collection to get started." />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
