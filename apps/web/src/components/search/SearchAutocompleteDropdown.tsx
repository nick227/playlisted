import { Clock, ListMusic, Music2, Search, Tag, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { HighlightMatch } from "@/components/search/HighlightMatch";
import type { SearchSuggestionGroup, SearchSuggestionOption } from "@/components/search/searchAutocompleteModel";
import { coverFallback } from "@/lib/routes";

const KIND_ICON: Record<SearchSuggestionOption["kind"], LucideIcon> = {
  song: Music2,
  playlist: ListMusic,
  artist: User,
  genre: Tag,
  recent: Clock,
  "view-all": Search,
};

interface SearchAutocompleteDropdownProps {
  listboxId: string;
  query: string;
  groups: SearchSuggestionGroup[];
  activeIndex: number;
  status: "idle" | "loading" | "empty" | "error";
  showRecentHint: boolean;
  onSelect: (option: SearchSuggestionOption) => void;
  onHighlight: (index: number) => void;
}

export function SearchAutocompleteDropdown({
  listboxId,
  query,
  groups,
  activeIndex,
  status,
  showRecentHint,
  onSelect,
  onHighlight,
}: SearchAutocompleteDropdownProps) {
  let optionOffset = 0;

  return (
    <div
      id={listboxId}
      role="listbox"
      className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(24rem,70vh)] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-2 shadow-2xl"
    >
      {status === "loading" ? (
        <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">Searching…</p>
      ) : null}
      {status === "error" ? (
        <p className="px-4 py-3 text-sm text-red-300">Couldn&apos;t load suggestions</p>
      ) : null}
      {showRecentHint ? (
        <p className="px-4 py-2 text-xs text-[var(--color-text-subtle)]">Start typing to search</p>
      ) : null}
      {status === "empty" && query.trim() ? (
        <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No matches found</p>
      ) : null}

      {groups.map((group) => {
        const groupStart = optionOffset;
        const nodes = group.options.map((option, groupIndex) => {
          const flatIndex = groupStart + groupIndex;
          optionOffset += 1;
          const isActive = flatIndex === activeIndex;
          const Icon = KIND_ICON[option.kind];
          const isViewAll = option.kind === "view-all";

          return (
            <div
              key={option.id}
              id={`${listboxId}-option-${flatIndex}`}
              role="option"
              aria-selected={isActive}
              className={[
                "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition",
                isActive
                  ? "border-l-2 border-[var(--color-brand)] bg-white/10 text-white"
                  : "border-l-2 border-transparent text-white hover:bg-white/5",
                isViewAll ? "mt-1 border-t border-[var(--color-border)] pt-3" : "",
              ].join(" ")}
              onMouseEnter={() => onHighlight(flatIndex)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(option)}
            >
              {isViewAll ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--color-text-muted)]">
                  <Icon size={18} />
                </span>
              ) : (
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md">
                  {option.imageUrl ? (
                    <img src={option.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className="block h-full w-full"
                      style={{ background: coverFallback(option.label) }}
                      aria-hidden
                    />
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
                    <Icon size={10} />
                  </span>
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  <HighlightMatch text={option.label} query={query} />
                </span>
                {option.meta ? (
                  <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">{option.meta}</span>
                ) : null}
              </span>
            </div>
          );
        });

        return (
          <div key={group.label || "view-all"} role="presentation">
            {group.label ? (
              <p className="px-4 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                {group.label}
              </p>
            ) : null}
            {nodes}
          </div>
        );
      })}

    </div>
  );
}
