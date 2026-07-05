import type { LibraryGenre } from "@playlisted/client-sdk";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export interface LibraryGenreSelectionStore {
  getSnapshot: () => string | null;
  setValue: (slug: string | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createLibraryGenreSelectionStore(
  initialValue: string | null = null,
): LibraryGenreSelectionStore {
  let value = initialValue;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => value,
    setValue: (slug) => {
      if (value === slug) return;
      value = slug;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useLibraryGenreSelection(store: LibraryGenreSelectionStore): string | null {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

interface LibraryGenreFilterProps {
  genres: LibraryGenre[];
  store: LibraryGenreSelectionStore;
}

type GenreChip = {
  key: string;
  slug: string | null;
  name: string;
};

const chipClass =
  "rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90 data-[active=true]:border-[var(--color-brand)]/50 data-[active=true]:bg-[var(--color-brand)]/15 data-[active=true]:text-white";

const chipRowClass = "flex w-full flex-wrap gap-2";

function chipsFromGenres(genres: LibraryGenre[]): GenreChip[] {
  return [
    { key: "all", slug: null, name: "All" },
    ...genres.map((genre) => ({ key: genre.slug, slug: genre.slug, name: genre.name })),
  ];
}

function countFirstRowChips(root: HTMLElement): number {
  const chips = Array.from(root.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
  if (chips.length === 0) return 0;

  const firstTop = chips[0].offsetTop;
  let count = 1;
  for (let index = 1; index < chips.length; index++) {
    if (Math.abs(chips[index].offsetTop - firstTop) > 1) break;
    count++;
  }
  return count;
}

export const LibraryGenreFilter = memo(function LibraryGenreFilter({
  genres,
  store,
}: LibraryGenreFilterProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const selectedGenreRef = useRef(store.getSnapshot());
  const [expanded, setExpanded] = useState(false);
  const [firstRowCount, setFirstRowCount] = useState<number | null>(null);

  const selectedGenre = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const chips = chipsFromGenres(genres);
  const canExpand = firstRowCount != null && firstRowCount < chips.length;
  const visibleCount = expanded || !canExpand ? chips.length : firstRowCount;

  const measureFirstRow = useCallback(() => {
    const root = measureRef.current;
    if (!root) return;
    setFirstRowCount(countFirstRowChips(root));
  }, []);

  const selectGenre = useCallback(
    (slug: string | null) => {
      const nextSlug = selectedGenreRef.current === slug ? null : slug;
      selectedGenreRef.current = nextSlug;
      store.setValue(nextSlug);
    },
    [store],
  );

  useEffect(() => {
    selectedGenreRef.current = selectedGenre;
  }, [selectedGenre]);

  useEffect(() => {
    setExpanded(false);
  }, [genres]);

  useLayoutEffect(() => {
    measureFirstRow();

    const root = measureRef.current;
    if (!root) return;

    const observer = new ResizeObserver(measureFirstRow);
    observer.observe(root);
    return () => observer.disconnect();
  }, [genres, measureFirstRow]);

  if (genres.length === 0) return null;

  function renderChip(chip: GenreChip) {
    const active = selectedGenre === chip.slug;
    return (
      <button
        key={chip.key}
        type="button"
        data-active={String(active)}
        aria-pressed={active}
        onClick={() => selectGenre(chip.slug)}
        className={chipClass}
      >
        {chip.name}
      </button>
    );
  }

  return (
    <div className="mt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/25">Genre</p>

      <div className="relative max-w-2xl">
        <div
          ref={measureRef}
          aria-hidden="true"
          inert
          className={`${chipRowClass} pointer-events-none invisible absolute inset-0 -z-10`}
        >
          {chips.map(renderChip)}
        </div>

        <div className={chipRowClass}>{chips.slice(0, visibleCount).map(renderChip)}</div>
      </div>

      {canExpand && (
        <div className="flex justify-end">
          
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-xs font-medium text-white/40 transition-colors hover:text-white/75 mt-4"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
        </div>
      )}
    </div>
  );
});
