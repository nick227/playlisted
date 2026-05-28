import { Play } from "lucide-react";
import { Link } from "react-router-dom";

import { coverFallback } from "@/lib/routes";

interface HeroSpotlightProps {
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  href: string;
  onPlay?: () => void;
}

export function HeroSpotlight({ title, summary, imageUrl, href, onPlay }: HeroSpotlightProps) {
  const bg = imageUrl ? `url(${imageUrl})` : coverFallback(title);

  return (
    <section
      className="relative mb-10 overflow-hidden rounded-2xl"
      style={{
        background: imageUrl
          ? `linear-gradient(to top, #0c1016 0%, transparent 50%), url(${imageUrl}) center/cover`
          : bg,
        minHeight: "280px",
      }}
    >
      <div className="flex min-h-[280px] flex-col justify-end bg-gradient-to-t from-[var(--color-canvas)] via-[var(--color-canvas)]/60 to-transparent p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Featured
        </p>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {summary ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
            {summary}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {onPlay ? (
            <button
              type="button"
              onClick={onPlay}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              <Play size={18} fill="currentColor" />
              Play
            </button>
          ) : null}
          <Link
            to={href}
            className="inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            View details
          </Link>
        </div>
      </div>
    </section>
  );
}
