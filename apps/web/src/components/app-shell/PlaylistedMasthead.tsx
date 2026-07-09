import { Link } from "react-router-dom";
import { Radio } from "lucide-react";

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
        <Radio size={13} className="shrink-0 text-[var(--color-brand)]" />
      ) : null}
    </Link>
  );
}
