"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, Mail } from "lucide-react";
import { useMemo } from "react";
import {
  CreatorLanguageProvider,
  localizePolicyPage,
  useCreatorLanguage,
} from "@/app/partner-landing/i18n/CreatorLanguageProvider";
import { PublicPolicyChrome } from "./PublicPolicyChrome";
import type { PolicyPageContent, PolicySection, PolicySubsection } from "../types";

interface LegalEditorialPageProps {
  page: PolicyPageContent;
}

function sectionAnchor(index: number) {
  return `section-${index + 1}`;
}

function BodyText({ paragraphs }: { paragraphs?: string[] }) {
  if (!paragraphs?.length) return null;

  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph) => (
        <p
          key={paragraph}
          className="break-words text-[17px] leading-[1.82] text-[#4A4D54] md:text-[18px] md:leading-[1.8]"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items?.length) return null;

  return (
    <ul className="mt-6 space-y-4 border-s border-[#C9D7FF] ps-5 md:ps-7">
      {items.map((item) => (
        <li key={item} className="break-words text-[17px] leading-[1.75] text-[#4A4D54] md:text-[18px]">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Subsection({ subsection }: { subsection: PolicySubsection }) {
  return (
    <div className="border-t border-[#E4E5E8] pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-[20px] font-semibold leading-[1.35] tracking-[-0.02em] text-[#141519] md:text-[22px]">
        {subsection.title}
      </h3>
      <div className="mt-4">
        <BodyText paragraphs={subsection.body} />
        <BulletList items={subsection.items} />
      </div>
    </div>
  );
}

function Section({ section, index }: { section: PolicySection; index: number }) {
  return (
    <section
      id={sectionAnchor(index)}
      className="scroll-mt-28 border-t border-[#DADCE1] py-10 md:scroll-mt-36 md:py-14"
    >
      <h2 className="max-w-[820px] text-[29px] font-semibold leading-[1.16] tracking-[-0.035em] text-[#111216] md:text-[38px]">
        {section.title}
      </h2>
      <div className="mt-6 max-w-[820px]">
        <BodyText paragraphs={section.body} />
        <BulletList items={section.items} />
      </div>
      {section.subsections?.length ? (
        <div className="mt-9 max-w-[820px] space-y-8">
          {section.subsections.map((subsection) => (
            <Subsection key={subsection.title} subsection={subsection} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PolicySwitch({ current, inverse = false }: { current: string; inverse?: boolean }) {
  const { t } = useCreatorLanguage();
  const base = inverse
    ? "border-white/45 text-white/72 hover:border-white hover:text-white"
    : "border-[#C9CCD3] text-[#5C6068] hover:border-[#2154EF] hover:text-[#2154EF]";
  const active = inverse
    ? "border-white bg-white text-[#1745D8]"
    : "border-[#111216] bg-[#111216] text-white";

  return (
    <nav aria-label={t("Legal pages")} className="flex flex-wrap gap-2.5">
      {[
        { label: t("Privacy"), href: "/privacy-policy", slug: "privacy-policy" },
        { label: t("Terms"), href: "/terms", slug: "terms" },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={current === item.slug ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
            current === item.slug ? active : base
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MetaItem({ label, value, inverse = false }: { label: string; value?: string; inverse?: boolean }) {
  if (!value) return null;

  return (
    <div className={`border-t pt-4 ${inverse ? "border-white/25" : "border-[#DADCE1]"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.17em] ${inverse ? "text-white/58" : "text-[#777B84]"}`}>
        {label}
      </p>
      <p className={`mt-2 text-[15px] font-semibold leading-snug ${inverse ? "text-white" : "text-[#111216]"}`}>
        {value}
      </p>
    </div>
  );
}

function TableOfContents({ page, inverse = false }: { page: PolicyPageContent; inverse?: boolean }) {
  const { t } = useCreatorLanguage();
  return (
    <nav aria-label={t("Contents of {title}", { title: page.title })} className="space-y-1">
      {page.sections.map((section, index) => (
        <a
          key={section.title}
          href={`#${sectionAnchor(index)}`}
          className={`block py-1.5 text-[13px] leading-[1.4] transition-colors ${
            inverse ? "text-white/68 hover:text-white" : "text-[#5C6068] hover:text-[#2154EF]"
          }`}
        >
          {section.title}
        </a>
      ))}
      <a
        href="#contact"
        className={`block py-1.5 text-[13px] leading-[1.4] transition-colors ${
          inverse ? "text-white/68 hover:text-white" : "text-[#5C6068] hover:text-[#2154EF]"
        }`}
      >
        {t("Contact")}
      </a>
    </nav>
  );
}

export function LegalEditorialPage({ page }: LegalEditorialPageProps) {
  return (
    <CreatorLanguageProvider>
      <LocalizedLegalEditorialPage page={page} />
    </CreatorLanguageProvider>
  );
}

function LocalizedLegalEditorialPage({ page: sourcePage }: LegalEditorialPageProps) {
  const { direction, language, t } = useCreatorLanguage();
  const page = useMemo(
    () => localizePolicyPage(sourcePage, t),
    [sourcePage, t],
  );
  const contactEmail = page.contactEmail ?? "support@primestyleai.com";
  const railStatement = page.slug === "privacy-policy" ? t("Clarity about your data.") : t("Clear rules for working together.");

  return (
    <PublicPolicyChrome>
      <main dir={direction} lang={language} className="bg-white font-[family-name:var(--font-manrope)] text-[#111216]">
        <div className="lg:grid lg:grid-cols-[minmax(390px,36vw)_minmax(0,1fr)]">
          <aside className="relative hidden bg-[#2154EF] text-white lg:block">
            <div className="sticky top-[92px] flex h-[calc(100vh-92px)] min-h-[620px] flex-col px-[clamp(42px,4.1vw,78px)] py-[clamp(42px,4vw,74px)]">
              <div className="flex-none">
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/60">{page.eyebrow}</p>
                <p className="mt-5 max-w-[360px] text-[42px] font-semibold leading-[1.04] tracking-[-0.045em]">
                  {railStatement}
                </p>
                <div className="mt-7">
                  <PolicySwitch current={page.slug} inverse />
                </div>
                <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
                  <MetaItem label={t("Effective")} value={page.effectiveDate} inverse />
                  <MetaItem label={t("Updated")} value={page.lastUpdated} inverse />
                  <div className="col-span-2">
                    <MetaItem label={t("Company location")} value={page.location} inverse />
                  </div>
                </div>
              </div>

              <div className="mt-9 min-h-0 flex-1 border-t border-white/25 pt-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{t("On this page")}</p>
                <div className="h-full overflow-y-auto pe-3 [scrollbar-color:rgba(255,255,255,0.42)_transparent] [scrollbar-width:thin]">
                  <TableOfContents page={page} inverse />
                </div>
              </div>
            </div>
          </aside>

          <article className="min-w-0 px-5 pb-20 pt-9 sm:px-8 md:px-12 md:pb-28 md:pt-14 lg:px-[clamp(58px,6vw,116px)] lg:pb-36 lg:pt-[clamp(64px,6vw,112px)]">
            <div className="mx-auto max-w-[920px] lg:mx-0">
              <div className="lg:hidden">
                <PolicySwitch current={page.slug} />
              </div>

              <header>
                <p className="mt-10 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2154EF] lg:mt-0">
                  {page.eyebrow}
                </p>
                <h1 className="mt-5 text-[44px] font-semibold leading-[0.98] tracking-[-0.025em] text-[#0F1013] sm:text-[54px] md:text-[68px] md:tracking-[-0.055em] lg:text-[76px]">
                  {page.title}
                </h1>
                <p className="mt-7 max-w-[820px] text-[18px] leading-[1.7] text-[#555961] md:text-[21px] md:leading-[1.65]">
                  {page.description}
                </p>

                <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-5 lg:hidden">
                  <MetaItem label={t("Effective")} value={page.effectiveDate} />
                  <MetaItem label={t("Updated")} value={page.lastUpdated} />
                  <div className="col-span-2">
                    <MetaItem label={t("Company location")} value={page.location} />
                  </div>
                </div>
              </header>

              <div className="mt-11 border-y border-[#DADCE1] py-9 md:mt-14 md:py-12">
                <BodyText paragraphs={page.intro} />
              </div>

              <div className="grid border-b border-[#DADCE1] md:grid-cols-3">
                {page.quickNotes.map((note, index) => (
                  <div
                    key={note}
                    className="border-t border-[#DADCE1] py-6 first:border-t-0 md:border-l md:border-t-0 md:px-6 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2154EF]">0{index + 1}</p>
                    <p className="mt-3 text-[15px] leading-[1.65] text-[#52565E] md:text-[16px]">{note}</p>
                  </div>
                ))}
              </div>

              <details className="group border-b border-[#DADCE1] py-5 lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold uppercase tracking-[0.16em] text-[#111216] [&::-webkit-details-marker]:hidden">
                  {t("On this page")}
                  <ChevronDown className="h-5 w-5 text-[#2154EF] transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="mt-5 pb-2">
                  <TableOfContents page={page} />
                </div>
              </details>

              <div>
                {page.sections.map((section, index) => (
                  <Section key={`${index}-${section.title}`} section={section} index={index} />
                ))}
              </div>

              <section id="contact" className="scroll-mt-28 border-t border-[#111216] pt-10 md:scroll-mt-36 md:pt-14">
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2154EF]">{t("Contact")}</p>
                <h2 className="mt-4 max-w-[720px] text-[34px] font-semibold leading-[1.12] tracking-[-0.04em] text-[#111216] md:text-[48px]">
                  {page.contactTitle}
                </h2>
                <p className="mt-5 max-w-[820px] text-[17px] leading-[1.8] text-[#4A4D54] md:text-[18px]">{page.contactBody}</p>
                <a
                  dir="ltr"
                  href={`mailto:${contactEmail}`}
                  className="mt-8 inline-flex max-w-full items-center gap-3 rounded-full bg-[#2154EF] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#193EDC]"
                >
                  <Mail className="h-[18px] w-[18px] flex-none" aria-hidden />
                  <span className="truncate">{contactEmail}</span>
                  <ArrowUpRight className="h-[17px] w-[17px] flex-none" aria-hidden />
                </a>
              </section>
            </div>
          </article>
        </div>
      </main>
    </PublicPolicyChrome>
  );
}
