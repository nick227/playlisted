import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageRow } from "@/components/chat/ChatMessageRow";
import { authedApi } from "@/lib/authedApi";
import { getAnonName } from "@/lib/radio/radioPlayback";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

export function ChatPage() {
  const { user, accessToken } = useAuth();
  const { playerShellActive } = useAudioPlayer();
  const { listenerId, station, playing, nowPlaying, registerRadioUi, unregisterRadioUi } = useRadioPlayer();

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const [chatMessage, setChatMessage] = useState("");

  usePageMeta({ title: "Radio Chat" });

  const displayName = user
    ? (user.displayName || user.username)
    : getAnonName(listenerId);

  const radioClient = useMemo(() => authedApi(accessToken), [accessToken]);

  const chatMessages = station?.chatMessages ?? [];

  const shellHasPlayer = playerShellActive || (playing && Boolean(nowPlaying));

  const shellHeightClass = shellHasPlayer
    ? "h-[calc(100dvh-var(--spacing-topbar)-var(--spacing-player-safe-mobile))] md:h-[calc(100dvh-var(--spacing-topbar)-var(--spacing-player))]"
    : "h-[calc(100dvh-var(--spacing-topbar))]";

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "instant") => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    registerRadioUi();
    return unregisterRadioUi;
  }, [registerRadioUi, unregisterRadioUi]);

  useEffect(() => {
    requestAnimationFrame(() => scrollMessagesToBottom());
  }, [scrollMessagesToBottom]);

  const prevMsgCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length === prevMsgCountRef.current) return;
    prevMsgCountRef.current = chatMessages.length;

    const el = chatScrollRef.current;
    if (!el) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
    }
  }, [chatMessages.length, scrollMessagesToBottom]);

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
      queryClient.invalidateQueries({ queryKey: ["radio", "public"] });
      requestAnimationFrame(() => scrollMessagesToBottom("smooth"));
    },
  });

  function submitMessage() {
    const trimmed = chatMessage.trim();
    if (!trimmed || chatMutation.isPending) return;
    chatMutation.mutate({ message: trimmed, stationSlug: station?.slug ?? "main" });
  }

  return (
    <div className={`-mx-4 flex min-h-0 flex-col md:-mx-8 ${shellHeightClass}`}>
      <div
        ref={chatScrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end px-4 py-4 md:px-6">
          {chatMessages.length === 0 ? (
            <p className="pb-2 text-center text-sm text-[var(--color-text-subtle)]">
              No messages yet — say hi!
            </p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {chatMessages.map((item) => (
                <ChatMessageRow key={item.id} message={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      <ChatComposer
        chatMessage={chatMessage}
        displayName={displayName}
        isMember={Boolean(user)}
        listenerCount={station?.listenerCount}
        isPending={chatMutation.isPending}
        isError={chatMutation.isError}
        onChange={setChatMessage}
        onSubmit={submitMessage}
      />
    </div>
  );
}
