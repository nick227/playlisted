import { Link } from "react-router-dom";

import { coverFallback } from "@/lib/routes";

interface FeatureCardProps {
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  href: string;
  cta?: string;
}

export function FeatureCard({ title, summary, imageUrl, href, cta = "Read more" }: FeatureCardProps) {
  return (
    <Link
      to={href}
      className="group relative flex h-48 w-72 shrink-0 flex-col justify-end overflow-hidden rounded-xl transition hover:opacity-95"
      style={{
        background: imageUrl
          ? `linear-gradient(to top, #0c1016, transparent 40%), url(${imageUrl}) center/cover`
          : coverFallback(title),
      }}
    >
      <div className="p-4">
        <p className="text-sm font-semibold text-white line-clamp-2">{title}</p>
        {summary ? (
          <p className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-2">{summary}</p>
        ) : null}
        <span className="mt-2 inline-block text-xs font-medium text-[var(--color-brand)]">{cta}</span>
      </div>
    </Link>
  );
}
