import { useLayoutEffect, type RefObject } from "react";
import { useLocation } from "react-router-dom";

import { isBrowseSwipeNavigation } from "@/lib/browseNavigation/types";

/** Scrolls main content and window to top on route changes (skips hash-only nav). */
export function useRouteScrollReset(
  mainRef: RefObject<HTMLElement | null>,
  pathname: string,
  search: string,
  hash: string,
) {
  const location = useLocation();

  useLayoutEffect(() => {
    if (hash) return;
    if (isBrowseSwipeNavigation(location.state)) return;
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [hash, location.state, mainRef, pathname, search]);
}
