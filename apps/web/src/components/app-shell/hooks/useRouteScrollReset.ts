import { useLayoutEffect, type RefObject } from "react";

/** Scrolls main content and window to top on route changes (skips hash-only nav). */
export function useRouteScrollReset(
  mainRef: RefObject<HTMLElement | null>,
  pathname: string,
  search: string,
  hash: string,
) {
  useLayoutEffect(() => {
    if (hash) return;
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [hash, mainRef, pathname, search]);
}
