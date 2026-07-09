import { Link } from "react-router-dom";

/** Full wordmark for mobile top bar (search closed). Mini mark when search is open. */
export type PlaylistedMastheadVariant = "full" | "mini";

interface PlaylistedMastheadProps {
  variant: PlaylistedMastheadVariant;
  showLogo?: boolean;
  className?: string;
}

export function PlaylistedMasthead({
  variant,
  showLogo = false,
  className = "",
}: PlaylistedMastheadProps) {
  return (
    <Link to="/" className={`flex shrink-0 items-center gap-2 font-bold tracking-tight text-white ${className}`}>
      <span>
        {variant === "full" ? (
          <>
            Play<span className="text-[var(--color-brand)]">listed</span>
          </>
        ) : (
          <>
            P<span className="text-[var(--color-brand)]">L</span>
          </>
        )}
      </span>
      {showLogo && variant === "full" ? (
        <img src="/favicon.svg" alt="" className="h-7 w-7 shrink-0" />
      ) : null}
    </Link>
  );
}
