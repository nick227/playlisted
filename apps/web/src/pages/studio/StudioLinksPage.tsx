import type { ProfileLink } from "@playlisted/client-sdk";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  createProfileLink,
  getProfileLinkPlatform,
  prepareProfileLinks,
  PROFILE_LINK_PLATFORMS,
} from "@/components/profile/profileLinks";
import { authedApi } from "@/lib/authedApi";
import { profilePath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";

export function StudioLinksPage() {
  const { user, accessToken, getErrorMessage, refreshUser } = useAuth();
  const client = authedApi(accessToken);

  usePageMeta({ title: "Links - Studio" });

  const [profileLinks, setProfileLinks] = useState<ProfileLink[]>(user?.profileLinks ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileLinks(user.profileLinks ?? []);
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: () => client.users.updateMe({ profileLinks: prepareProfileLinks(profileLinks) }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function updateProfileLink(linkId: string, patch: Partial<ProfileLink>) {
    setProfileLinks((links) =>
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
      }),
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/studio"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to studio
      </Link>

      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">Artist studio</p>
        <h1 className="mt-2 text-4xl font-black tracking-tighter text-white md:text-5xl">Links</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          Add the places listeners can find your releases, social updates, memberships, and stores.
        </p>
        <Link to={profilePath(user.username)} className="mt-3 inline-block text-sm font-semibold text-[var(--color-brand)] hover:underline">
          View public profile
        </Link>
      </header>

      <form
        className="space-y-5 rounded-2xl border border-white/6 bg-[var(--color-surface)]/80 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
            Profile links
          </p>
          <button
            type="button"
            onClick={() => setProfileLinks((links) => [...links, createProfileLink()])}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            <Plus size={15} />
            Add link
          </button>
        </div>

        <div className="space-y-3">
          {profileLinks.map((link) => (
            <div key={link.id} className="space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="flex gap-2">
                <select
                  value={link.platform}
                  onChange={(event) =>
                    updateProfileLink(link.id, { platform: event.target.value as ProfileLink["platform"] })
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
                onChange={(event) => updateProfileLink(link.id, { label: event.target.value })}
                placeholder="Label"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)]"
              />
              <input
                value={link.url}
                onChange={(event) => updateProfileLink(link.id, { url: event.target.value })}
                placeholder="https://"
                inputMode="url"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)]"
              />
            </div>
          ))}
        </div>

        {profileLinks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No links yet.
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {saved ? <p className="text-sm text-green-400">Links saved.</p> : null}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="w-full rounded-full bg-white py-3 font-bold text-black transition hover:bg-white/90 disabled:opacity-60"
        >
          {saveMutation.isPending ? "Saving..." : "Save links"}
        </button>
      </form>
    </div>
  );
}
