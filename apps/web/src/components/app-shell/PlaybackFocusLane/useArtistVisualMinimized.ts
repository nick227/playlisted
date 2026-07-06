import { useCallback, useEffect, useState } from "react";

export function useArtistVisualMinimized(recordingId: string | undefined, hasBodyFaded: boolean) {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    setMinimized(false);
  }, [recordingId]);

  useEffect(() => {
    if (!hasBodyFaded) {
      setMinimized(false);
    }
  }, [hasBodyFaded]);

  const minimize = useCallback(() => setMinimized(true), []);
  const expand = useCallback(() => setMinimized(false), []);

  return { minimized, minimize, expand };
}
