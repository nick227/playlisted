export type PlaybackEventBody = {
  recordingId: string;
  playlistId?: string | null;
  sourceContext?: string | null;
  playedSeconds?: number;
  completed?: boolean;
};

export function postPlaybackEvent(accessToken: string | null, body: PlaybackEventBody): void {
  if (!accessToken) return;

  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  void fetch(`${base}/api/v1/me/playback-events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}
