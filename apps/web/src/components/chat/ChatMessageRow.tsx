import type { RadioChatMessage } from "@playlisted/client-sdk";

import { formatChatDate } from "@/lib/chat/formatChatDate";

import { ChatAvatar } from "./ChatAvatar";
import { ChatMessageContent } from "./ChatMessageContent";

export function ChatMessageRow({ message }: { message: RadioChatMessage }) {
  return (
    <article className="flex gap-3 py-4">
      <ChatAvatar displayName={message.displayName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-white">{message.displayName}</span>
          <time
            dateTime={message.createdAt}
            className="text-xs tabular-nums text-[var(--color-text-subtle)]"
          >
            {formatChatDate(message.createdAt)}
          </time>
        </div>
        <ChatMessageContent message={message.message} />
      </div>
    </article>
  );
}
