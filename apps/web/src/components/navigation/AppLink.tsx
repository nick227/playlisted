import { Link, type LinkProps } from "react-router-dom";

type AppLinkProps = Omit<LinkProps, "to"> & {
  to: string;
};

const EXTERNAL_PROTOCOL_RE = /^(mailto|tel|sms|data|blob):/i;

function internalRouteFor(to: string): string | null {
  if (EXTERNAL_PROTOCOL_RE.test(to)) return null;

  if (to.startsWith("//") || /^https?:\/\//i.test(to)) {
    try {
      const url = new URL(to, window.location.origin);
      if (url.origin !== window.location.origin) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  return to;
}

/**
 * Site navigation link.
 * Internal URLs use React Router so persistent playback survives navigation;
 * external URLs fall back to a normal anchor.
 */
export function AppLink({ to, target, reloadDocument, ...props }: AppLinkProps) {
  const internalTo = !reloadDocument && (!target || target === "_self") ? internalRouteFor(to) : null;

  if (!internalTo) {
    return <a href={to} target={target} {...props} />;
  }

  return <Link to={internalTo} target={target} reloadDocument={reloadDocument} {...props} />;
}
