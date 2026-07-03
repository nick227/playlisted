export type ChatSegment =
  | { type: "text"; value: string }
  | { type: "youtube"; videoId: string; url: string };

const YOUTUBE_ID = /[\w-]{11}/;

const YOUTUBE_HOST =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

export function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_HOST);
  const id = match?.[1];
  return id && YOUTUBE_ID.test(id) ? id : null;
}

export function parseChatMessage(message: string): ChatSegment[] {
  const segments: ChatSegment[] = [];
  const urlPattern = /https?:\/\/[^\s]+/g;
  let lastIndex = 0;

  for (const match of message.matchAll(urlPattern)) {
    const url = match[0];
    const index = match.index ?? 0;
    const videoId = extractYouTubeVideoId(url);

    if (index > lastIndex) {
      segments.push({ type: "text", value: message.slice(lastIndex, index) });
    }

    if (videoId) {
      segments.push({ type: "youtube", videoId, url });
    } else {
      segments.push({ type: "text", value: url });
    }

    lastIndex = index + url.length;
  }

  if (lastIndex < message.length) {
    segments.push({ type: "text", value: message.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: message }];
}
