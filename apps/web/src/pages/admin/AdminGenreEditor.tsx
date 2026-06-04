import { useState, useEffect, useRef } from "react";
import type { AdminContentTagRef, AdminTag } from "@playlisted/client-sdk";

function genreIdsFromTags(tags: AdminContentTagRef[]): string[] {
  return tags.filter((t) => t.kind === "GENRE").map((t) => t.id);
}

type Props = {
  tags: AdminContentTagRef[];
  allGenres: AdminTag[];
  saving: boolean;
  emptyLabel?: string;
  onSave: (tagIds: string[]) => void;
};

export function AdminGenreEditor({
  tags,
  allGenres,
  saving,
  emptyLabel = "— add genre",
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(genreIdsFromTags(tags)),
  );
  const [genreSearch, setGenreSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(new Set(genreIdsFromTags(tags)));
  }, [tags]);

  useEffect(() => {
    if (open) {
      setGenreSearch("");
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentGenres = tags.filter((t) => t.kind === "GENRE");
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
    setSelected(new Set(genreIdsFromTags(tags)));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={saving}
        onClick={() => setOpen((o) => !o)}
        className="group flex min-w-[80px] flex-wrap gap-1 rounded p-1 text-left transition hover:bg-white/[0.06]"
      >
        {currentGenres.length === 0 ? (
          <span className="text-xs text-zinc-600 group-hover:text-zinc-400">{emptyLabel}</span>
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
