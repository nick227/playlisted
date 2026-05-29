import { formatPlayCount, formatProfileDate } from "@/lib/format";

import type { UploadMilestone } from "./artistProfileUtils";

type ArtistProfileTimelineProps = {
  milestones: UploadMilestone[];
  accentHue: number;
  onSelect?: (id: string) => void;
};

export function ArtistProfileTimeline({ milestones, accentHue, onSelect }: ArtistProfileTimelineProps) {
  if (milestones.length === 0) return null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">Release dates</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Key uploads across the catalog</p>
      </div>

      <ol className="relative space-y-0 border-l border-white/10 pl-8">
        {milestones.map((item, index) => (
          <li key={item.id} className="relative pb-8 last:pb-0">
            <span
              className="absolute -left-[calc(2rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--color-canvas)]"
              style={{ background: `hsl(${(accentHue + index * 25) % 360} 75% 58%)` }}
            />
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              className="group w-full text-left transition hover:translate-x-1"
            >
              <time className="text-xs font-semibold tracking-wide text-[var(--color-text-subtle)] uppercase">
                {formatProfileDate(item.date)}
              </time>
              <p className="mt-1 text-lg font-bold text-white group-hover:text-[var(--color-brand)]">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {item.playlistTitle}
                {item.playCount > 0 ? ` · ${formatPlayCount(item.playCount)} streams` : ""}
              </p>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
