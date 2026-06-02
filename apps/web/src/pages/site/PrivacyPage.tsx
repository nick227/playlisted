import { usePageMeta } from "@/hooks/usePageMeta";
import { SiteFooter } from "@/components/site/SiteFooter";

const privacySections = [
  {
    title: "What this page is",
    body:
      "This is a plain-language privacy summary for an early experimental app. It is not a final legal policy. Playlisted is currently operated as a small project by Nick, and the goal here is to describe the practical data surfaces in the software without pretending there is a larger organization behind it.",
  },
  {
    title: "Account and profile data",
    body:
      "If you create an account, the app may store username, display name, email, hashed session information, role, profile text, avatar, hero image, links, and public profile settings. This data is used for login, profiles, role-based access, Studio pages, admin pages, and public artist pages.",
  },
  {
    title: "Music and public content",
    body:
      "If you upload recordings, artwork, playlists, or collection metadata, the app stores that content so it can be edited, ordered, played, and published. Public collections and profile pages should be treated as public web content. Private or draft content is intended to stay out of public views, but the system is early and should not be used for sensitive unreleased material without caution.",
  },
  {
    title: "Playback, favorites, and usage data",
    body:
      "The app may store or calculate data related to playback events, favorites, searches, playlist activity, chart activity, profile views, radio listening, and creator analytics. This is used to make product features work and to understand whether the experiment is functioning. It is not currently part of an advertising system.",
  },
  {
    title: "API, uploads, and infrastructure",
    body:
      "The app uses a backend API, database, generated client types, file uploads, and static upload serving. Audio and image files may be stored on server or deployment storage. In local and production-style setups, infrastructure providers may process data as part of hosting, database, storage, logging, or deployment.",
  },
  {
    title: "Sharing and selling",
    body:
      "Playlisted does not currently sell personal information. There is no advertising product, data marketplace, third-party audience targeting system, or advertiser reporting dashboard. Some data may pass through normal infrastructure or service providers needed to run the app.",
  },
  {
    title: "Control and deletion",
    body:
      "Because this is an early project, self-service data controls may be incomplete. Public profile information, links, collections, and uploaded content can be managed through the app where tools exist. Other deletion or correction requests may require manual handling by Nick.",
  },
  {
    title: "What to assume",
    body:
      "Assume the app is functional but not mature. Do not upload private, legally sensitive, or business-critical material unless you are comfortable with the risks of an early system. This page should become more formal only when the product and its responsibilities become more formal.",
  },
];

export function PrivacyPage() {
  usePageMeta({
    title: "Privacy",
    description: "A plain-language privacy summary for Playlisted.",
  });

  return (
    <main className="mx-auto max-w-4xl py-16 md:py-24">
      <section className="border-b border-[var(--color-border)] pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]">
          Privacy
        </p>
        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
          Privacy, in plain terms
        </h1>
        <p className="mt-5 text-base leading-8 text-[var(--color-text-muted)]">
          Playlisted is an early AI-assisted music app, currently used mainly by Nick. This page
          explains the practical privacy posture without pretending the project is larger or more
          formal than it is.
        </p>
      </section>

      <div className="divide-y divide-[var(--color-border)]">
        {privacySections.map((section) => (
          <section key={section.title} className="py-8">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {section.title}
            </h2>
            <p className="mt-3 text-base leading-8 text-[var(--color-text-muted)]">
              {section.body}
            </p>
          </section>
        ))}
      </div>
      <SiteFooter />
    </main>
  );
}
