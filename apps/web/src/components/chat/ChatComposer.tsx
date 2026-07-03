import { useEffect, useRef } from "react";
import { Send, Users } from "lucide-react";

const MAX_MSG_LENGTH = 300;
const TEXTAREA_MAX_H = 96;

interface ChatComposerProps {
  chatMessage: string;
  displayName: string;
  isMember: boolean;
  listenerCount?: number | null;
  isPending: boolean;
  isError: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ChatComposer({
  chatMessage,
  displayName,
  isMember,
  listenerCount,
  isPending,
  isError,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const charsLeft = MAX_MSG_LENGTH - chatMessage.length;
  const showCharCount = chatMessage.length > MAX_MSG_LENGTH * 0.75;

  useEffect(() => {
    if (!chatMessage && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [chatMessage]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value.slice(0, MAX_MSG_LENGTH));
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_H)}px`;
  }

  return (
    <footer className="shrink-0 border-t border-white/[0.06] bg-[var(--color-canvas)]/95 px-4 py-4 backdrop-blur-md md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-subtle)]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>Posting as</span>
            <span className="font-semibold text-white">{displayName}</span>
            {isMember ? (
              <span className="rounded-full bg-[var(--color-brand)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand)]">
                member
              </span>
            ) : (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-text-subtle)]">
                guest
              </span>
            )}
          </div>
          {listenerCount != null ? (
            <div className="flex items-center gap-1.5 font-medium text-white/55">
              <Users size={14} />
              {listenerCount} online
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          className="flex items-end gap-3"
        >
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={chatMessage}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
              }}
              placeholder="Say something… YouTube links welcome."
              rows={1}
              className="block w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)]/50 focus:bg-white/[0.06]"
              style={{ minHeight: "52px", maxHeight: `${TEXTAREA_MAX_H}px` }}
            />
            {showCharCount ? (
              <span
                className={`pointer-events-none absolute bottom-3 right-3 text-[11px] tabular-nums ${
                  charsLeft <= 0 ? "text-red-400" : "text-[var(--color-text-subtle)]"
                }`}
              >
                {charsLeft}
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={!chatMessage.trim() || isPending}
            className="mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand)] text-white transition hover:brightness-110 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send size={17} />
          </button>
        </form>
        {isError ? (
          <p className="mt-2 text-xs text-red-400">Message didn&apos;t send. Try again.</p>
        ) : null}
      </div>
    </footer>
  );
}
