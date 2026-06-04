import type { PlaylistSummary } from "@playlisted/client-sdk";
import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { matchPlaylistsByQuery } from "@/components/library/libraryFilterUtils";
import { coverFallback } from "@/lib/routes";

interface LibraryPlaylistFilterProps {
  playlists: PlaylistSummary[];
  suggestedPlaylists: PlaylistSummary[];
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
}

export function LibraryPlaylistFilter({
  playlists,
  suggestedPlaylists,
  filterQuery,
  onFilterQueryChange,
}: LibraryPlaylistFilterProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = matchPlaylistsByQuery(playlists, filterQuery);
  const showDropdown = open && filterQuery.trim().length > 0;

  useEffect(() => {
    if (!showDropdown) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showDropdown]);

  function pickPlaylist(playlist: PlaylistSummary) {
    onFilterQueryChange(playlist.title);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearSearch() {
    onFilterQueryChange("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (event.key === "ArrowDown" && filterQuery.trim()) setOpen(true);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      pickPlaylist(matches[activeIndex]);
    }
  }

  return (
    <div className="mt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/25">Search</p>

      <div ref={rootRef} className="relative max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          ref={inputRef}
          type="search"
          value={filterQuery}
          onChange={(event) => {
            onFilterQueryChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search playlists…"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
        />
        {filterQuery.trim() && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear playlist search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/30 transition hover:text-white/70"
          >
            <X size={14} />
          </button>
        )}

        {showDropdown && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-60 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-2xl"
          >
            {matches.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No playlists found</p>
            ) : (
              matches.map((playlist, index) => (
                <button
                  key={playlist.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pickPlaylist(playlist)}
                  className={[
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition",
                    index === activeIndex ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-sm">
                    {playlist.coverArtUrl ? (
                      <img src={playlist.coverArtUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{ background: coverFallback(playlist.title) }}
                      />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate">{playlist.title}</span>
                  <span className="shrink-0 text-xs text-white/30">{playlist.owner.displayName}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {suggestedPlaylists.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedPlaylists.map((playlist) => {
            const active =
              filterQuery.trim().toLowerCase() === playlist.title.trim().toLowerCase();
            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() => (active ? clearSearch() : onFilterQueryChange(playlist.title))}
                className={[
                  "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs transition-colors",
                  active
                    ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90",
                ].join(" ")}
              >
                <div className="h-5 w-5 shrink-0 overflow-hidden rounded-sm">
                  {playlist.coverArtUrl ? (
                    <img src={playlist.coverArtUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ background: coverFallback(playlist.title) }}
                    />
                  )}
                </div>
                <span className="max-w-[140px] truncate">{playlist.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
