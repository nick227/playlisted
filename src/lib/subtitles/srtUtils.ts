import { type SubtitleSegment } from "./vtt.js";

function parseSrtTime(timeStr: string): number {
  const normalized = timeStr.trim().replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) return 0;
  
  const hasHours = parts.length === 3;
  const h = hasHours ? parseInt(parts[0], 10) : 0;
  const m = parseInt(parts[hasHours ? 1 : 0], 10);
  
  const secParts = parts[hasHours ? 2 : 1].split(".");
  const s = parseInt(secParts[0], 10);
  const ms = secParts.length > 1 ? parseInt(secParts[1], 10) : 0;
  
  return h * 3600 + m * 60 + s + ms / 1000;
}

export function srtToSegments(srtText: string): SubtitleSegment[] {
  if (!srtText) return [];
  
  const segments: SubtitleSegment[] = [];
  const blocks = srtText
    .replace(/^\uFEFF/, "")
    .replace(/^WEBVTT[^\n]*(?:\n|\r\n)?/i, "")
    .trim()
    .split(/\r?\n\s*\r?\n/);
  
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    
    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex < 0) continue;
    const timeLine = lines[timeLineIndex];
    const timeParts = timeLine.split("-->");
    if (timeParts.length !== 2) continue;
    
    const start = parseSrtTime(timeParts[0]);
    const end = parseSrtTime(timeParts[1].trim().split(/\s+/)[0]);
    const text = lines.slice(timeLineIndex + 1).join("\n");
    if (!text.trim() || end <= start) continue;
    
    segments.push({ start, end, text });
  }
  
  return segments;
}

export function vttToSrt(vttText: string): string {
  let srt = vttText.replace(/^WEBVTT.*\n\n/i, "");
  srt = srt.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, "$1,$2");
  return srt;
}
