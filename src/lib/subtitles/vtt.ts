export type SubtitleSegment = {
  start: number;
  end: number;
  text: string;
};

function timestamp(seconds: number) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function segmentsToVtt(segments: SubtitleSegment[]) {
  const cues = segments
    .filter((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.text.trim())
    .map((segment, index) => [
      String(index + 1),
      `${timestamp(segment.start)} --> ${timestamp(segment.end)}`,
      segment.text.trim(),
    ].join("\n"));

  return ["WEBVTT", ...cues].join("\n\n") + "\n";
}
