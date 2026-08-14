import {
  ArrowUpRight,
  EnvelopeSimple,
  InstagramLogo,
  LinkedinLogo,
  MapPin,
  YoutubeLogo,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useOptionalCreatorLanguage } from "../../i18n/CreatorLanguageProvider";
import styles from "./influencerLanding.module.css";

const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/primestyleai/", label: "Instagram", Icon: InstagramLogo },
  { href: "https://www.linkedin.com/company/primestyleai/posts/?feedView=all", label: "LinkedIn", Icon: LinkedinLogo },
  { href: "https://www.youtube.com/@PrimeStyleAI", label: "YouTube", Icon: YoutubeLogo },
] as const;

export function InfluencerFooter({ onCtaClick }: { onCtaClick?: () => void }) {
  const languageContext = useOptionalCreatorLanguage();
  const t = languageContext?.t ?? ((value: string) => value);

  return (
    <footer className={styles.networkFooter}>
      <div className={styles.footerFrame}>
        <section className={styles.footerMain} aria-label={t("PrimeStyleAI footer")}>
          <Link href="/" className={styles.footerMark} aria-label="PrimeStyleAI home">
            <Image
              src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
              alt="PrimeStyleAI"
              width={1254}
              height={1254}
              sizes="150px"
            />
          </Link>

          <div className={styles.footerBrand}>
            <h2>Prime Style AI</h2>
            <p>{t("Where every look becomes a story worth sharing.")}</p>
          </div>

          <div className={styles.footerContent}>
            <div className={styles.footerContact}>
              <h3>{t("Contact")}</h3>
              <a href="mailto:support@primestyleai.com"><EnvelopeSimple size={16} /> support@primestyleai.com</a>
              <span><MapPin size={16} /> {t("Laguna Niguel, California")}</span>
              <nav aria-label={t("Social links")}>
                {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                    <Icon size={17} weight="fill" />
                  </a>
                ))}
              </nav>
            </div>

            <div className={styles.footerActions}>
              {onCtaClick ? (
                <>
                  <button type="button" onClick={onCtaClick}>{t("Open Outfit Studio")} <ArrowUpRight size={14} weight="bold" /></button>
                  <button type="button" onClick={onCtaClick}>{t("How it works")} <ArrowUpRight size={14} weight="bold" /></button>
                </>
              ) : (
                <>
                  <Link href="/influencers/dashboard/outfit-studio">{t("Open Outfit Studio")} <ArrowUpRight size={14} weight="bold" /></Link>
                  <Link href="#creator-journey">{t("How it works")} <ArrowUpRight size={14} weight="bold" /></Link>
                </>
              )}
            </div>

            <nav className={styles.footerQuickLinks} aria-label={t("Footer navigation")}>
              <h3>{t("Quick links")}</h3>
              <Link href="#outfit-studio">{t("Outfit Studio")}</Link>
              <Link href="#creator-journey">{t("How creators earn")}</Link>
              <Link href="#creator-commission">{t("Commission")}</Link>
            </nav>
          </div>

          <div className={styles.footerLegal}>
            <span>© {new Date().getFullYear()} Prime Style AI</span>
            <nav aria-label={t("Legal links")}>
              <Link href="/privacy-policy">{t("Privacy policy")}</Link>
              <Link href="/terms">{t("Terms")}</Link>
              <a href="https://primestyleai.com/help-center">{t("Creator help")}</a>
            </nav>
          </div>
        </section>
      </div>
    </footer>
  );
}
