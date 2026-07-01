import { type SubtitleSegment } from "./vtt.js";

function parseSrtTime(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  if (parts.length !== 3) return 0;
  
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  
  const secParts = parts[2].split(",");
  const s = parseInt(secParts[0], 10);
  const ms = secParts.length > 1 ? parseInt(secParts[1], 10) : 0;
  
  return h * 3600 + m * 60 + s + ms / 1000;
}

export function srtToSegments(srtText: string): SubtitleSegment[] {
  if (!srtText) return [];
  
  const segments: SubtitleSegment[] = [];
  const blocks = srtText.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim());
    if (lines.length < 3) continue; // index, times, text
    
    const timeLine = lines[1];
    const timeParts = timeLine.split("-->");
    if (timeParts.length !== 2) continue;
    
    const start = parseSrtTime(timeParts[0]);
    const end = parseSrtTime(timeParts[1]);
    const text = lines.slice(2).join("\n");
    
    segments.push({ start, end, text });
  }
  
  return segments;
}

export function vttToSrt(vttText: string): string {
  let srt = vttText.replace(/^WEBVTT.*\n\n/i, "");
  srt = srt.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, "$1,$2");
  return srt;
}
