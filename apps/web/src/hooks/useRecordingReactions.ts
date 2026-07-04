import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  canToggleRecordingReaction,
  getRecordingReactionDef,
  reactionIdForKind,
  reactionKindForId,
  type RecordingReactionId,
} from "@/lib/reactions/recordingReactions";
import type {
  RecordingReactionKind,
  RecordingReactionsResponse,
} from "@/lib/reactions/recordingReactionKinds";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

function reactionsQueryKey(recordingId: string) {
  return ["me", "reactions", "recordings", recordingId] as const;
}

export function useRecordingReactions(recordingId: string | undefined) {
  const { accessToken, status } = useAuth();
  const isAuthenticated = status === "authenticated" && Boolean(accessToken);
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();
  const queryKey = recordingId ? reactionsQueryKey(recordingId) : ["me", "reactions", "recordings", "none"];

  const query = useQuery({
    queryKey,
    queryFn: () => client.me.recordingReactions(recordingId!),
    enabled: isAuthenticated && Boolean(recordingId),
  });

  const activeIds = new Set<RecordingReactionId>(
    (query.data?.kinds ?? []).map((kind) => reactionIdForKind(kind)),
  );

  const toggle = useMutation({
    mutationFn: async (reactionId: RecordingReactionId) => {
      if (!recordingId) return;
      const def = getRecordingReactionDef(reactionId);
      if (!canToggleRecordingReaction(def, { isAuthenticated, hasRecording: true })) return;

      const kind = reactionKindForId(reactionId);
      const current = queryClient.getQueryData<RecordingReactionsResponse>(queryKey);
      const isActive = current?.kinds.includes(kind) ?? false;
      if (isActive) {
        await client.me.removeRecordingReaction(recordingId, kind);
        return;
      }
      await client.me.addRecordingReaction(recordingId, kind);
    },
    onMutate: async (reactionId) => {
      if (!recordingId) return;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RecordingReactionsResponse>(queryKey);
      const kind = reactionKindForId(reactionId);
      const nextKinds = new Set(previous?.kinds ?? []);
      if (nextKinds.has(kind)) {
        nextKinds.delete(kind);
      } else {
        nextKinds.add(kind);
      }
      queryClient.setQueryData<RecordingReactionsResponse>(queryKey, {
        recordingId,
        kinds: [...nextKinds] as RecordingReactionKind[],
      });
      return { previous };
    },
    onError: (_error, _reactionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      if (!recordingId) return;
      void queryClient.invalidateQueries({ queryKey: reactionsQueryKey(recordingId) });
    },
  });

  const toggleReaction = (reactionId: RecordingReactionId) => {
    const def = getRecordingReactionDef(reactionId);
    if (!canToggleRecordingReaction(def, { isAuthenticated, hasRecording: Boolean(recordingId) })) {
      return;
    }
    toggle.mutate(reactionId);
  };

  return {
    activeIds,
    isAuthenticated,
    toggleReaction,
    isLoading: query.isLoading,
    isPending: toggle.isPending,
  };
}
