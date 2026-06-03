import { useEffect, useState } from "react";

/** Tailwind `sm` — matches TopBar mobile/desktop split. */
export const SM_BREAKPOINT_PX = 640;

const SM_MEDIA_QUERY = `(min-width: ${SM_BREAKPOINT_PX}px)`;

export function useIsSmUp(): boolean {
  const [isSmUp, setIsSmUp] = useState(
    () => typeof window !== "undefined" && window.matchMedia(SM_MEDIA_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(SM_MEDIA_QUERY);
    const sync = () => setIsSmUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isSmUp;
}
