import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { buildCommunityLibraryRows, type CommunityKind } from "@/components/song-visual-editor/theatreFxLibrary";
import type { VisualLibraryRow } from "@/components/song-visual-editor/useSongVisualLibraryItems";
import { CommunityFxThumb } from "@/components/song-visual-editor/CommunityFxThumb";
import { usePageMeta } from "@/hooks/usePageMeta";

export function AdminTheatrePage() {
  usePageMeta({ title: "Theatre FX — Admin" });
  
  const [activeCategory, setActiveCategory] = useState<CommunityKind | "all">("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  const rowsByKind = useMemo(() => buildCommunityLibraryRows(), []);
  
  const allRows = useMemo(() => {
    return [
      ...rowsByKind.videos,
      ...rowsByKind.animations,
      ...rowsByKind.images,
    ].sort((a, b) => a.label.localeCompare(b.label));
  }, [rowsByKind]);

  const filteredRows = useMemo(() => {
    if (activeCategory === "all") return allRows;
    return rowsByKind[activeCategory].sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows, rowsByKind, activeCategory]);

  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE);
  const paginatedRows = useMemo(() => {
    return filteredRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [filteredRows, page]);

  const categories = ["all", "videos", "animations", "images"] as const;

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Theatre</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Theatre FX Catalog</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            View and preview all available Theatre visual effects presets.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const isActive = activeCategory === c;
          const count = c === "all" ? allRows.length : rowsByKind[c as CommunityKind].length;
          
          return (
            <button
              key={c}
              onClick={() => {
                setActiveCategory(c);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                isActive
                  ? "bg-amber-500 text-black"
                  : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white"
              }`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedRows.map((row) => (
          <PresetCard key={row.id} row={row} />
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 pb-8">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="rounded px-4 py-2 bg-white/10 font-semibold text-white transition hover:bg-white/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="rounded px-4 py-2 bg-white/10 font-semibold text-white transition hover:bg-white/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      )}

      {filteredRows.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center text-sm text-[var(--color-text-muted)]">
          No presets found for this category.
        </div>
      )}
    </div>
  );
}

function PresetCard({ row }: { row: VisualLibraryRow }) {
  return (
    <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-white/20">
      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <p className="truncate font-bold text-white" title={row.label}>
            {row.label}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] font-mono truncate" title={row.theatrePresetId}>
            {row.theatrePresetId}
          </p>
        </div>
        <div className="shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider bg-white/10 text-white/70">
          {row.communityKind}
        </div>
      </div>
      
      <div className="my-2 h-24 w-full shrink-0 overflow-hidden rounded-lg bg-black/40">
        <CommunityFxThumb row={row} className="opacity-80" />
      </div>
      
      <div className="mt-auto pt-2 space-y-3">
        <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)]">
          <div className="flex flex-col gap-0.5">
            <span>{row.detail}</span>
          </div>
          <Link
            to={`/?theatrePreset=${encodeURIComponent(row.theatrePresetId)}`}
            target="_blank"
            className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/20"
          >
            Preview
          </Link>
        </div>
      </div>
    </div>
  );
}
