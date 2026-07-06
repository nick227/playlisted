import { useCallback, useEffect, useState } from "react";

export function useArtistVisualMinimized(recordingId: string | undefined) {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    setMinimized(false);
  }, [recordingId]);

  const minimize = useCallback(() => setMinimized(true), []);
  const expand = useCallback(() => setMinimized(false), []);

  return { minimized, minimize, expand };
}
