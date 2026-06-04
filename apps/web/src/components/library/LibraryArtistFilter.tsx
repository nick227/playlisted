import type { LibraryArtist } from "@playlisted/client-sdk";
import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { matchArtistsByQuery } from "@/components/library/libraryFilterUtils";
import { coverFallback } from "@/lib/routes";

type LibraryArtistFilterSelectProps = {
  mode?: "select";
  selectedArtistId: string | null;
  onSelect: (artistId: string | null) => void;
};

type LibraryArtistFilterBrowseProps = {
  mode: "filter";
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
};

type LibraryArtistFilterProps = {
  artists: LibraryArtist[];
  suggestedArtists: LibraryArtist[];
} & (LibraryArtistFilterSelectProps | LibraryArtistFilterBrowseProps);

export function LibraryArtistFilter(props: LibraryArtistFilterProps) {
  const { artists, suggestedArtists } = props;

  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedArtist =
    props.mode !== "filter" && props.selectedArtistId
      ? (artists.find((artist) => artist.id === props.selectedArtistId) ?? null)
      : null;
  const displayQuery = props.mode === "filter" ? props.filterQuery : query;
  const matches = matchArtistsByQuery(artists, displayQuery);
  const showDropdown = open && displayQuery.trim().length > 0;

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

  function applyQuery(value: string) {
    if (props.mode === "filter") {
      props.onFilterQueryChange(value);
      return;
    }
    setQuery(value);
  }

  function pickArtist(artist: LibraryArtist) {
    if (props.mode === "filter") {
      applyQuery(artist.displayName);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    props.onSelect(artist.id);
    setQuery(artist.displayName);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearArtist() {
    if (props.mode === "filter") {
      applyQuery("");
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.focus();
      return;
    }
    props.onSelect(null);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (event.key === "ArrowDown" && displayQuery.trim()) setOpen(true);
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
      pickArtist(matches[activeIndex]);
    }
  }

  const inputValue =
    props.mode !== "filter" && selectedArtist && !open ? selectedArtist.displayName : displayQuery;
  const sectionLabel = props.mode === "filter" ? "Search" : "Artist";
  const hasValue =
    props.mode === "filter" ? Boolean(displayQuery.trim()) : Boolean(selectedArtist || query);
  const activeSuggestedId = props.mode !== "filter" ? props.selectedArtistId : null;

  return (
    <div className="mt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/25">
        {sectionLabel}
      </p>

      <div ref={rootRef} className="relative max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          ref={inputRef}
          type="search"
          value={inputValue}
          onChange={(event) => {
            applyQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
            if (props.mode !== "filter" && props.selectedArtistId) props.onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search artists…"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
        />
        {hasValue && (
          <button
            type="button"
            onClick={clearArtist}
            aria-label="Clear artist search"
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
              <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No artists found</p>
            ) : (
              matches.map((artist, index) => (
                <button
                  key={artist.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pickArtist(artist)}
                  className={[
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition",
                    index === activeIndex ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                    {artist.avatarUrl ? (
                      <img src={artist.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{ background: coverFallback(artist.displayName) }}
                      />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate">{artist.displayName}</span>
                  <span className="shrink-0 text-xs text-white/30">{artist.songCount}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {suggestedArtists.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedArtists.map((artist) => {
            const active =
              props.mode === "filter"
                ? displayQuery.trim().toLowerCase() === artist.displayName.trim().toLowerCase()
                : activeSuggestedId === artist.id;
            return (
              <button
                key={artist.id}
                type="button"
                onClick={() =>
                  active
                    ? clearArtist()
                    : props.mode === "filter"
                      ? applyQuery(artist.displayName)
                      : pickArtist(artist)
                }
                className={[
                  "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs transition-colors",
                  active
                    ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90",
                ].join(" ")}
              >
                <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full">
                  {artist.avatarUrl ? (
                    <img src={artist.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ background: coverFallback(artist.displayName) }}
                    />
                  )}
                </div>
                <span className="max-w-[140px] truncate">{artist.displayName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
