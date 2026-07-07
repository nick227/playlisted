import { useEffect, useState } from "react";

import { fetchRecordingSubtitles } from "@/lib/subtitles";

function pickSnippet(segments: { text: string }[]): string | null {
  const trimmed = segments.map((segment) => segment.text.trim()).filter(Boolean);
  if (trimmed.length === 0) return null;
  const rich = trimmed.find((line) => line.length >= 24);
  return rich ?? trimmed[0];
}

export function useLyricSnippet(recordingId: string, enabled: boolean, fallback?: string | null) {
  const [line, setLine] = useState<string | null>(fallback?.trim() || null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void fetchRecordingSubtitles(recordingId)
      .then((response) => {
        if (cancelled) return;
        const snippet = response.segments ? pickSnippet(response.segments) : null;
        if (snippet) setLine(snippet);
      })
      .catch(() => {
        if (!cancelled && fallback?.trim()) setLine(fallback.trim());
      });

    return () => {
      cancelled = true;
    };
  }, [recordingId, enabled, fallback]);

  return line;
}
