import { useState, useEffect, useRef } from "react";
import type { AdminSong, AdminTag } from "@playlisted/client-sdk";

type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

type Props = {
  count: number;
  previewTitles: { id: string; title: string }[];
  allGenres: AdminTag[];
  busy: boolean;
  onClear: () => void;
  onAddGenres: (genreIds: string[]) => Promise<void>;
  onSetGenres: (genreIds: string[]) => Promise<void>;
  onSetVisibility: (visibility: Visibility) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function AdminSongsBatchBar({
  count,
  previewTitles,
  allGenres,
  busy,
  onClear,
  onAddGenres,
  onSetGenres,
  onSetVisibility,
  onDelete,
}: Props) {
  const [genreOpen, setGenreOpen] = useState(false);
  const [genrePick, setGenrePick] = useState<Set<string>>(new Set());
  const [genreSearch, setGenreSearch] = useState("");
  const [vis, setVis] = useState<Visibility>("PUBLIC");
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const genreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (count === 0) {
      setGenrePick(new Set());
      setDeleteStep(0);
      setGenreOpen(false);
    }
  }, [count]);

  useEffect(() => {
    if (!genreOpen) return;
    function handler(e: MouseEvent) {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setGenreOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [genreOpen]);

  const filteredGenres = genreSearch
    ? allGenres.filter((g) => g.name.toLowerCase().includes(genreSearch.toLowerCase()))
    : allGenres;

  async function applyAddGenres() {
    if (genrePick.size === 0) return;
    await onAddGenres(Array.from(genrePick));
    setGenrePick(new Set());
    setGenreOpen(false);
  }

  async function applySetGenres() {
    await onSetGenres(Array.from(genrePick));
    setGenrePick(new Set());
    setGenreOpen(false);
  }

  async function applyVisibility() {
    await onSetVisibility(vis);
  }

  async function confirmDelete() {
    if (deleteStep === 0) {
      setDeleteStep(1);
      return;
    }
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    await onDelete();
    setDeleteStep(0);
  }

  const disabled = count === 0 || busy;

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${
        count > 0 ? "border-amber-400/40 bg-amber-400/5" : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-white">
          {count === 0 ? "Select songs to batch edit" : `${count} selected`}
        </span>
        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className="text-xs text-zinc-500 transition hover:text-white disabled:opacity-40"
          >
            Clear
          </button>
        )}

        <div ref={genreRef} className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setGenreOpen((o) => !o)}
            className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-40"
          >
            Genres…
          </button>
          {genreOpen && count > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-[var(--color-border)] bg-[#1a1a2e] shadow-2xl">
              <div className="border-b border-[var(--color-border)] px-2 py-1.5">
                <input
                  value={genreSearch}
                  onChange={(e) => setGenreSearch(e.target.value)}
                  placeholder="Find genre…"
                  className="w-full rounded border border-transparent bg-black/30 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-purple-400/40 focus:outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto p-1">
                {filteredGenres.map((g) => {
                  const checked = genrePick.has(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setGenrePick((prev) => {
                          const next = new Set(prev);
                          checked ? next.delete(g.id) : next.add(g.id);
                          return next;
                        })
                      }
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition hover:bg-white/[0.06] ${checked ? "text-purple-300" : "text-[var(--color-text-muted)]"}`}
                    >
                      <span className={`h-3.5 w-3.5 shrink-0 rounded border ${checked ? "border-purple-400 bg-purple-400" : "border-zinc-600"}`} />
                      {g.name}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1.5 border-t border-[var(--color-border)] p-2">
                <p className="px-0.5 text-[10px] leading-snug text-zinc-500">
                  Add keeps existing song genres. Set replaces all song genres (playlist genres unchanged).
                </p>
                <button
                  type="button"
                  disabled={genrePick.size === 0 || busy}
                  onClick={applyAddGenres}
                  className="w-full rounded-lg bg-purple-500/20 px-2 py-1.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/30 disabled:opacity-40"
                >
                  Add (merge) — {count} song{count === 1 ? "" : "s"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={applySetGenres}
                  className="w-full rounded-lg border border-purple-400/30 px-2 py-1.5 text-xs font-semibold text-purple-200 transition hover:bg-purple-500/10 disabled:opacity-40"
                >
                  Set (replace){genrePick.size === 0 ? " — clear all" : ""} — {count} song{count === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={vis}
            disabled={disabled}
            onChange={(e) => setVis(e.target.value as Visibility)}
            className="rounded-lg border border-[var(--color-border)] bg-black/30 px-2 py-1.5 text-xs text-white disabled:opacity-40"
          >
            <option value="PUBLIC">Public</option>
            <option value="UNLISTED">Unlisted</option>
            <option value="PRIVATE">Private</option>
          </select>
          <button
            type="button"
            disabled={disabled}
            onClick={applyVisibility}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.06] disabled:opacity-40"
          >
            Set visibility
          </button>
        </div>

        {deleteStep === 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={confirmDelete}
            className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-400/10 disabled:opacity-40"
          >
            Delete selected
          </button>
        ) : (
          <div className="flex w-full flex-wrap items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
            <div className="min-w-[200px] flex-1 text-xs text-red-300">
              {deleteStep === 1 ? (
                <>
                  <p className="font-semibold text-red-400">
                    Permanently delete {count} song{count === 1 ? "" : "s"}?
                  </p>
                  <p className="mt-1 text-red-300/90">This cannot be undone. Audio files and playlist links may be affected.</p>
                  {previewTitles.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-red-300/80">
                      {previewTitles.map((s) => (
                        <li key={s.id} className="truncate">{s.title}</li>
                      ))}
                      {count > previewTitles.length && (
                        <li>…and {count - previewTitles.length} more</li>
                      )}
                    </ul>
                  )}
                </>
              ) : (
                <p className="font-semibold text-red-400">
                  Final step: click again to permanently delete {count} song{count === 1 ? "" : "s"}.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteStep(0)}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmDelete}
                className="rounded-lg bg-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 ring-1 ring-red-400/50 transition hover:bg-red-500/40"
              >
                {deleteStep === 1 ? "Continue" : `Delete ${count} now`}
              </button>
            </div>
          </div>
        )}

        {busy && <span className="text-xs text-amber-400">Applying…</span>}
      </div>
    </div>
  );
}

export async function runSequential<T>(
  ids: string[],
  fn: (id: string) => Promise<T | null>,
): Promise<T[]> {
  const results: T[] = [];
  for (const id of ids) {
    const result = await fn(id);
    if (result !== null) results.push(result);
  }
  return results;
}

export function songGenreIds(song: AdminSong): string[] {
  return song.tags.filter((t) => t.kind === "GENRE").map((t) => t.id);
}

export function mergeGenreIds(song: AdminSong, addIds: string[]): string[] {
  return [...new Set([...songGenreIds(song), ...addIds])];
}
