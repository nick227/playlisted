import type { SubtitleStatus } from "@prisma/client";

type SubtitleLike = {
  status: SubtitleStatus;
  language: string | null;
  generatedAt: Date | string | null;
} | null | undefined;

export function mapSubtitleSummary(subtitles: SubtitleLike[] | SubtitleLike) {
  const subtitle = Array.isArray(subtitles) ? subtitles[0] : subtitles;
  if (!subtitle) return null;

  return {
    status: subtitle.status,
    language: subtitle.language,
    generatedAt:
      subtitle.generatedAt instanceof Date
        ? subtitle.generatedAt.toISOString()
        : subtitle.generatedAt ?? null,
  };
}

export function subtitleInclude() {
  return {
    orderBy: [{ isActive: "desc" as const }, { createdAt: "desc" as const }],
    take: 1,
    select: {
      status: true,
      language: true,
      generatedAt: true,
    },
  };
}
