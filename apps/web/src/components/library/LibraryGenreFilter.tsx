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

const chipClass =
  "rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90 data-[active=true]:border-[var(--color-brand)]/50 data-[active=true]:bg-[var(--color-brand)]/15 data-[active=true]:text-white";

function setActiveChip(root: HTMLDivElement | null, slug: string | null) {
  root?.querySelectorAll<HTMLButtonElement>("[data-genre-slug]").forEach((chip) => {
    const active = chip.dataset.genreSlug === (slug ?? "");
    chip.dataset.active = String(active);
    chip.setAttribute("aria-pressed", String(active));
  });
}

export const LibraryGenreFilter = memo(function LibraryGenreFilter({
  genres,
  store,
}: LibraryGenreFilterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedGenreRef = useRef(store.getSnapshot());
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);

  const measureRows = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const chips = Array.from(root.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    const rowTops = [...new Set(chips.map((chip) => chip.offsetTop))].sort((a, b) => a - b);
    const hasMoreThanTwoRows = rowTops.length > 2;

    setCanExpand(hasMoreThanTwoRows);
    setCollapsedHeight(() => {
      if (!hasMoreThanTwoRows || rowTops[1] == null) return null;

      const secondRowTop = rowTops[1];
      const secondRowBottom = chips
        .filter((chip) => chip.offsetTop === secondRowTop)
        .reduce((bottom, chip) => Math.max(bottom, chip.offsetTop + chip.offsetHeight), 0);

      return secondRowBottom;
    });
  }, []);

  const selectGenre = useCallback(
    (slug: string | null) => {
      const nextSlug = selectedGenreRef.current === slug ? null : slug;
      selectedGenreRef.current = nextSlug;
      setActiveChip(rootRef.current, nextSlug);
      store.setValue(nextSlug);
    },
    [store],
  );

  useEffect(() => {
    selectedGenreRef.current = store.getSnapshot();
    setActiveChip(rootRef.current, selectedGenreRef.current);
  }, [genres, store]);

  useEffect(() => {
    setExpanded(false);
  }, [genres]);

  useLayoutEffect(() => {
    measureRows();

    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(measureRows);
    observer.observe(root);
    Array.from(root.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [genres, measureRows]);

  if (genres.length === 0) return null;

  const selectedGenre = store.getSnapshot();

  return (
    <div className="mt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/25">Genre</p>
      <div
        ref={rootRef}
        className="flex max-w-2xl flex-wrap gap-2 overflow-hidden"
        style={
          canExpand && !expanded && collapsedHeight != null
            ? { maxHeight: collapsedHeight }
            : undefined
        }
      >
        <button
          type="button"
          data-active={String(selectedGenre === null)}
          data-genre-slug=""
          aria-pressed={selectedGenre === null}
          onClick={() => selectGenre(null)}
          className={chipClass}
        >
          All
        </button>
        {genres.map((genre) => (
          <button
            key={genre.slug}
            type="button"
            data-active={String(selectedGenre === genre.slug)}
            data-genre-slug={genre.slug}
            aria-pressed={selectedGenre === genre.slug}
            onClick={() => selectGenre(genre.slug)}
            className={chipClass}
          >
            {genre.name}
          </button>
        ))}
      </div>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-xs font-medium text-white/40 transition-colors hover:text-white/75"
          aria-expanded={expanded}
        >
          {expanded ? "Hide genres" : "Show all genres"}
        </button>
      )}
    </div>
  );
});
