import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { AdminSong, AdminContentTagRef, AdminTag } from "@playlisted/client-sdk";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { AdminSongsBatchBar, mergeGenreIds } from "./AdminSongsBatchBar";

type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

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

function TitleEditor({
  song,
  saving,
  onSave,
}: {
  song: AdminSong;
  saving: boolean;
  onSave: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(song.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(song.title); }, [song.title]);

  function startEdit() {
    setValue(song.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== song.title) onSave(trimmed);
    setEditing(false);
  }

  function cancel() {
    setValue(song.title);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") cancel();
        }}
        disabled={saving}
        className="w-full rounded border border-amber-400/50 bg-black/40 px-1.5 py-0.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-amber-400/70"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group/title block w-full truncate rounded px-1 py-0.5 text-left text-xs font-medium text-white transition hover:bg-white/[0.06]"
      title="Click to edit title"
    >
      {song.title}
      <span className="ml-1 opacity-0 text-zinc-600 group-hover/title:opacity-100">✎</span>
    </button>
  );
}

function DeleteButton({
  saving,
  onDelete,
}: {
  saving: boolean;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirming(false);
      onDelete();
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[10px] font-medium text-red-400/80">Cannot undo</span>
        <button
          type="button"
          onClick={handleClick}
          disabled={saving}
          className="rounded px-2 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-400/50 transition hover:bg-red-400/10"
        >
          Confirm delete?
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      className="rounded px-2 py-0.5 text-xs text-zinc-600 transition hover:text-red-400"
    >
      Delete
    </button>
  );
}

function adminSongToQueueTrack(song: AdminSong): QueueTrack {
  return {
    id: song.id,
    title: song.title,
    description: song.description ?? null,
    audioUrl: song.audioUrl,
    durationSeconds: song.durationSeconds ?? null,
    artworkUrl: song.artworkUrl ?? null,
    recordingType: song.recordingType,
    visibility: song.visibility,
    status: song.status,
    explicit: song.explicit,
    playCount: song.playCount,
    publishedAt: song.publishedAt ?? null,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
    uploaderId: song.uploader.id,
    publishedPlaylistId: song.playlist.id,
    ownerName: song.uploader.displayName,
    ownerUsername: song.uploader.username,
    playlistTitle: song.playlist.title,
    playlistSlug: song.playlist.slug,
  };
}

function SongPlayButton({ song }: { song: AdminSong }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const isActive = currentTrack?.id === song.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isActive) {
      togglePlay();
    } else {
      const track = adminSongToQueueTrack(song);
      playTrack(track, [track], { sourceContext: "admin" });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group/play relative h-9 w-9 shrink-0 overflow-hidden rounded"
      title={isCurrentlyPlaying ? "Pause" : "Play"}
    >
      {song.artworkUrl ? (
        <img src={song.artworkUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full rounded bg-zinc-800" />
      )}
      <div
        className={`absolute inset-0 flex items-center justify-center rounded bg-black/60 transition-opacity ${
          isActive ? "opacity-100" : "opacity-0 group-hover/play:opacity-100"
        }`}
      >
        {isCurrentlyPlaying ? (
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </div>
    </button>
  );
}

function GenreEditor({
  song,
  allGenres,
  saving,
  onSave,
}: {
  song: AdminSong;
  allGenres: AdminTag[];
  saving: boolean;
  onSave: (tagIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(song.tags.filter((t) => t.kind === "GENRE").map((t) => t.id)),
  );
  const [genreSearch, setGenreSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync external changes (e.g., after save lands)
  useEffect(() => {
    setSelected(new Set(song.tags.filter((t) => t.kind === "GENRE").map((t) => t.id)));
  }, [song.tags]);

  // Focus search input when dropdown opens; clear on close
  useEffect(() => {
    if (open) {
      setGenreSearch("");
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentGenres = song.tags.filter((t: AdminContentTagRef) => t.kind === "GENRE");
  const filteredGenres = genreSearch
    ? allGenres.filter((g) => g.name.toLowerCase().includes(genreSearch.toLowerCase()))
    : allGenres;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function commit() {
    onSave(Array.from(selected));
    setOpen(false);
  }

  function cancel() {
    setSelected(new Set(song.tags.filter((t) => t.kind === "GENRE").map((t) => t.id)));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={saving}
        onClick={() => setOpen((o) => !o)}
        className="group flex min-w-[80px] flex-wrap gap-1 rounded p-1 text-left transition hover:bg-white/[0.04]"
      >
        {currentGenres.length === 0 ? (
          <span className="text-xs text-zinc-600 group-hover:text-zinc-400">— add genre</span>
        ) : (
          currentGenres.map((g) => (
            <span key={g.id} className="rounded-full bg-purple-400/10 px-2 py-0.5 text-xs font-medium text-purple-400">
              {g.name}
            </span>
          ))
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border border-[var(--color-border)] bg-[#1a1a2e] shadow-2xl">
          <div className="border-b border-[var(--color-border)] px-2 py-1.5">
            <input
              ref={searchRef}
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
                if (e.key === "Enter" && filteredGenres.length === 1) toggle(filteredGenres[0].id);
              }}
              placeholder="Find genre…"
              className="w-full rounded border border-transparent bg-black/30 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-purple-400/40 focus:outline-none"
            />
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            {filteredGenres.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-500">No match.</p>
            ) : (
              filteredGenres.map((g) => {
                const checked = selected.has(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggle(g.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition hover:bg-white/[0.06] ${checked ? "text-purple-300" : "text-[var(--color-text-muted)]"}`}
                  >
                    <span className={`h-3.5 w-3.5 shrink-0 rounded border transition ${checked ? "border-purple-400 bg-purple-400" : "border-zinc-600"}`} />
                    {g.name}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex gap-2 border-t border-[var(--color-border)] p-2">
            <button
              type="button"
              onClick={commit}
              className="flex-1 rounded-lg bg-purple-500/20 px-2 py-1 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/30"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              className="flex-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminSongsPage() {
  const { accessToken } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [allGenres, setAllGenres] = useState<AdminTag[]>([]);

  usePageMeta({ title: "Songs — Admin" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterVisibility, setFilterVisibility] = useState("");
  const [filterExplicit, setFilterExplicit] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load genre tags once
  useEffect(() => {
    api.admin.listTags({ kind: "GENRE" }).then((res) => setAllGenres(res.data)).catch(() => {});
  }, [api]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean> = { page, pageSize: PAGE_SIZE, sortBy, order };
      if (search.trim()) query.q = search.trim();
      if (filterVisibility) query.visibility = filterVisibility;
      if (filterExplicit) query.explicit = filterExplicit === "true";
      const res = await api.admin.listSongs(query);
      setSongs(res.data);
      setTotal(res.meta.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load songs.");
    } finally {
      setLoading(false);
    }
  }, [api, page, search, filterVisibility, filterExplicit, sortBy, order]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const selectedCount = selectedIds.size;
  const allPageSelected = songs.length > 0 && songs.every((s) => selectedIds.has(s.id));
  const somePageSelected = songs.some((s) => selectedIds.has(s.id)) && !allPageSelected;
  const previewTitles = songs
    .filter((s) => selectedIds.has(s.id))
    .slice(0, 5)
    .map((s) => ({ id: s.id, title: s.title }));

  function toggleSelect(songId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allPageSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(songs.map((s) => s.id)));
  }

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

  const updateVisibility = async (songId: string, visibility: Visibility) => {
    setSaving(songId);
    setError(null);
    try {
      const updated = await api.admin.updateSong(songId, { visibility });
      setSongs((prev) => prev.map((s) => s.id === songId ? updated : s));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update song.");
    } finally {
      setSaving(null);
    }
  };

  const updateTitle = async (songId: string, title: string) => {
    setSaving(songId);
    setError(null);
    try {
      const updated = await api.admin.updateSong(songId, { title });
      setSongs((prev) => prev.map((s) => s.id === songId ? updated : s));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update title.");
    } finally {
      setSaving(null);
    }
  };

  const updateGenres = async (songId: string, tagIds: string[]) => {
    setSaving(songId);
    setError(null);
    try {
      const updated = await api.admin.setSongTags(songId, tagIds);
      setSongs((prev) => prev.map((s) => s.id === songId ? updated : s));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update genres.");
    } finally {
      setSaving(null);
    }
  };

  const deleteSong = async (songId: string) => {
    setSaving(songId);
    setError(null);
    try {
      await api.admin.deleteSong(songId);
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(songId); return next; });
      setTotal((t) => t - 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete song.");
    } finally {
      setSaving(null);
    }
  };

  const batchAddGenres = async (genreIds: string[]) => {
    const ids = [...selectedIds];
    if (ids.length === 0 || genreIds.length === 0) return;
    setBatchBusy(true);
    setError(null);
    try {
      const updated = await Promise.all(
        ids.map((id) => {
          const song = songs.find((s) => s.id === id);
          if (!song) return null;
          return api.admin.setSongTags(id, mergeGenreIds(song, genreIds));
        }),
      );
      const byId = new Map(updated.filter(Boolean).map((u) => [u!.id, u!]));
      setSongs((prev) => prev.map((s) => (byId.has(s.id) ? byId.get(s.id)! : s)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add genres.");
    } finally {
      setBatchBusy(false);
    }
  };

  const batchSetVisibility = async (visibility: Visibility) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBatchBusy(true);
    setError(null);
    try {
      const updated = await Promise.all(ids.map((id) => api.admin.updateSong(id, { visibility })));
      const byId = new Map(updated.map((u) => [u.id, u]));
      setSongs((prev) => prev.map((s) => (byId.has(s.id) ? byId.get(s.id)! : s)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update visibility.");
    } finally {
      setBatchBusy(false);
    }
  };

  const batchDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBatchBusy(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => api.admin.deleteSong(id)));
      const removed = new Set(ids);
      setSongs((prev) => prev.filter((s) => !removed.has(s.id)));
      setSelectedIds(new Set());
      setTotal((t) => Math.max(0, t - ids.length));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete songs.");
    } finally {
      setBatchBusy(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const rowBusy = (songId: string) => saving === songId || batchBusy;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Songs</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Song Management</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Control visibility and genres across all tracks. Select rows for batch edits.</p>
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

      <AdminSongsBatchBar
        count={selectedCount}
        previewTitles={previewTitles}
        allGenres={allGenres}
        busy={batchBusy}
        onClear={() => setSelectedIds(new Set())}
        onAddGenres={batchAddGenres}
        onSetVisibility={batchSetVisibility}
        onDelete={batchDelete}
      />

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
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                    onChange={toggleSelectAll}
                    disabled={batchBusy}
                    className="h-3.5 w-3.5 rounded border-zinc-600 accent-amber-400"
                    title="Select all on this page"
                  />
                </th>
                <th className="px-4 py-3">Song</th>
                <SortHeader col="plays" label="Plays" sortBy={sortBy} order={order} onSort={handleSort} />
                <th className="px-4 py-3">Genres</th>
                <SortHeader col="duration" label="Duration" sortBy={sortBy} order={order} onSort={handleSort} />
                <th className="px-4 py-3">Visibility</th>
                <SortHeader col="createdAt" label="Added" sortBy={sortBy} order={order} onSort={handleSort} />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
              {songs.map((song) => (
                <tr
                  key={song.id}
                  className={`transition ${rowBusy(song.id) ? "opacity-40" : ""} ${selectedIds.has(song.id) ? "bg-amber-400/[0.04]" : ""}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(song.id)}
                      onChange={() => toggleSelect(song.id)}
                      disabled={batchBusy}
                      className="h-3.5 w-3.5 rounded border-zinc-600 accent-amber-400"
                    />
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <div className="flex items-center gap-2">
                      <SongPlayButton song={song} />
                      <div className="min-w-0 flex-1">
                        <TitleEditor
                          song={song}
                          saving={rowBusy(song.id)}
                          onSave={(title) => updateTitle(song.id, title)}
                        />
                        <p className="truncate text-xs text-[var(--color-text-muted)]">{song.uploader.displayName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-white">{fmt(song.playCount)}</td>
                  <td className="px-4 py-3">
                    <GenreEditor
                      song={song}
                      allGenres={allGenres}
                      saving={rowBusy(song.id)}
                      onSave={(tagIds) => updateGenres(song.id, tagIds)}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{fmtDur(song.durationSeconds ?? null)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={song.visibility}
                      onChange={(e) => updateVisibility(song.id, e.target.value as Visibility)}
                      disabled={rowBusy(song.id)}
                      className={`rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs font-semibold focus:outline-none ${VIS_COLORS[song.visibility as Visibility]}`}
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="UNLISTED">Unlisted</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(song.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <DeleteButton
                      saving={rowBusy(song.id)}
                      onDelete={() => deleteSong(song.id)}
                    />
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
