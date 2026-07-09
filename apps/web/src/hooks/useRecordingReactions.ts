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

type ToggleReactionVars = {
  reactionId: RecordingReactionId;
  /** Whether this reaction was already active before the toggle. */
  wasActive: boolean;
};

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
    mutationFn: async ({ reactionId, wasActive }: ToggleReactionVars) => {
      if (!recordingId) return;
      const def = getRecordingReactionDef(reactionId);
      if (!canToggleRecordingReaction(def, { isAuthenticated, hasRecording: true })) return;

      const kind = reactionKindForId(reactionId);
      // Use wasActive from before onMutate — reading the cache here would see the
      // optimistic flip and call the opposite endpoint.
      if (wasActive) {
        await client.me.removeRecordingReaction(recordingId, kind);
        return;
      }
      await client.me.addRecordingReaction(recordingId, kind);
    },
    onMutate: async ({ reactionId, wasActive }) => {
      if (!recordingId) return;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<RecordingReactionsResponse>(queryKey);
      const kind = reactionKindForId(reactionId);
      const nextKinds = new Set(previous?.kinds ?? []);
      if (wasActive) {
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
    onError: (_error, _vars, context) => {
      if (!recordingId) return;
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        return;
      }
      queryClient.setQueryData<RecordingReactionsResponse>(queryKey, {
        recordingId,
        kinds: [],
      });
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
    const kind = reactionKindForId(reactionId);
    const current = queryClient.getQueryData<RecordingReactionsResponse>(queryKey);
    const wasActive = current?.kinds.includes(kind) ?? false;
    toggle.mutate({ reactionId, wasActive });
  };

  return {
    activeIds,
    isAuthenticated,
    toggleReaction,
    isLoading: query.isLoading,
    isPending: toggle.isPending,
  };
}
