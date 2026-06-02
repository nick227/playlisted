import { RandomPlayablePlaylistCard } from "@/components/site/RandomPlayablePlaylistCard";
import { usePageMeta } from "@/hooks/usePageMeta";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useNavigate } from "react-router-dom";

type EditorialInfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  pageKey: string;
  contactEmail?: string;
  contactAfterContent?: boolean;
  sections: ReadonlyArray<{
    title: string;
    body: string;
  }>;
  bullets?: readonly string[];
  tableItems?: ReadonlyArray<{
    role: string;
    focus: string;
  }>;
  closing?: string;
};

export function EditorialInfoPage({
  eyebrow,
  title,
  description,
  intro,
  pageKey,
  contactEmail,
  contactAfterContent = false,
  sections,
  bullets,
  tableItems,
  closing,
}: EditorialInfoPageProps) {
  usePageMeta({ title, description });
  const navigate = useNavigate();

  return (
    <main className="mx-auto max-w-6xl">
      <section className="border-b border-[var(--color-border)] py-16 md:py-24">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] transition hover:bg-white/5 hover:text-white"
          >
            <span aria-hidden className="text-lg leading-none">
              ←
            </span>
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]">
            {eyebrow}
          </p>
        </div>
        <h1 className="mt-5 max-w-4xl text-5xl font-black leading-none tracking-tight text-white md:text-7xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)]">
          {description}
        </p>
      </section>

      <section className="grid gap-12 py-14 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] md:py-20">
        <div className="space-y-12">
          <p className="max-w-3xl text-2xl font-semibold leading-10 text-white">
            {intro}
          </p>
          {contactEmail && !contactAfterContent ? (
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex text-base font-semibold text-[var(--color-brand)] transition hover:text-white"
            >
              {contactEmail}
            </a>
          ) : null}

          {tableItems ? (
            <div className="space-y-8 border-t border-[var(--color-border)] pt-8">
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                <table className="w-full border-collapse text-left">
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {tableItems.map((item) => (
                      <tr key={item.role}>
                        <th className="w-1/2 px-4 py-4 text-sm font-semibold text-white">
                          {item.role}
                        </th>
                        <td className="px-4 py-4 text-sm leading-6 text-[var(--color-text-muted)]">
                          {item.focus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {closing ? (
                <p className="max-w-2xl text-base leading-8 text-white">
                  {closing}
                </p>
              ) : null}
              {contactEmail && contactAfterContent ? (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex text-base font-semibold text-[var(--color-brand)] transition hover:text-white"
                >
                  {contactEmail}
                </a>
              ) : null}
            </div>
          ) : bullets ? (
            <div className="space-y-8 border-t border-[var(--color-border)] pt-8">
              <ul className="space-y-4">
                {bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="max-w-2xl text-base leading-8 text-[var(--color-text-muted)]"
                  >
                    <span className="mr-3 text-[var(--color-brand)]">/</span>
                    {bullet}
                  </li>
                ))}
              </ul>
              {closing ? (
                <p className="max-w-2xl text-base leading-8 text-white">
                  {closing}
                </p>
              ) : null}
              {contactEmail && contactAfterContent ? (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex text-base font-semibold text-[var(--color-brand)] transition hover:text-white"
                >
                  {contactEmail}
                </a>
              ) : null}
            </div>
          ) : (
            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.title} className="border-t border-[var(--color-border)] pt-8">
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    {section.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--color-text-muted)]">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          )}
        </div>

        <RandomPlayablePlaylistCard pageKey={pageKey} />
      </section>
      <SiteFooter />
    </main>
  );
}
