import type { SubtitleSegment } from "./subtitles";

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

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

export function segmentsToSrt(segments: SubtitleSegment[]): string {
  if (!segments || segments.length === 0) return "";
  
  return segments
    .map((seg, i) => {
      const start = formatSrtTime(seg.start);
      const end = formatSrtTime(seg.end);
      return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join("\n");
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
  // Simple VTT to SRT. Strip WEBVTT header and convert timestamps.
  let srt = vttText.replace(/^WEBVTT.*\n\n/i, "");
  // Convert dot to comma for timestamps
  srt = srt.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, "$1,$2");
  return srt;
}

export function srtToVtt(srtText: string): string {
  let vtt = srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return "WEBVTT\n\n" + vtt;
}
