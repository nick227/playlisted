import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";

import { AuthField } from "@/components/auth/AuthField";
import { usePageMeta } from "@/hooks/usePageMeta";
import { api } from "@/lib/api";
import { authedApi, uploadImageFile } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function SettingsPage() {
  const { user, accessToken, getErrorMessage, refreshUser } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  usePageMeta({ title: "Settings" });

  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  
  // Password change state (UI only for now, since no backend endpoint exists)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
    setAvatarUrl(user.avatarUrl ?? "");
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      if (username.trim() !== user.username) {
        await client.users.updateMe({
          username: username.trim(),
        });
      }
      if (newPassword) {
        // NOTE: Placeholder for password update since the endpoint is missing
        console.warn("Password update not supported by backend yet.");
        throw new Error("Password updates are not currently supported by the backend.");
      }
    },
    onSuccess: async () => {
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ["user", username] });
      setError(null);
      setSuccess("Settings saved successfully.");
      setTimeout(() => setSuccess(null), 3000);
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setSuccess(null);
    },
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
      setSuccess("Avatar updated successfully.");
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setSuccess(null);
    },
  });

  async function checkUsername() {
    const slug = username.trim();
    if (!slug || slug === user?.username) {
      setError(null);
      return;
    }
    const result = await api.users.checkUsername(slug);
    setError(result.available ? null : `@${slug} is already taken.`);
  }

  if (!user) return null;

  const hasChanges = username.trim() !== user.username || Boolean(newPassword);
  const canSave = hasChanges && !saveMutation.isPending && Boolean(username.trim()) && !error;

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-12 sm:px-6 lg:px-8 min-h-screen">
      <div>
        <h1 className="mt-2 text-3xl font-black tracking-tighter text-white md:text-4xl">
          Control Panel
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Manage your account settings, username, and password.
        </p>
      </div>

      <div className="space-y-8 rounded-2xl border border-white/10 bg-[var(--color-surface)]/50 p-6 shadow-xl">
        <section>
          <h2 className="mb-4 text-lg font-bold text-white">Avatar</h2>
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-black text-white">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarMutation.isPending}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-60"
              >
                {avatarMutation.isPending ? "Uploading..." : "Change avatar"}
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
        </section>

        <hr className="border-white/10" />

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Account Details</h2>
            <AuthField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onBlur={checkUsername}
              required
            />
          </section>

          <hr className="border-white/10" />

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white">Change Password</h2>
            <AuthField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Leave blank to keep unchanged"
            />
            <AuthField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Leave blank to keep unchanged"
            />
          </section>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}

          <div className="pt-4">
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
