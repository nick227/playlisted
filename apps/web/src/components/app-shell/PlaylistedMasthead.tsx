import { Link } from "react-router-dom";

/** Full wordmark for mobile top bar (search closed). Mini mark when search is open. */
export type PlaylistedMastheadVariant = "full" | "mini";

interface PlaylistedMastheadProps {
  variant: PlaylistedMastheadVariant;
  className?: string;
}

export function PlaylistedMasthead({ variant, className = "" }: PlaylistedMastheadProps) {
  return (
    <Link to="/" className={`shrink-0 font-bold tracking-tight text-white ${className}`}>
      {variant === "full" ? (
        <>
          Play<span className="text-[var(--color-brand)]">listed</span>
        </>
      ) : (
        <>
          P<span className="text-[var(--color-brand)]">L</span>
        </>
      )}
    </Link>
  );
}
