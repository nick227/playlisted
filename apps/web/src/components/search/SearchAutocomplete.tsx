import { Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { SearchAutocompleteDropdown } from "@/components/search/SearchAutocompleteDropdown";
import {
  SEARCH_DEBOUNCE_MS,
  SUGGESTION_PAGE_SIZE,
  buildRecentGroups,
  buildResultGroups,
  flattenGroups,
} from "@/components/search/searchAutocompleteModel";
import type { SearchSuggestionOption } from "@/components/search/searchAutocompleteModel";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { api } from "@/lib/api";
import { pushRecentSearch, readRecentSearches } from "@/lib/recentSearches";

interface SearchAutocompleteProps {
  className?: string;
}

export function SearchAutocomplete({ className = "" }: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const listboxId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const hasQuery = trimmedQuery.length > 0;

  const {
    data,
    isLoading,
    isError,
    isFetching,
  } = useQuery({
    queryKey: ["search", "suggest", trimmedQuery],
    queryFn: () => api.search.unified({ q: trimmedQuery, pageSize: SUGGESTION_PAGE_SIZE }),
    enabled: open && hasQuery,
    staleTime: 30_000,
  });

  const recentGroups = buildRecentGroups(recentSearches);
  const resultGroups = hasQuery && data ? buildResultGroups(trimmedQuery, data) : [];
  const groups = hasQuery ? resultGroups : recentGroups;
  const flatOptions = flattenGroups(groups);
  const resultCount =
    (data?.songs.length ?? 0) +
    (data?.artists.length ?? 0) +
    (data?.playlists.length ?? 0) +
    (data?.genres.length ?? 0);

  const showPanel = open;
  const loading = hasQuery && (isLoading || isFetching) && !data;
  const status =
    loading ? "loading" : isError ? "error" : hasQuery && resultCount === 0 && !loading ? "empty" : "idle";
  const showRecentHint = showPanel && !hasQuery && recentSearches.length > 0;

  const goToSearch = useCallback(
    (term: string) => {
      const q = term.trim();
      if (!q) return;
      setRecentSearches(pushRecentSearch(q));
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setOpen(false);
      setActiveIndex(-1);
    },
    [navigate],
  );

  const selectOption = useCallback(
    (option: SearchSuggestionOption) => {
      if (option.kind === "view-all") {
        goToSearch(trimmedQuery || query);
        return;
      }
      if (option.kind === "recent") {
        goToSearch(option.label);
        return;
      }
      setRecentSearches(pushRecentSearch(trimmedQuery || option.label));
      navigate(option.href);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [goToSearch, navigate, query, trimmedQuery],
  );

  useEffect(() => {
    if (!showPanel) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showPanel]);

  useEffect(() => {
    setActiveIndex((index) => {
      if (flatOptions.length === 0) return -1;
      if (index < 0) return -1;
      return Math.min(index, flatOptions.length - 1);
    });
  }, [flatOptions.length, trimmedQuery]);

  function handleSubmit() {
    if (activeIndex >= 0 && flatOptions[activeIndex]) {
      selectOption(flatOptions[activeIndex]);
      return;
    }
    goToSearch(query);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showPanel && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!showPanel) setOpen(true);
        setActiveIndex((index) => (flatOptions.length === 0 ? -1 : (index + 1) % flatOptions.length));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!showPanel) setOpen(true);
        setActiveIndex((index) =>
          flatOptions.length === 0 ? -1 : index <= 0 ? flatOptions.length - 1 : index - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        handleSubmit();
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
      case "Tab":
        setOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  }

  const activeDescendant =
    activeIndex >= 0 && flatOptions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <form
      ref={rootRef}
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--color-text-subtle)]"
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-haspopup="listbox"
        autoComplete="off"
        placeholder="Search songs, playlists, artists..."
        className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-[var(--color-text-subtle)] outline-none focus:border-white/20"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showPanel ? (
        <SearchAutocompleteDropdown
          listboxId={listboxId}
          query={trimmedQuery || query}
          groups={groups}
          flatOptions={flatOptions}
          activeIndex={activeIndex}
          status={status}
          showRecentHint={showRecentHint}
          onSelect={selectOption}
          onHighlight={setActiveIndex}
        />
      ) : null}
    </form>
  );
}
