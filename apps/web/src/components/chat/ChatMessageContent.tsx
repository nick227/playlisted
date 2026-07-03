import { parseChatMessage } from "@/lib/chat/youtube";

function ChatText({ value }: { value: string }) {
  if (!value) return null;
  return <span className="whitespace-pre-wrap break-words">{value}</span>;
}

function YouTubeEmbed({ videoId, url }: { videoId: string; url: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
      <div className="aspect-video w-full max-w-md">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="block truncate px-3 py-2 text-xs text-[var(--color-text-subtle)] transition hover:text-[var(--color-brand)]"
      >
        {url}
      </a>
    </div>
  );
}

export function ChatMessageContent({ message }: { message: string }) {
  const segments = parseChatMessage(message);

  return (
    <div className="text-[0.95rem] leading-7 text-[var(--color-text-muted)]">
      {segments.map((segment, index) => {
        if (segment.type === "youtube") {
          return <YouTubeEmbed key={`${segment.videoId}-${index}`} videoId={segment.videoId} url={segment.url} />;
        }
        return <ChatText key={`text-${index}`} value={segment.value} />;
      })}
    </div>
  );
}
