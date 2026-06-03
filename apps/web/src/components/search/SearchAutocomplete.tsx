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
import { normalizeSearchResponse } from "@/lib/searchResults";
import { pushRecentSearch, readRecentSearches } from "@/lib/recentSearches";

interface SearchAutocompleteProps {
  className?: string;
  /**
   * Mobile-only collapsible mode (TopBar). Ignored from `sm` breakpoint up — input is always shown.
   * When false, renders a search icon button; when true, renders the full combobox.
   */
  mobileExpanded?: boolean;
  onMobileExpandedChange?: (expanded: boolean) => void;
}

const MOBILE_SEARCH_TRANSITION =
  "transition-[width,opacity,transform] duration-300 ease-out motion-reduce:transition-none";

const iconButtonClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white";

export function SearchAutocomplete({
  className = "",
  mobileExpanded = true,
  onMobileExpandedChange,
}: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const listboxId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const collapsibleMobile = Boolean(onMobileExpandedChange);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const hasQuery = trimmedQuery.length > 0;

  const collapseMobile = useCallback(() => {
    if (!collapsibleMobile || !mobileExpanded) return;
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    onMobileExpandedChange?.(false);
  }, [collapsibleMobile, mobileExpanded, onMobileExpandedChange]);

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
    select: normalizeSearchResponse,
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

  const hasSuggestions = hasQuery || recentSearches.length > 0;
  const loading = hasQuery && (isLoading || isFetching) && !data;
  const status =
    loading ? "loading" : isError ? "error" : hasQuery && resultCount === 0 && !loading ? "empty" : "idle";
  const showRecentHint = open && !hasQuery && recentSearches.length > 0;
  /** Skip the dropdown when focused with nothing to show (avoids empty "no recent searches" panel). */
  const showPanel = open && (hasSuggestions || loading || isError || status === "empty");

  const goToSearch = useCallback(
    (term: string) => {
      const q = term.trim();
      if (!q) return;
      setRecentSearches(pushRecentSearch(q));
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setOpen(false);
      setActiveIndex(-1);
      onMobileExpandedChange?.(false);
    },
    [navigate, onMobileExpandedChange],
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
      onMobileExpandedChange?.(false);
    },
    [goToSearch, navigate, query, trimmedQuery, onMobileExpandedChange],
  );

  useEffect(() => {
    if (!mobileExpanded || !collapsibleMobile) return;
    inputRef.current?.focus();
  }, [collapsibleMobile, mobileExpanded]);

  useEffect(() => {
    if (!showPanel) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        if (collapsibleMobile && !query.trim()) {
          onMobileExpandedChange?.(false);
        }
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [collapsibleMobile, onMobileExpandedChange, query, showPanel]);

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
        if (collapsibleMobile && !query.trim()) {
          collapseMobile();
        }
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

  const showMobileTrigger = collapsibleMobile && !mobileExpanded;
  const showMobileForm = !collapsibleMobile || mobileExpanded;

  return (
    <div className={`relative flex min-w-0 items-center ${className}`}>
      {/* Mobile closed: icon trigger. Hidden on sm+ and when the combobox is expanded. */}
      <button
        type="button"
        onClick={() => onMobileExpandedChange?.(true)}
        className={`${iconButtonClass} ${MOBILE_SEARCH_TRANSITION} sm:hidden ${
          showMobileTrigger
            ? "scale-100 opacity-100"
            : "pointer-events-none absolute scale-75 opacity-0"
        }`}
        aria-label="Open search"
        aria-hidden={!showMobileTrigger}
        tabIndex={showMobileTrigger ? 0 : -1}
      >
        <Search size={20} />
      </button>

      {/* Mobile open + desktop: full combobox. Width animates from icon size on mobile. */}
      <form
        ref={rootRef}
        className={`relative min-w-0 ${MOBILE_SEARCH_TRANSITION} sm:w-full! sm:opacity-100! sm:translate-x-0! ${
          showMobileForm
            ? "flex flex-1 max-sm:w-full max-sm:translate-x-0 max-sm:opacity-100"
            : "max-sm:hidden sm:flex sm:flex-1"
        }`}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        aria-hidden={collapsibleMobile && !mobileExpanded}
      >
        <Search
          size={18}
          className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--color-text-subtle)] ${MOBILE_SEARCH_TRANSITION} ${
            showMobileForm ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
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
          tabIndex={showMobileForm ? 0 : -1}
          className={`w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-[var(--color-text-subtle)] outline-none focus:border-white/20 ${MOBILE_SEARCH_TRANSITION} ${
            showMobileForm ? "max-sm:opacity-100" : "max-sm:opacity-0"
          }`}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (recentSearches.length > 0 || query.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {showPanel && showMobileForm ? (
          <SearchAutocompleteDropdown
            listboxId={listboxId}
            query={trimmedQuery || query}
            groups={groups}
            activeIndex={activeIndex}
            status={status}
            showRecentHint={showRecentHint}
            onSelect={selectOption}
            onHighlight={setActiveIndex}
          />
        ) : null}
      </form>
    </div>
  );
}
