import { useEffect, useState } from "react";

/** Tailwind `md` — same breakpoint as former `window.innerWidth > 768` checks. */
export const MD_BREAKPOINT_PX = 768;

const MD_MEDIA_QUERY = `(min-width: ${MD_BREAKPOINT_PX}px)`;

export function useIsMdUp(): boolean {
  const [isMdUp, setIsMdUp] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MD_MEDIA_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MD_MEDIA_QUERY);
    const sync = () => setIsMdUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMdUp;
}
