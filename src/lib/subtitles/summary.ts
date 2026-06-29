import type { SubtitleStatus } from "@prisma/client";

type SubtitleLike = {
  status: SubtitleStatus;
  language: string | null;
  generatedAt: Date | string | null;
} | null | undefined;

export function mapSubtitleSummary(subtitle: SubtitleLike) {
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
    select: {
      status: true,
      language: true,
      generatedAt: true,
    },
  } as const;
}
