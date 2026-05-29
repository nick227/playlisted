import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/providers/AuthProvider";

/** Runs action when authenticated; otherwise redirects to login with return path. */
export function useAuthAction() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (action: () => void) => {
      if (status !== "authenticated") {
        navigate("/login", { state: { from: location.pathname }, replace: false });
        return false;
      }
      action();
      return true;
    },
    [status, navigate, location.pathname],
  );
}
