import { useState, useEffect, useRef } from "react";
import type { AdminTag } from "@playlisted/client-sdk";

type Props = {
  count: number;
  entityLabel: string;
  hint: string;
  allGenres: AdminTag[];
  busy: boolean;
  onSetGenres: (genreIds: string[]) => Promise<void>;
};

export function AdminBatchGenrePanel({
  count,
  entityLabel,
  hint,
  allGenres,
  busy,
  onSetGenres,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (count === 0) {
      setPick(new Set());
      setOpen(false);
    }
  }, [count]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search
    ? allGenres.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : allGenres;
  const disabled = count === 0 || busy;
  const plural = count === 1 ? entityLabel : `${entityLabel}s`;

  async function apply() {
    await onSetGenres(Array.from(pick));
    setPick(new Set());
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-40"
      >
        Set genres…
      </button>
      {open && count > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-[var(--color-border)] bg-[#1a1a2e] shadow-2xl">
          <div className="border-b border-[var(--color-border)] px-2 py-1.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find genre…"
              className="w-full rounded border border-transparent bg-black/30 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:border-purple-400/40 focus:outline-none"
            />
          </div>
          <div className="max-h-40 overflow-y-auto p-1">
            {filtered.map((g) => {
              const checked = pick.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() =>
                    setPick((prev) => {
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
            <p className="px-0.5 text-[10px] leading-snug text-zinc-500">{hint}</p>
            <button
              type="button"
              disabled={busy}
              onClick={apply}
              className="w-full rounded-lg bg-purple-500/20 px-2 py-1.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/30 disabled:opacity-40"
            >
              Apply{pick.size === 0 ? " (clear genres)" : ""} — {count} {plural}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
