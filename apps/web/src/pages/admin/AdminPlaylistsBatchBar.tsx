import { useState } from "react";
import type { AdminTag } from "@playlisted/client-sdk";

import { AdminBatchGenrePanel } from "./AdminBatchGenrePanel";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

type Props = {
  count: number;
  allGenres: AdminTag[];
  busy: boolean;
  onClear: () => void;
  onAddGenres: (genreIds: string[]) => Promise<void>;
  onSetGenres: (genreIds: string[]) => Promise<void>;
  onSetStatus: (status: Status) => Promise<void>;
  onSetVisibility: (visibility: Visibility) => Promise<void>;
  onSetFeatured: (featured: boolean) => Promise<void>;
};

export function AdminPlaylistsBatchBar({
  count,
  allGenres,
  busy,
  onClear,
  onAddGenres,
  onSetGenres,
  onSetStatus,
  onSetVisibility,
  onSetFeatured,
}: Props) {
  const [status, setStatus] = useState<Status>("PUBLISHED");
  const [vis, setVis] = useState<Visibility>("PUBLIC");
  const disabled = count === 0 || busy;

  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${
        count > 0 ? "border-amber-400/40 bg-amber-400/5" : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-white">
          {count === 0 ? "Select playlists to batch edit" : `${count} selected`}
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

        <AdminBatchGenrePanel
          count={count}
          entityLabel="playlist"
          mergeHint="Add keeps existing playlist genres. Set replaces all playlist genres (affects homepage for every track on the playlist)."
          allGenres={allGenres}
          busy={busy}
          onAddGenres={onAddGenres}
          onSetGenres={onSetGenres}
        />

        <div className="flex items-center gap-2">
          <select
            value={status}
            disabled={disabled}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="rounded-lg border border-[var(--color-border)] bg-black/30 px-2 py-1.5 text-xs text-white disabled:opacity-40"
          >
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSetStatus(status)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.06] disabled:opacity-40"
          >
            Set status
          </button>
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
            onClick={() => onSetVisibility(vis)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.06] disabled:opacity-40"
          >
            Set visibility
          </button>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onSetFeatured(true)}
          className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/10 disabled:opacity-40"
        >
          Feature
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSetFeatured(false)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.06] disabled:opacity-40"
        >
          Unfeature
        </button>

        {busy && <span className="text-xs text-amber-400">Applying…</span>}
      </div>
    </div>
  );
}
