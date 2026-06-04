import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminTrafficResponse, ChartRange } from "@playlisted/client-sdk";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to load traffic.";
}

export function useAdminTraffic(range: ChartRange) {
  const { accessToken } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);
  const requestIdRef = useRef(0);
  const [data, setData] = useState<AdminTrafficResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setError(null);

    api.admin
      .getTraffic({ range })
      .then((nextData) => {
        if (requestIdRef.current !== requestId) return;
        setData(nextData);
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setError(errorMessage(error));
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoading(false);
      });
  }, [api, range]);

  return { data, loading, error };
}
