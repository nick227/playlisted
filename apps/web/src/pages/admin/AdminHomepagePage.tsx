import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  AdminCreateHomepageFeatureRequest,
  AdminHomepageFeature,
  PlaylistSummary,
  UserSummary,
} from "@playlisted/client-sdk";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

type Section = "SPOTLIGHT" | "FEATURED_ARTIST" | "FEATURED_PLAYLIST" | "CUSTOM_MIX" | "NEW_RELEASE" | "NEW_ARTIST" | "TRENDING" | "EDITOR_PICK" | "SITE_NEWS";

const SECTION_LABELS: Record<Section, string> = {
  SPOTLIGHT: "Spotlight",
  FEATURED_ARTIST: "Featured Artist (Greetings)",
  FEATURED_PLAYLIST: "Featured Playlists",
  CUSTOM_MIX: "Custom Mix",
  NEW_RELEASE: "New Releases",
  NEW_ARTIST: "New Artists",
  TRENDING: "Trending",
  EDITOR_PICK: "Editor Picks",
  SITE_NEWS: "Site News",
};

const ALL_SECTIONS: Section[] = ["SPOTLIGHT", "FEATURED_ARTIST", "FEATURED_PLAYLIST", "CUSTOM_MIX", "NEW_RELEASE", "NEW_ARTIST", "TRENDING", "EDITOR_PICK", "SITE_NEWS"];

type TargetType = "PLAYLIST" | "USER" | "EDITORIAL_POST" | "NONE";

type EditorialStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type AdminHomepageEditorialPost = {
  id: string;
  kind: "NEWS" | "REVIEW" | "FEATURE" | "SPOTLIGHT";
  title: string;
  slug: string;
  summary?: string | null;
  body: string;
  coverImageUrl?: string | null;
  status: EditorialStatus;
  publishedAt?: string | null;
  author: { id: string; username: string; displayName: string };
};

type AdminHomepageEditorialPostInput = {
  title?: string;
  slug?: string | null;
  summary?: string | null;
  body?: string;
  coverImageUrl?: string | null;
  status?: EditorialStatus;
  publishedAt?: string | null;
};

type AdminHomepageFeatureWithEditorialRequest = {
  editorialPostId?: string | null;
  editorialPost?: AdminHomepageEditorialPostInput;
};

type HomepageFeatureWithEditorial = AdminHomepageFeature & {
  editorialPost?: AdminHomepageEditorialPost | null;
};

interface FeatureFormState {
  section: Section;
  targetType: TargetType;
  playlistId: string;
  userId: string;
  editorialPostId: string;
  titleOverride: string;
  subtitleOverride: string;
  imageUrl: string;
  isActive: boolean;
  newsTitle: string;
  newsSummary: string;
  newsBody: string;
  newsCoverImageUrl: string;
  newsStatus: EditorialStatus;
}

const emptyForm = (section: Section = "FEATURED_PLAYLIST"): FeatureFormState => ({
  section,
  targetType:
    section === "SITE_NEWS"
      ? "EDITORIAL_POST"
      : section === "FEATURED_ARTIST"
        ? "USER"
        : "PLAYLIST",
  playlistId: "",
  userId: "",
  editorialPostId: "",
  titleOverride: "",
  subtitleOverride: "",
  imageUrl: "",
  isActive: true,
  newsTitle: "",
  newsSummary: "",
  newsBody: "",
  newsCoverImageUrl: "",
  newsStatus: "PUBLISHED",
});

function formFromFeature(feature: HomepageFeatureWithEditorial): FeatureFormState {
  const targetType: TargetType = feature.playlistId
    ? "PLAYLIST"
    : feature.userId
      ? "USER"
      : feature.editorialPostId
        ? "EDITORIAL_POST"
        : "NONE";

  return {
    section: feature.section as Section,
    targetType,
    playlistId: feature.playlistId ?? "",
    userId: feature.userId ?? "",
    editorialPostId: feature.editorialPostId ?? "",
    titleOverride: feature.titleOverride ?? "",
    subtitleOverride: feature.subtitleOverride ?? "",
    imageUrl: feature.imageUrl ?? "",
    isActive: feature.isActive,
    newsTitle: feature.editorialPost?.title ?? "",
    newsSummary: feature.editorialPost?.summary ?? "",
    newsBody: feature.editorialPost?.body ?? "",
    newsCoverImageUrl: feature.editorialPost?.coverImageUrl ?? feature.imageUrl ?? "",
    newsStatus: feature.editorialPost?.status ?? "PUBLISHED",
  };
}

function FeatureCard({
  feature,
  onToggle,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  saving,
}: {
  feature: HomepageFeatureWithEditorial;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  saving: boolean;
}) {
  const editorialPost = feature.editorialPost;
  const label = feature.playlist?.title ?? feature.user?.displayName ?? editorialPost?.title ?? feature.titleOverride ?? "Untitled";
  const sub = feature.playlist
    ? `Playlist · ID: ${feature.playlistId}`
    : feature.user
      ? `User · @${feature.user.username}`
      : editorialPost
        ? `Site news · /news/${editorialPost.slug}`
        : "No target linked";

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 transition ${
      feature.isActive ? "border-[var(--color-border)] bg-[var(--color-surface)]" : "border-dashed border-zinc-700 bg-zinc-900/40 opacity-60"
    } ${saving ? "opacity-40" : ""}`}>
      <div className="flex flex-col gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst || saving}
          className="rounded p-1 text-xs text-[var(--color-text-muted)] hover:text-white disabled:opacity-20"
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast || saving}
          className="rounded p-1 text-xs text-[var(--color-text-muted)] hover:text-white disabled:opacity-20"
        >
          ▼
        </button>
      </div>

      {(feature.playlist?.coverArtUrl ?? feature.user?.avatarUrl ?? feature.imageUrl ?? editorialPost?.coverImageUrl) ? (
        <img
          src={feature.playlist?.coverArtUrl ?? feature.user?.avatarUrl ?? feature.imageUrl ?? editorialPost?.coverImageUrl ?? ""}
          alt=""
          className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-zinc-800" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{sub}</p>
        {feature.titleOverride && (
          <p className="mt-0.5 text-xs text-amber-400/80">Override: "{feature.titleOverride}"</p>
        )}
        {editorialPost?.summary && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-muted)]">{editorialPost.summary}</p>
        )}
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Position {feature.position} ·{" "}
          {feature.startsAt ? `Starts ${new Date(feature.startsAt).toLocaleDateString()}` : "Always on"}
        </p>
      </div>

      <div className="flex flex-col gap-2 items-end">
        <button
          onClick={onToggle}
          disabled={saving}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            feature.isActive
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/10"
              : "border border-[var(--color-border)] text-zinc-500 hover:text-white"
          }`}
        >
          {feature.isActive ? "Active" : "Inactive"}
        </button>
        <button
          onClick={onEdit}
          disabled={saving}
          className="text-xs text-amber-300 hover:text-amber-200 disabled:opacity-40"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={saving}
          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export function AdminHomepagePage() {
  const { accessToken } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);
  const [features, setFeatures] = useState<HomepageFeatureWithEditorial[]>([]);

  usePageMeta({ title: "Homepage — Admin" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("FEATURED_PLAYLIST");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FeatureFormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [targetSearch, setTargetSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.listHomepageFeatures();
      setFeatures(res.data as HomepageFeatureWithEditorial[]);
    } catch (e: any) {
      setError(e.message ?? "Failed to load homepage features.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.playlists.list({ pageSize: 100, status: "PUBLISHED" as any }).then((r) => setPlaylists(r.data)).catch(() => undefined);
    api.admin.listUsers({ pageSize: 100 }).then((r) => setUsers(r.data)).catch(() => undefined);
  }, []);

  const sectionFeatures = features
    .filter((f) => f.section === activeSection)
    .sort((a, b) => a.position - b.position);

  const handleToggle = async (feature: HomepageFeatureWithEditorial) => {
    setSaving(feature.id);
    try {
      const updated = await api.admin.updateHomepageFeature(feature.id, { isActive: !feature.isActive });
      setFeatures((prev) => prev.map((f) => f.id === feature.id ? updated as HomepageFeatureWithEditorial : f));
    } catch (e: any) {
      setError(e.message ?? "Failed to update feature.");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (feature: HomepageFeatureWithEditorial) => {
    const editorialPost = feature.editorialPost;
    const label = feature.playlist?.title ?? feature.user?.displayName ?? editorialPost?.title ?? "this feature";
    if (!confirm(`Remove "${label}" from the homepage?`)) return;
    setSaving(feature.id);
    try {
      await api.admin.deleteHomepageFeature(feature.id);
      setFeatures((prev) => prev.filter((f) => f.id !== feature.id));
    } catch (e: any) {
      setError(e.message ?? "Failed to delete feature.");
    } finally {
      setSaving(null);
    }
  };

  const handleMove = async (feature: HomepageFeatureWithEditorial, direction: "up" | "down") => {
    const sorted = sectionFeatures;
    const idx = sorted.findIndex((f) => f.id === feature.id);
    const swapWith = direction === "up" ? sorted[idx - 1] : sorted[idx + 1];
    if (!swapWith) return;

    setSaving(feature.id);
    try {
      const updated = await api.admin.updateHomepageFeature(feature.id, { position: swapWith.position });
      setFeatures((prev) => prev.map((f) => {
        if (f.id === updated.id) return updated as HomepageFeatureWithEditorial;
        if (f.id === swapWith.id) return { ...f, position: feature.position };
        return f;
      }));
    } catch (e: any) {
      setError(e.message ?? "Failed to reorder features.");
    } finally {
      setSaving(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.targetType === "PLAYLIST" && !form.playlistId) {
      setError("Please select a playlist.");
      return;
    }
    if (form.targetType === "USER" && !form.userId) {
      setError("Please select a user.");
      return;
    }
    if (form.targetType === "EDITORIAL_POST" && (!form.newsTitle.trim() || !form.newsBody.trim())) {
      setError("Please enter a title and body for the site news post.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const body: AdminCreateHomepageFeatureRequest & AdminHomepageFeatureWithEditorialRequest = {
        section: form.section,
        isActive: form.isActive,
        playlistId: form.targetType === "PLAYLIST" ? form.playlistId : null,
        userId: form.targetType === "USER" ? form.userId : null,
        editorialPostId: null,
        titleOverride: form.titleOverride.trim() || null,
        subtitleOverride: form.subtitleOverride.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
      };
      if (form.targetType === "EDITORIAL_POST") {
        body.editorialPost = {
          title: form.newsTitle.trim(),
          summary: form.newsSummary.trim() || null,
          body: form.newsBody.trim(),
          coverImageUrl: form.newsCoverImageUrl.trim() || form.imageUrl.trim() || null,
          status: form.newsStatus,
        };
      }
      const created = await api.admin.createHomepageFeature(body);
      setFeatures((prev) => [...prev, created as HomepageFeatureWithEditorial]);
      setActiveSection(form.section);
      setShowAdd(false);
      setForm(emptyForm(form.section));
      setTargetSearch("");
    } catch (e: any) {
      setError(e.message ?? "Failed to create feature.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (form.targetType === "PLAYLIST" && !form.playlistId) {
      setError("Please select a playlist.");
      return;
    }
    if (form.targetType === "USER" && !form.userId) {
      setError("Please select a user.");
      return;
    }
    if (form.targetType === "EDITORIAL_POST" && (!form.newsTitle.trim() || !form.newsBody.trim())) {
      setError("Please enter a title and body for the site news post.");
      return;
    }

    setSaving(editingId);
    setError(null);
    try {
      const body: Partial<AdminCreateHomepageFeatureRequest> & AdminHomepageFeatureWithEditorialRequest = {
        section: form.section,
        isActive: form.isActive,
        playlistId: form.targetType === "PLAYLIST" ? form.playlistId : null,
        userId: form.targetType === "USER" ? form.userId : null,
        editorialPostId: form.targetType === "EDITORIAL_POST" ? form.editorialPostId || null : null,
        titleOverride: form.titleOverride.trim() || null,
        subtitleOverride: form.subtitleOverride.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
      };

      if (form.targetType === "EDITORIAL_POST") {
        body.editorialPost = {
          title: form.newsTitle.trim(),
          summary: form.newsSummary.trim() || null,
          body: form.newsBody.trim(),
          coverImageUrl: form.newsCoverImageUrl.trim() || form.imageUrl.trim() || null,
          status: form.newsStatus,
        };
      }

      const updated = await api.admin.updateHomepageFeature(editingId, body);
      setFeatures((prev) => prev.map((f) => f.id === editingId ? updated as HomepageFeatureWithEditorial : f));
      setActiveSection(form.section);
      setShowAdd(false);
      setEditingId(null);
      setForm(emptyForm(form.section));
      setTargetSearch("");
    } catch (e: any) {
      setError(e.message ?? "Failed to update feature.");
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (feature: HomepageFeatureWithEditorial) => {
    setForm(formFromFeature(feature));
    setActiveSection(feature.section as Section);
    setEditingId(feature.id);
    setShowAdd(true);
    setTargetSearch(feature.playlist?.title ?? feature.user?.displayName ?? feature.editorialPost?.title ?? "");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const sectionCounts = Object.fromEntries(
    ALL_SECTIONS.map((s) => [s, features.filter((f) => f.section === s).length])
  );

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Homepage</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Homepage Control</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Manage what appears in each homepage section.
          </p>
        </div>
        <button
          onClick={() => {
            if (showAdd) {
              setShowAdd(false);
              setEditingId(null);
              setForm(emptyForm(activeSection));
              setTargetSearch("");
            } else {
              setForm(emptyForm(activeSection));
              setEditingId(null);
              setShowAdd(true);
              setTimeout(() => searchRef.current?.focus(), 50);
            }
          }}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          {showAdd ? "Cancel" : "+ Add feature"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-xs underline">Dismiss</button>
        </div>
      )}

      {showAdd && (
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4 rounded-xl border border-amber-400/30 bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold text-white">{editingId ? "Edit homepage feature" : "Add homepage feature"}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Section</label>
              <select
                value={form.section}
                onChange={(e) => {
                  const section = e.target.value as Section;
                  setForm((f) => ({
                    ...f,
                    section,
                    targetType:
                      section === "SITE_NEWS" && f.targetType === "PLAYLIST"
                        ? "EDITORIAL_POST"
                        : section === "FEATURED_ARTIST" && f.targetType !== "USER"
                          ? "USER"
                          : f.targetType,
                  }));
                }}
                className="w-full rounded-lg border border-[var(--color-border)] focus:outline-none"
              >
                {ALL_SECTIONS.map((s) => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Target type</label>
              {form.section === "FEATURED_ARTIST" ? (
                <p className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-white">
                  Artist / User
                </p>
              ) : (
                <select
                  value={form.targetType}
                  onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value as TargetType, playlistId: "", userId: "", editorialPostId: "" }))}
                  className="w-full rounded-lg border border-[var(--color-border)] focus:outline-none"
                >
                  <option value="PLAYLIST">Playlist</option>
                  <option value="USER">Artist / User</option>
                  <option value="EDITORIAL_POST">Site news post</option>
                  <option value="NONE">No target (title only)</option>
                </select>
              )}
            </div>
          </div>

          {form.targetType === "PLAYLIST" && (
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Search playlists</label>
              <input
                ref={searchRef}
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                placeholder="Type to filter…"
                className="w-full rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
              />
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-black/50">
                {playlists
                  .filter((p) => !targetSearch.trim() || p.title.toLowerCase().includes(targetSearch.toLowerCase()) || p.owner?.displayName?.toLowerCase().includes(targetSearch.toLowerCase()))
                  .slice(0, 20)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, playlistId: p.id })); setTargetSearch(p.title); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5 ${form.playlistId === p.id ? "bg-amber-500/10 text-amber-300" : "text-white"}`}
                    >
                      {p.coverArtUrl && <img src={p.coverArtUrl} alt="" className="h-7 w-7 rounded object-cover flex-shrink-0" />}
                      <span className="truncate">{p.title}</span>
                      <span className="ml-auto text-xs text-[var(--color-text-muted)] flex-shrink-0">{p.owner?.displayName}</span>
                    </button>
                  ))}
              </div>
              {form.playlistId && (
                <p className="mt-1 text-xs text-amber-400">Selected: {playlists.find((p) => p.id === form.playlistId)?.title ?? form.playlistId}</p>
              )}
            </div>
          )}

          {form.targetType === "USER" && (
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Search users</label>
              <input
                ref={searchRef}
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                placeholder="Type to filter…"
                className="w-full rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
              />
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-black/50">
                {users
                  .filter((u) => !targetSearch.trim() || u.displayName.toLowerCase().includes(targetSearch.toLowerCase()) || u.username.toLowerCase().includes(targetSearch.toLowerCase()))
                  .slice(0, 20)
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, userId: u.id })); setTargetSearch(u.displayName); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5 ${form.userId === u.id ? "bg-amber-500/10 text-amber-300" : "text-white"}`}
                    >
                      {u.avatarUrl && <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />}
                      <span className="truncate">{u.displayName}</span>
                      <span className="ml-auto text-xs text-[var(--color-text-muted)] flex-shrink-0">@{u.username}</span>
                    </button>
                  ))}
              </div>
              {form.userId && (
                <p className="mt-1 text-xs text-amber-400">Selected: {users.find((u) => u.id === form.userId)?.displayName ?? form.userId}</p>
              )}
            </div>
          )}

          {form.targetType === "EDITORIAL_POST" && (
            <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-black/20 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">News title</label>
                  <input
                    ref={searchRef}
                    value={form.newsTitle}
                    onChange={(e) => setForm((f) => ({ ...f, newsTitle: e.target.value }))}
                    placeholder="Platform update, launch note, announcement…"
                    className="w-full rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">Status</label>
                  <select
                    value={form.newsStatus}
                    onChange={(e) => setForm((f) => ({ ...f, newsStatus: e.target.value as EditorialStatus }))}
                    className="w-full rounded-lg border border-[var(--color-border)] focus:outline-none"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Summary</label>
                <input
                  value={form.newsSummary}
                  onChange={(e) => setForm((f) => ({ ...f, newsSummary: e.target.value }))}
                  placeholder="Short homepage summary"
                  className="w-full rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">News image URL</label>
                <input
                  value={form.newsCoverImageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, newsCoverImageUrl: e.target.value }))}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Body</label>
                <textarea
                  value={form.newsBody}
                  onChange={(e) => setForm((f) => ({ ...f, newsBody: e.target.value }))}
                  rows={6}
                  placeholder="Write the site news post…"
                  className="w-full resize-y rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Title override</label>
              <input
                value={form.titleOverride}
                onChange={(e) => setForm((f) => ({ ...f, titleOverride: e.target.value }))}
                placeholder="Leave blank to use content title"
                className="w-full rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Subtitle override</label>
              <input
                value={form.subtitleOverride}
                onChange={(e) => setForm((f) => ({ ...f, subtitleOverride: e.target.value }))}
                placeholder="Leave blank to use content subtitle"
                className="w-full rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">Image URL override</label>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://… (leave blank to use content image)"
              className="w-full rounded-lg border border-[var(--color-border)] placeholder-zinc-600 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="text-sm text-white">Active immediately</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setEditingId(null); setForm(emptyForm(activeSection)); setTargetSearch(""); }}
                className="text-sm text-[var(--color-text-muted)] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || Boolean(saving)}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
              >
                {creating ? "Adding…" : editingId ? "Save changes" : "Add feature"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {ALL_SECTIONS.map((s) => {
          const isSpotlight = s === "SPOTLIGHT";
          const isActive = activeSection === s;
          return (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                isActive
                  ? isSpotlight
                    ? "bg-amber-400 text-black"
                    : "bg-amber-500 text-black"
                  : isSpotlight
                    ? "border border-amber-400/40 text-amber-400 hover:border-amber-400 hover:bg-amber-400/10"
                    : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white"
              }`}
            >
              {isSpotlight ? "★ " : ""}{SECTION_LABELS[s]} {sectionCounts[s] > 0 ? `(${sectionCounts[s]})` : ""}
            </button>
          );
        })}
      </div>

      {activeSection === "SPOTLIGHT" && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4">
          <p className="text-sm font-semibold text-amber-400">★ Spotlight — Most Visible Placement</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
            The Spotlight is the very first thing every visitor sees on the homepage — a full-width cinematic banner.
            Only the <strong className="text-white">top-positioned active item</strong> is shown. Choose a playlist or artist to honor.
          </p>
        </div>
      )}

      {activeSection === "FEATURED_ARTIST" && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4">
          <p className="text-sm font-semibold text-amber-400">Featured Artist — Greetings Banner</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Shown in the <strong className="text-white">greetings banner</strong> beside the time-of-day welcome message.
            Only the <strong className="text-white">top-positioned active user</strong> is used. Target an artist/user — not a playlist.
            If empty, the banner falls back to a daily-rotated chart artist.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : sectionFeatures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-text-muted)]">
          {activeSection === "SPOTLIGHT" ? (
            <>
              No spotlight set. Click <strong className="text-white">+ Add feature</strong> to choose a playlist or artist to honor.
            </>
          ) : activeSection === "FEATURED_ARTIST" ? (
            <>
              No featured artist set. Click <strong className="text-white">+ Add feature</strong> to pick the artist shown in the greetings banner.
            </>
          ) : (
            <>
              No features in <strong className="text-white">{SECTION_LABELS[activeSection]}</strong> yet.
              Click "+ Add feature" to pin something here.
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sectionFeatures.map((feature, idx) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              saving={saving === feature.id}
              isFirst={idx === 0}
              isLast={idx === sectionFeatures.length - 1}
              onToggle={() => handleToggle(feature)}
              onDelete={() => handleDelete(feature)}
              onEdit={() => startEdit(feature)}
              onMoveUp={() => handleMove(feature, "up")}
              onMoveDown={() => handleMove(feature, "down")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
