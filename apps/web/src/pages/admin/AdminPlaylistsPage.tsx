import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { AdminPlaylist, AdminContentTagRef } from "@playlisted/client-sdk";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

const STATUS_COLORS: Record<Status, string> = {
  PUBLISHED: "text-green-400",
  DRAFT: "text-zinc-400",
  ARCHIVED: "text-red-400",
};

const VIS_COLORS: Record<Visibility, string> = {
  PUBLIC: "text-blue-400",
  UNLISTED: "text-amber-400",
  PRIVATE: "text-zinc-500",
};

const TYPE_LABELS: Record<string, string> = {
  PLAYLIST: "Playlist",
  ALBUM: "Album",
  MIX: "Mix",
  PODCAST_CHANNEL: "Podcast",
  RELEASE: "Release",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDur(s: number) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function GenreChips({ tags }: { tags: AdminContentTagRef[] }) {
  const genres = tags.filter((t) => t.kind === "GENRE");
  if (!genres.length) return <span className="text-xs text-zinc-600">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {genres.map((g) => (
        <span key={g.id} className="rounded-full bg-purple-400/10 px-2 py-0.5 text-xs font-medium text-purple-400">
          {g.name}
        </span>
      ))}
    </div>
  );
}

export function AdminPlaylistsPage() {
  const { accessToken } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);
  const [playlists, setPlaylists] = useState<AdminPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVisibility, setFilterVisibility] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFeatured, setFilterFeatured] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, any> = { page, pageSize: PAGE_SIZE, sortBy, order };
      if (search.trim()) query.q = search.trim();
      if (filterStatus) query.status = filterStatus;
      if (filterVisibility) query.visibility = filterVisibility;
      if (filterType) query.type = filterType;
      if (filterFeatured) query.featured = filterFeatured === "true";
      const res = await api.admin.listPlaylists(query);
      setPlaylists(res.data);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e.message ?? "Failed to load playlists.");
    } finally {
      setLoading(false);
    }
  }, [api, page, search, filterStatus, filterVisibility, filterType, filterFeatured, sortBy, order]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); setSearch(value); }, 350);
  };

  const update = async (playlistId: string, patch: { status?: Status; visibility?: Visibility; featured?: boolean }) => {
    setSaving(playlistId);
    setError(null);
    try {
      const updated = await api.admin.updatePlaylist(playlistId, patch);
      setPlaylists((prev) => prev.map((p) => p.id === playlistId ? updated : p));
    } catch (e: any) {
      setError(e.message ?? "Failed to update playlist.");
    } finally {
      setSaving(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <th
      className="px-4 py-3 cursor-pointer select-none hover:text-white transition whitespace-nowrap"
      onClick={() => { if (sortBy === col) setOrder((o) => o === "asc" ? "desc" : "asc"); else { setSortBy(col); setOrder("desc"); } setPage(1); }}
    >
      {label} {sortBy === col ? (order === "desc" ? "↓" : "↑") : ""}
    </th>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Playlists</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Playlist Management</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Feature, archive, or adjust visibility across all playlists.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search title…"
          className="min-w-[180px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-amber-400/50"
        />
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select value={filterVisibility} onChange={(e) => { setFilterVisibility(e.target.value); setPage(1); }} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">All visibility</option>
          <option value="PUBLIC">Public</option>
          <option value="UNLISTED">Unlisted</option>
          <option value="PRIVATE">Private</option>
        </select>
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">All types</option>
          <option value="PLAYLIST">Playlist</option>
          <option value="ALBUM">Album</option>
          <option value="MIX">Mix</option>
          <option value="PODCAST_CHANNEL">Podcast</option>
        </select>
        <select value={filterFeatured} onChange={(e) => { setFilterFeatured(e.target.value); setPage(1); }} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">All</option>
          <option value="true">Featured only</option>
          <option value="false">Not featured</option>
        </select>
      </div>

      <div className="text-xs text-[var(--color-text-muted)]">{total} playlists · page {page}</div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : playlists.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No playlists found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-3">Playlist</th>
                <th className="px-4 py-3">Type</th>
                <SortHeader col="items" label="Tracks" />
                <SortHeader col="duration" label="Duration" />
                <th className="px-4 py-3">Genres</th>
                <SortHeader col="saves" label="Saves" />
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Visibility</th>
                <SortHeader col="createdAt" label="Created" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
              {playlists.map((pl) => (
                <tr key={pl.id} className={`transition ${saving === pl.id ? "opacity-40" : ""}`}>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex items-center gap-2">
                      {pl.coverArtUrl ? (
                        <img src={pl.coverArtUrl} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-zinc-800 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white text-xs">{pl.title}</p>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">{pl.owner.displayName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{TYPE_LABELS[pl.type] ?? pl.type}</td>
                  <td className="px-4 py-3 text-xs text-white">{pl.itemCount}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{fmtDur(pl.totalDurationSeconds)}</td>
                  <td className="px-4 py-3"><GenreChips tags={pl.tags} /></td>
                  <td className="px-4 py-3 text-xs font-medium text-white">{fmt(pl.savesCount)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => update(pl.id, { featured: !pl.featured })}
                      disabled={saving === pl.id}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${pl.featured ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "border border-[var(--color-border)] text-zinc-600 hover:text-white"}`}
                    >
                      {pl.featured ? "Featured" : "Feature"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={pl.status}
                      onChange={(e) => update(pl.id, { status: e.target.value as Status })}
                      disabled={saving === pl.id}
                      className={`rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs font-semibold focus:outline-none ${STATUS_COLORS[pl.status as Status]}`}
                    >
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={pl.visibility}
                      onChange={(e) => update(pl.id, { visibility: e.target.value as Visibility })}
                      disabled={saving === pl.id}
                      className={`rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs font-semibold focus:outline-none ${VIS_COLORS[pl.visibility as Visibility]}`}
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="UNLISTED">Unlisted</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(pl.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-white disabled:opacity-40">Previous</button>
          <span className="text-xs text-[var(--color-text-muted)]">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-white disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
