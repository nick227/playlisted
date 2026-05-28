import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AuthField } from "@/components/auth/AuthField";
import { authedApi } from "@/lib/authedApi";
import { profilePath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";

export function StudioProfilePage() {
  const { user, accessToken, getErrorMessage, refreshUser } = useAuth();
  const client = authedApi(accessToken);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-extrabold text-white">Profile & URL</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Your public page:{" "}
        <Link to={profilePath(username)} className="font-semibold text-[var(--color-brand)]">
          {window.location.origin}
          {profilePath(username)}
        </Link>
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
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
        <AuthField
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {saved ? <p className="text-sm text-green-400">Profile saved.</p> : null}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="w-full rounded-full bg-white py-3 font-bold text-black"
        >
          {saveMutation.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
