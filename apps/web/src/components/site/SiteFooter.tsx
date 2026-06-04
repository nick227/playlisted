import { Link } from "react-router-dom";
import faviconUrl from "@/images/favicon.png";

const footerLinks = [
  { label: "Musicians", href: "/musicians" },
  { label: "Developers", href: "/developers" },
  { label: "Advertising", href: "/advertising" },
  { label: "Company", href: "/company" },
  { label: "Jobs", href: "/jobs" },
  { label: "Media", href: "/media" },
  { label: "Privacy", href: "/privacy" },
] as const;

export function SiteFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  };

  return (
    <footer className="mt-16 border-t border-[var(--color-border)] py-8">
      <div className="flex justify-between w-full items-end">
        
          <div>
            <div className="flex items-center mb-4">
              <Link
                to={"/"}
                onClick={scrollToTop}
                className="text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white"
              >
            <img
              className="pointer-events-none-translate-x-1/2 w-8 h-8 mr-2"
              src={faviconUrl} alt="" />
              </Link>
              <Link
                to={"/"}
                onClick={scrollToTop}
                className="text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white"
              >
            <p className="text-lg font-bold tracking-tight text-white">
              Play<span className="text-[var(--color-brand)]">Listed</span>
            </p>
              </Link>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-col items-start gap-3"
          >
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.5rem 1.5rem",
  }}
>
  {footerLinks.map((link) => (
    <Link
      key={link.href}
      to={link.href}
      onClick={scrollToTop}
      className="text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white"
    >
      {link.label}
    </Link>
  ))}
</div>
          </nav>
          </div>

        <div className="flex justify-end items-center gap-2">
          
            <p className="text-sm">digital music project</p>
            <h6 className="text-sm font-bold text-[var(--color-text-muted)]">© 2026</h6>

        </div>
      </div>
    </footer>
  );
}
