import type { LibraryGenre } from "@playlisted/client-sdk";

interface LibraryGenreFilterProps {
  genres: LibraryGenre[];
  value: string | null;
  onChange: (slug: string | null) => void;
}

const chipClass = (active: boolean) =>
  [
    "rounded-full border px-3 py-1.5 text-xs transition-colors",
    active
      ? "border-[var(--color-brand)]/50 bg-[var(--color-brand)]/15 text-white"
      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90",
  ].join(" ");

export function LibraryGenreFilter({ genres, value, onChange }: LibraryGenreFilterProps) {
  if (genres.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/25">Genre</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(null)} className={chipClass(value === null)}>
          All
        </button>
        {genres.map((genre) => (
          <button
            key={genre.slug}
            type="button"
            onClick={() => onChange(value === genre.slug ? null : genre.slug)}
            className={chipClass(value === genre.slug)}
          >
            {genre.name}
          </button>
        ))}
      </div>
    </div>
  );
}
