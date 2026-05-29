import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ArtistProfileView } from "@/components/profile/ArtistProfileView";
import { AuthField } from "@/components/auth/AuthField";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useUserByUsername } from "@/hooks/useUserByUsername";
import { authedApi } from "@/lib/authedApi";
import { profilePath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";

export function StudioProfilePage() {
  const { user, accessToken, getErrorMessage, refreshUser } = useAuth();
  const client = authedApi(accessToken);
  const profileQuery = useUserByUsername(user?.username);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setUsername(user.username);
    setBio(user.bio ?? "");
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: () =>
      client.users.updateMe({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
      }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  async function checkUsername() {
    const slug = username.trim();
    if (!slug) return;
    const result = await api.users.checkUsername(slug);
    if (!result.available) {
      setError(`@${slug} is already taken.`);
    } else {
      setError(null);
    }
  }

  if (!user) return null;

  const profileUser = profileQuery.data ?? null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white md:text-5xl">Your artist profile</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-text-muted)]">
            Edit how you appear publicly. Preview streams, collections, and metrics exactly as listeners see them.
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Live URL:{" "}
            <Link to={profilePath(username)} className="font-semibold text-[var(--color-brand)] hover:underline">
              {window.location.origin}
              {profilePath(username)}
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreviewOpen((open) => !open)}
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          {previewOpen ? "Hide preview" : "Show preview"}
        </button>
      </div>

      <div className={`grid gap-12 ${previewOpen ? "xl:grid-cols-[minmax(280px,340px)_1fr]" : ""}`}>
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <form
            className="space-y-5 rounded-2xl border border-white/6 bg-[var(--color-surface)]/80 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-text-subtle)] uppercase">
              Profile settings
            </p>
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
              className="w-full rounded-full bg-white py-3 font-bold text-black transition hover:bg-white/90"
            >
              {saveMutation.isPending ? "Saving…" : "Save profile"}
            </button>
          </form>
        </aside>

        {previewOpen ? (
          <div className="min-w-0">
            {profileQuery.isLoading || !profileUser ? (
              <div className="space-y-10">
                <Skeleton className="h-[420px] w-full rounded-3xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ) : (
              <ArtistProfileView
                user={profileUser}
                preview={{ displayName, username, bio: bio.trim() || null }}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
