import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Users } from "lucide-react";

import { authedApi } from "@/lib/authedApi";
import { getAnonName } from "@/lib/radio/radioPlayback";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

const MAX_MSG_LENGTH = 300;
const TEXTAREA_MAX_H = 96;

function timeAgo(isoString: string) {
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  return `${Math.floor(diffMin / 60)}h`;
}

export function ChatPage() {
  const { user, accessToken } = useAuth();
  const { listenerId, station, nowPlaying, registerRadioUi, unregisterRadioUi } = useRadioPlayer();

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const queryClient = useQueryClient();

  const [chatMessage, setChatMessage] = useState("");

  usePageMeta({ title: "Radio Chat" });

  const displayName = user
    ? (user.displayName || user.username)
    : getAnonName(listenerId);

  const radioClient = useMemo(() => authedApi(accessToken), [accessToken]);

  const chatMessages = station?.chatMessages ?? [];

  useEffect(() => {
    registerRadioUi();
    return unregisterRadioUi;
  }, [registerRadioUi, unregisterRadioUi]);

  useEffect(() => {
    requestAnimationFrame(() =>
      chatBottomRef.current?.scrollIntoView({ behavior: "instant" }),
    );
  }, []);

  const prevMsgCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length === prevMsgCountRef.current) return;
    prevMsgCountRef.current = chatMessages.length;
    const el = chatScrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages.length]);

  const chatMutation = useMutation({
    mutationFn: ({ message, stationSlug }: { message: string; stationSlug: string }) =>
      radioClient.radio.sendChatMessage({
        listenerId,
        ...(user ? {} : { displayName }),
        message,
        station: stationSlug,
      }),
    onSuccess: () => {
      setChatMessage("");
      const ta = textareaRef.current;
      if (ta) { ta.style.height = "auto"; }
      queryClient.invalidateQueries({ queryKey: ["radio", "public"] });
    },
  });

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatMessage(e.target.value.slice(0, MAX_MSG_LENGTH));
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_H)}px`; }
  }

  function submitMessage() {
    const trimmed = chatMessage.trim();
    if (!trimmed || chatMutation.isPending) return;
    chatMutation.mutate({ message: trimmed, stationSlug: station?.slug ?? "main" });
  }

  const charsLeft = MAX_MSG_LENGTH - chatMessage.length;
  const showCharCount = chatMessage.length > MAX_MSG_LENGTH * 0.75;

  return (
    <div className="-mx-4 flex h-[calc(100dvh-var(--spacing-topbar)-var(--spacing-player-safe-mobile)-1.5rem)] flex-col bg-[var(--color-canvas)] md:-mx-8 md:h-[calc(100dvh-var(--spacing-topbar)-var(--spacing-player)-1.5rem)]">
      <header className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <MessageCircle size={20} className="shrink-0 text-[var(--color-brand)]" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-white">Radio chat</h1>
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                {station?.name ?? "Playlisted Radio"}
                {nowPlaying?.title ? ` · ${nowPlaying.title}` : ""}
              </p>
            </div>
          </div>
          {station?.listenerCount != null ? (
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--color-text-subtle)]">
              <Users size={14} />
              {station.listenerCount} online
            </div>
          ) : null}
        </div>
      </header>

      <div
        ref={chatScrollRef}
        className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-px overflow-y-auto px-4 py-3 md:px-6"
      >
        {chatMessages.length === 0 ? (
          <p className="m-auto text-sm text-[var(--color-text-subtle)]">No messages yet — say hi!</p>
        ) : (
          chatMessages.map((item) => (
            <div
              key={item.id}
              className="group rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03] sm:px-4"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-white">{item.displayName}</span>
                <span className="text-xs text-[var(--color-text-subtle)] opacity-0 transition-opacity group-hover:opacity-100">
                  {timeAgo(item.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 break-words text-base leading-6 text-[var(--color-text-muted)]">
                {item.message}
              </p>
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 md:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-2.5 flex items-center justify-between text-xs text-[var(--color-text-subtle)]">
            <div className="flex items-center gap-1.5">
              <span>Posting as</span>
              <span className="font-semibold text-white">{displayName}</span>
              {user ? (
                <span className="rounded-full bg-[var(--color-brand)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand)]">
                  member
                </span>
              ) : (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-text-subtle)]">
                  guest
                </span>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); submitMessage(); }}
            className="flex items-end gap-3"
          >
            <div className="relative min-w-0 flex-1">
              <textarea
                ref={textareaRef}
                value={chatMessage}
                onChange={handleMessageChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(); }
                }}
                placeholder="Say something…"
                rows={1}
                className="block w-full resize-none rounded-xl border border-[var(--color-border)] bg-black/30 px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)] focus:bg-black/40"
                style={{ minHeight: "48px", maxHeight: `${TEXTAREA_MAX_H}px` }}
              />
              {showCharCount ? (
                <span
                  className={`pointer-events-none absolute bottom-3 right-3 text-[11px] tabular-nums ${charsLeft <= 0 ? "text-red-400" : "text-[var(--color-text-subtle)]"
                    }`}
                >
                  {charsLeft}
                </span>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={!chatMessage.trim() || chatMutation.isPending}
              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand)] text-white transition hover:brightness-110 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
          {chatMutation.isError ? (
            <p className="mt-2 text-xs text-red-400">Message didn&apos;t send. Try again.</p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
