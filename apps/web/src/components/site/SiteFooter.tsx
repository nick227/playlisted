import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Company", href: "/company" },
  { label: "Jobs", href: "/jobs" },
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
              src="/favicon.svg"
              alt=""
              loading="lazy"
              decoding="async"
            />
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
