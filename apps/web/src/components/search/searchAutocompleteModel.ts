import type { SearchSuggestionsResponse } from "@playlisted/client-sdk";

export const SEARCH_DEBOUNCE_MS = 250;
export const SUGGESTION_PAGE_SIZE = 5;

export type SearchSuggestionKind = "song" | "playlist" | "artist" | "genre" | "recent" | "view-all";

export interface SearchSuggestionOption {
  id: string;
  kind: SearchSuggestionKind;
  label: string;
  meta?: string;
  href: string;
  imageUrl?: string | null;
}

export interface SearchSuggestionGroup {
  label: string;
  options: SearchSuggestionOption[];
}

export function buildRecentGroups(recentSearches: string[]): SearchSuggestionGroup[] {
  if (recentSearches.length === 0) return [];
  return [
    {
      label: "Recent searches",
      options: recentSearches.map((term, index) => ({
        id: `recent-${index}-${term}`,
        kind: "recent",
        label: term,
        href: `/search?q=${encodeURIComponent(term)}`,
      })),
    },
  ];
}

export function buildSuggestionGroups(query: string, raw: SearchSuggestionsResponse): SearchSuggestionGroup[] {
  const groups: SearchSuggestionGroup[] = raw.groups.map((group) => ({
    label: group.label,
    options: group.options.map((option) => ({
      id: option.id,
      kind: option.kind,
      label: option.label,
      meta: option.meta,
      href: option.href,
      imageUrl: option.imageUrl,
    })),
  }));
  const trimmed = query.trim();
  if (!trimmed) return groups;

  groups.push({
    label: "",
    options: [
      {
        id: "view-all",
        kind: "view-all",
        label: `View all results for "${trimmed}"`,
        href: `/search?q=${encodeURIComponent(trimmed)}`,
      },
    ],
  });

  return groups;
}

export function flattenGroups(groups: SearchSuggestionGroup[]): SearchSuggestionOption[] {
  return groups.flatMap((group) => group.options);
}
