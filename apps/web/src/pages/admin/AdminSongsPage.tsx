import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { AdminSong, AdminContentTagRef } from "@playlisted/client-sdk";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

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

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDur(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
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

function SortHeader({ col, label, sortBy, order, onSort }: {
  col: string; label: string; sortBy: string; order: string;
  onSort: (col: string) => void;
}) {
  return (
    <th
      className="px-4 py-3 cursor-pointer select-none hover:text-white transition whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {label} {sortBy === col ? (order === "desc" ? "↓" : "↑") : ""}
    </th>
  );
}

export function AdminSongsPage() {
  const { accessToken } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);
  const [songs, setSongs] = useState<AdminSong[]>([]);

  usePageMeta({ title: "Songs — Admin" });
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
  const [filterExplicit, setFilterExplicit] = useState("");
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
      if (filterExplicit) query.explicit = filterExplicit === "true";
      const res = await api.admin.listSongs(query);
      setSongs(res.data);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e.message ?? "Failed to load songs.");
    } finally {
      setLoading(false);
    }
  }, [api, page, search, filterStatus, filterVisibility, filterExplicit, sortBy, order]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); setSearch(value); }, 350);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) setOrder((o) => o === "asc" ? "desc" : "asc");
    else { setSortBy(col); setOrder("desc"); }
    setPage(1);
  };

  const update = async (songId: string, patch: { status?: Status; visibility?: Visibility; explicit?: boolean }) => {
    setSaving(songId);
    setError(null);
    try {
      const updated = await api.admin.updateSong(songId, patch);
      setSongs((prev) => prev.map((s) => s.id === songId ? updated : s));
    } catch (e: any) {
      setError(e.message ?? "Failed to update song.");
    } finally {
      setSaving(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Songs</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Song Management</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manage visibility, status, and explicit flags across all tracks.</p>
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
        <select value={filterExplicit} onChange={(e) => { setFilterExplicit(e.target.value); setPage(1); }} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:outline-none">
          <option value="">All content</option>
          <option value="true">Explicit only</option>
          <option value="false">Clean only</option>
        </select>
      </div>

      <div className="text-xs text-[var(--color-text-muted)]">{total} songs · page {page}</div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : songs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No songs found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-3">Song</th>
                <SortHeader col="plays" label="Plays" sortBy={sortBy} order={order} onSort={handleSort} />
                <th className="px-4 py-3">Genres</th>
                <SortHeader col="duration" label="Duration" sortBy={sortBy} order={order} onSort={handleSort} />
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Explicit</th>
                <SortHeader col="createdAt" label="Added" sortBy={sortBy} order={order} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
              {songs.map((song) => (
                <tr key={song.id} className={`transition ${saving === song.id ? "opacity-40" : ""}`}>
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="flex items-center gap-2">
                      {song.artworkUrl ? (
                        <img src={song.artworkUrl} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-zinc-800 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white text-xs">{song.title}</p>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">{song.uploader.displayName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-white">{fmt(song.playCount)}</td>
                  <td className="px-4 py-3"><GenreChips tags={song.tags} /></td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{fmtDur(song.durationSeconds ?? null)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={song.status}
                      onChange={(e) => update(song.id, { status: e.target.value as Status })}
                      disabled={saving === song.id}
                      className={`rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs font-semibold focus:outline-none ${STATUS_COLORS[song.status as Status]}`}
                    >
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={song.visibility}
                      onChange={(e) => update(song.id, { visibility: e.target.value as Visibility })}
                      disabled={saving === song.id}
                      className={`rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs font-semibold focus:outline-none ${VIS_COLORS[song.visibility as Visibility]}`}
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="UNLISTED">Unlisted</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => update(song.id, { explicit: !song.explicit })}
                      disabled={saving === song.id}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${song.explicit ? "bg-red-400/20 text-red-400" : "border border-[var(--color-border)] text-zinc-600 hover:text-white"}`}
                    >
                      {song.explicit ? "Explicit" : "Clean"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(song.createdAt).toLocaleDateString()}
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
