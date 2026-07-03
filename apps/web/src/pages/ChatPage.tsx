import { useEffect, useMemo, useRef, useState } from "react";
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
  const { listenerId, station, radioPlaying, nowPlaying, registerRadioUi, unregisterRadioUi } = useRadioPlayer();

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const [chatMessage, setChatMessage] = useState("");

  usePageMeta({ title: "Radio Chat" });

  const displayName = user
    ? (user.displayName || user.username)
    : getAnonName(listenerId);

  const radioClient = useMemo(() => authedApi(accessToken), [accessToken]);

  const chatMessages = station?.chatMessages ?? [];

  const shellHasPlayer = playerShellActive || (radioPlaying && Boolean(nowPlaying));

  const shellHeightClass = shellHasPlayer
    ? "min-h-[calc(100dvh-var(--spacing-topbar)-var(--spacing-player-safe-mobile))] -mb-6 md:min-h-[calc(100dvh-var(--spacing-topbar)-var(--spacing-player))]"
    : "min-h-[calc(100dvh-var(--spacing-topbar)-1.5rem)]";

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
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
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
      queryClient.invalidateQueries({ queryKey: ["radio", "public"] });
    },
  });

  function submitMessage() {
    const trimmed = chatMessage.trim();
    if (!trimmed || chatMutation.isPending) return;
    chatMutation.mutate({ message: trimmed, stationSlug: station?.slug ?? "main" });
  }

  return (
    <div className={`-mx-4 flex flex-col md:-mx-8 ${shellHeightClass}`}>
      <div
        ref={chatScrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-6">
          {chatMessages.length === 0 ? (
            <p className="pt-[20vh] text-center text-sm text-[var(--color-text-subtle)]">
              No messages yet — say hi!
            </p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {chatMessages.map((item) => (
                <ChatMessageRow key={item.id} message={item} />
              ))}
            </div>
          )}
          <div ref={chatBottomRef} className="h-4" />
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
