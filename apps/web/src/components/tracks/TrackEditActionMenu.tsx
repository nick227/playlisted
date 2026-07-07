import { Captions, Check, ChevronDown, ChevronUp, Film, ImagePlus, MoreVertical, Search, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import type { GenreOption } from "@/components/studio/studioCollectionUtils";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";

type SubtitleSummary = QueueTrack["subtitle"];

type TrackEditActionMenuProps = {
  title: string;
  subtitle?: SubtitleSummary | null;
  visualAttachmentCount: number;
  genreOptions?: GenreOption[];
  genreSelectValue: string;
  playlistGenreSlug?: string | null;
  genreLoading?: boolean;
  saving?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onChangeImage?: () => void;
  onEditSubtitles: () => void;
  onEditVisuals: () => void;
  onGenreSelect?: (slug: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
};

function subtitleMenuLabel(subtitle?: SubtitleSummary | null) {
  const status = subtitle?.status ?? "NOT_SET";
  if (status === "READY") return "Edit subtitles";
  if (status === "QUEUED" || status === "PROCESSING") return "Edit subtitles (processing)";
  if (status === "FAILED") return "Edit subtitles (failed)";
  if (status === "DISABLED") return "Edit subtitles (off)";
  return "Edit subtitles";
}

function MenuDivider() {
  return <div className="my-1 border-t border-white/10" role="separator" />;
}

type MenuButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  trailing?: ReactNode;
};

function MenuButton({ label, icon, onClick, disabled, destructive, trailing }: MenuButtonProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
      className={[
        "flex w-full min-h-[2.75rem] items-center gap-2.5 px-3 py-2 text-left text-sm transition",
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/10",
        destructive ? "text-red-400" : "text-white",
      ].join(" ")}
    >
      <span className={`shrink-0 ${destructive ? "text-red-400" : "text-[var(--color-text-muted)]"}`}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

export function TrackEditActionMenu({
  title,
  subtitle,
  visualAttachmentCount,
  genreOptions,
  genreSelectValue,
  playlistGenreSlug,
  genreLoading,
  saving,
  canMoveUp,
  canMoveDown,
  onChangeImage,
  onEditSubtitles,
  onEditVisuals,
  onGenreSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
}: TrackEditActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const genreDisabled = saving || genreLoading;
  const showGenre = Boolean(onGenreSelect && genreOptions);

  const defaultGenreName = playlistGenreSlug
    ? genreOptions?.find((genre) => genre.slug === playlistGenreSlug)?.name ?? playlistGenreSlug
    : "playlist default";

  const genreQuery = genreSearch.trim().toLowerCase();
  const filteredGenres = useMemo(() => {
    if (!genreOptions) return [];
    if (!genreQuery) return genreOptions;
    return genreOptions.filter(
      (genre) =>
        genre.name.toLowerCase().includes(genreQuery) || genre.slug.toLowerCase().includes(genreQuery),
    );
  }, [genreOptions, genreQuery]);

  const showDefaultGenre =
    !genreQuery ||
    "default".includes(genreQuery) ||
    defaultGenreName.toLowerCase().includes(genreQuery);

  useEffect(() => {
    if (!open) {
      setGenreSearch("");
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function runAction(action: () => void) {
    setOpen(false);
    action();
  }

  function handleGenreSelect(nextSlug: string) {
    if (genreDisabled || nextSlug === genreSelectValue) return;
    runAction(() => onGenreSelect?.(nextSlug));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Track actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-md",
          "text-[var(--color-text-muted)] transition hover:bg-white/10 hover:text-white",
          open ? "bg-white/10 text-white" : "",
        ].join(" ")}
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 max-h-[min(70vh,24rem)] min-w-[12rem] overflow-y-auto rounded-lg border border-white/10 bg-[var(--color-surface-elevated)] py-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {onChangeImage ? (
            <MenuButton
              label="Change image"
              icon={<ImagePlus size={16} />}
              onClick={() => runAction(onChangeImage)}
            />
          ) : null}
          <MenuButton
            label={subtitleMenuLabel(subtitle)}
            icon={<Captions size={16} />}
            onClick={() => runAction(onEditSubtitles)}
          />
          <MenuButton
            label={visualAttachmentCount > 0 ? `Edit visuals (${visualAttachmentCount})` : "Edit visuals"}
            icon={<Film size={16} />}
            onClick={() => runAction(onEditVisuals)}
          />

          <MenuDivider />
          <MenuButton
            label="Move up"
            icon={<ChevronUp size={16} />}
            disabled={!canMoveUp}
            onClick={() => runAction(() => onMoveUp?.())}
          />
          <MenuButton
            label="Move down"
            icon={<ChevronDown size={16} />}
            disabled={!canMoveDown}
            onClick={() => runAction(() => onMoveDown?.())}
          />

          <MenuDivider />
          <MenuButton
            label="Remove track"
            icon={<Trash2 size={16} />}
            destructive
            onClick={() => runAction(() => onRemove?.())}
          />

          {showGenre ? (
            <>
              <MenuDivider />
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
                Genre
              </p>
              <div className="px-2 pb-1">
                <label className="relative block">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                  />
                  <input
                    type="search"
                    value={genreSearch}
                    onChange={(event) => setGenreSearch(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    placeholder="Search genres…"
                    aria-label="Search genres"
                    className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-2 text-sm text-white placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-brand)]"
                  />
                </label>
              </div>
              {showDefaultGenre ? (
                <MenuButton
                  label={`Default (${defaultGenreName})`}
                  icon={<span className="inline-block w-4" />}
                  disabled={genreDisabled}
                  trailing={
                    genreSelectValue === "" ? (
                      <Check size={14} className="shrink-0 text-[var(--color-brand)]" />
                    ) : null
                  }
                  onClick={() => handleGenreSelect("")}
                />
              ) : null}
              {filteredGenres.map((genre) => (
                <MenuButton
                  key={genre.id}
                  label={genre.name}
                  icon={<span className="inline-block w-4" />}
                  disabled={genreDisabled}
                  trailing={
                    genreSelectValue === genre.slug ? (
                      <Check size={14} className="shrink-0 text-[var(--color-brand)]" />
                    ) : null
                  }
                  onClick={() => handleGenreSelect(genre.slug)}
                />
              ))}
              {genreQuery && !showDefaultGenre && filteredGenres.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No genres found</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
