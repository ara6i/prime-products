import { PublicPolicyChrome } from "./PublicPolicyChrome";
import type { PolicyPageContent, PolicySection, PolicySubsection } from "../types";

const toneStyles = {
  legal: {
    badge: "border-[#D7E2FF] bg-white text-[#2154EF]",
    accent: "bg-[#2154EF]",
    panel: "border-[#DDE8FF] bg-[#F7FAFF]",
  },
  support: {
    badge: "border-[#CDEFF2] bg-white text-[#0E7C86]",
    accent: "bg-[#13AAB6]",
    panel: "border-[#CDEFF2] bg-[#F5FEFF]",
  },
  pricing: {
    badge: "border-[#D7EFDD] bg-white text-[#1A6C3B]",
    accent: "bg-[#1B8E4B]",
    panel: "border-[#D7EFDD] bg-[#F8FFF9]",
  },
} as const;

interface PolicyPageProps {
  page: PolicyPageContent;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function BodyText({ paragraphs }: { paragraphs?: string[] }) {
  if (!paragraphs?.length) return null;

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-[15px] leading-[1.78] text-slate-600 md:text-[16px]">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items?.length) return null;

  return (
    <ul className="mt-4 grid gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-[1.7] text-slate-600 md:text-[16px]">
          <span className="mt-[0.65em] h-1.5 w-1.5 flex-none rounded-full bg-[#2154EF]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SubsectionCard({ subsection }: { subsection: PolicySubsection }) {
  return (
    <div className="rounded-2xl border border-[#E1E9F5] bg-[#FBFDFF] p-5">
      <h3 className="text-[17px] font-semibold leading-[1.35] tracking-[-0.015em] text-slate-950">
        {subsection.title}
      </h3>
      <div className="mt-3">
        <BodyText paragraphs={subsection.body} />
        <BulletList items={subsection.items} />
      </div>
    </div>
  );
}

function PolicySectionBlock({ section }: { section: PolicySection }) {
  return (
    <section className="scroll-mt-32 border-t border-[#DDE6F5] py-8 first:border-t-0 first:pt-0 md:py-10">
      <h2 className="max-w-3xl text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] text-slate-950 md:text-[30px]">
        {section.title}
      </h2>
      <div className="mt-5 max-w-3xl">
        <BodyText paragraphs={section.body} />
        <BulletList items={section.items} />
      </div>
      {section.subsections?.length ? (
        <div className="mt-6 grid max-w-4xl gap-4">
          {section.subsections.map((subsection) => (
            <SubsectionCard key={subsection.title} subsection={subsection} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function PolicyPage({ page }: PolicyPageProps) {
  const styles = toneStyles[page.tone];

  return (
    <PublicPolicyChrome>
    <main className="bg-[#F8FBFF] text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col px-5 py-10 md:px-8 md:py-14 lg:px-10">
        <header className="border-b border-[#DDE6F5] pb-8 md:pb-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className={`inline-flex rounded-full border px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] ${styles.badge}`}>
              {page.eyebrow}
                </div>
              <h1 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 md:text-[52px]">
                {page.title}
              </h1>
              <p className="mt-5 text-[16px] leading-[1.75] text-slate-600 md:text-[18px]">
                {page.description}
              </p>
              <div className={`mt-6 h-1 w-24 rounded-full ${styles.accent}`} />
            </div>

            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3 lg:w-[520px]">
              {page.lastUpdated ? (
                <div className="rounded-2xl border border-[#DDE6F5] bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Updated</p>
                  <p className="mt-1 font-semibold text-slate-950">{page.lastUpdated}</p>
                </div>
              ) : null}
              {page.effectiveDate ? (
                <div className="rounded-2xl border border-[#DDE6F5] bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Effective</p>
                  <p className="mt-1 font-semibold text-slate-950">{page.effectiveDate}</p>
                </div>
              ) : null}
              <div className="rounded-2xl border border-[#DDE6F5] bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Support</p>
                <a className="mt-1 block break-words font-semibold text-slate-950 hover:text-[#2154EF]" href="mailto:Support@PrimeStyleAI.com">
                  Support@PrimeStyleAI.com
                </a>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <aside className="sticky top-40 hidden self-start lg:block">
            <div className="rounded-2xl border border-[#DDE6F5] bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">On this page</p>
              <div className="mt-3 grid max-h-[calc(100vh-20rem)] gap-1 overflow-y-auto pr-1">
                {page.sections.map((section) => (
                  <a key={section.title} href={`#${slugify(section.title)}`} className="rounded-xl px-3 py-2 text-sm leading-[1.35] text-slate-600 transition hover:bg-[#F2F7FF] hover:text-[#2154EF]">
                    {section.title}
                  </a>
                ))}
                <a href="#contact" className="rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-[#F2F7FF] hover:text-[#2154EF]">
                  Contact
                </a>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${styles.panel}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Good to know</p>
              <ul className="mt-3 grid gap-3">
                {page.quickNotes.map((note) => (
                  <li key={note} className="text-sm leading-[1.6] text-slate-600">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <article className="min-w-0 rounded-[28px] border border-[#DDE6F5] bg-white px-5 py-7 md:px-8 md:py-9 lg:px-10">
            <section className="pb-8 md:pb-10">
              <BodyText paragraphs={page.intro} />
            </section>

            {page.sections.map((section) => (
              <div key={section.title} id={slugify(section.title)}>
                <PolicySectionBlock section={section} />
              </div>
            ))}

            <section id="contact" className="mt-2 rounded-2xl border border-[#D7E2FF] bg-[#F7FAFF] p-6 md:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2154EF]">Contact</p>
              <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.025em] text-slate-950 md:text-[30px]">{page.contactTitle}</h2>
              <p className="mt-3 max-w-2xl text-[16px] leading-[1.75] text-slate-600">{page.contactBody}</p>
              <div className="mt-6 flex flex-col gap-3 text-sm font-semibold sm:flex-row">
                <a href="mailto:Support@PrimeStyleAI.com" className="rounded-full bg-[#2154EF] px-5 py-3 text-white transition hover:bg-[#1747D9]">
                  Support@PrimeStyleAI.com
                </a>
                <a href="tel:+19493644449" className="rounded-full border border-[#C9D8F4] bg-white px-5 py-3 text-slate-950 transition hover:border-[#2154EF]/35 hover:text-[#2154EF]">
                  +1 (949) 364-4449
                </a>
              </div>
            </section>
          </article>
        </section>
      </section>
    </main>
    </PublicPolicyChrome>
  );
}
