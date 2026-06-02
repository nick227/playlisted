import { Link } from "react-router-dom";

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
  return (
    <footer className="mt-8 border-t border-[var(--color-border)] py-8">
      <div className="flex justify-between">
        <div className="flex flex-col items-start gap-6" style={{ flex: "1 1 auto" }}>
          <div className="flex items-center gap-3">
            <img
              className="pointer-events-none-translate-x-1/2 w-8 h-8 mr-2"
              src="/src/images/favicon.png" alt="" />
            <p className="text-lg font-bold tracking-tight text-white">
              Play<span className="text-[var(--color-brand)]">Listed</span>
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-col items-start gap-3"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
