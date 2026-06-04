import { useState, useEffect } from "react";
import type { AdminTag } from "@playlisted/client-sdk";

import { AdminBatchGenrePanel } from "./AdminBatchGenrePanel";
import { runSequential } from "./adminGenreUtils";

type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

type Props = {
  count: number;
  previewTitles: { id: string; title: string }[];
  allGenres: AdminTag[];
  busy: boolean;
  onClear: () => void;
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
  onSetGenres,
  onSetVisibility,
  onDelete,
}: Props) {
  const [vis, setVis] = useState<Visibility>("PUBLIC");
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (count === 0) setDeleteStep(0);
  }, [count]);

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

        <AdminBatchGenrePanel
          count={count}
          entityLabel="song"
          hint="Replaces song genres on each selection. Playlist genres are unchanged."
          allGenres={allGenres}
          busy={busy}
          onSetGenres={onSetGenres}
        />

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

export { runSequential };
