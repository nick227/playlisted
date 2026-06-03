import type { SortDirection, SongSortKey } from "@/components/library/libraryFilterUtils";

interface LibrarySongSortBarProps {
  sortKey: SongSortKey;
  sortDirection: SortDirection;
  onSortKeyChange: (key: SongSortKey) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
}

const SORT_OPTIONS: { key: SongSortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "plays", label: "Plays" },
  { key: "favorites", label: "Favorites" },
];

function sortButtonClass(active: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-xs transition-colors",
    active
      ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/15 text-white"
      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90",
  ].join(" ");
}

export function LibrarySongSortBar({
  sortKey,
  sortDirection,
  onSortKeyChange,
  onSortDirectionChange,
}: LibrarySongSortBarProps) {
  function handleClick(key: SongSortKey) {
    if (key === sortKey && key !== "title") {
      onSortDirectionChange(sortDirection === "desc" ? "asc" : "desc");
      return;
    }
    onSortKeyChange(key);
    if (key !== "title") onSortDirectionChange("desc");
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-white/25">Sort</span>
      {SORT_OPTIONS.map(({ key, label }) => {
        const active = sortKey === key;
        const directionLabel =
          active && key !== "title" ? (sortDirection === "desc" ? " ↓" : " ↑") : "";
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleClick(key)}
            className={sortButtonClass(active)}
          >
            {label}
            {directionLabel}
          </button>
        );
      })}
    </div>
  );
}
