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

export function InfluencerFooter({
  onCtaClick,
  variant = "landing",
}: {
  onCtaClick?: () => void;
  variant?: "landing" | "legal";
}) {
  const languageContext = useOptionalCreatorLanguage();
  const t = languageContext?.t ?? ((value: string) => value);

  return (
    <footer
      className={`${styles.networkFooter} ${variant === "legal" ? styles.networkFooterLegal : ""}`}
    >
      <div className={styles.footerFrame}>
        <section className={styles.footerMain} aria-label={t("PrimeStyleAI footer")}>
          <Link href="/shop" className={styles.footerMark} aria-label="PrimeStyleAI home">
            <Image
              src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
              alt="PrimeStyleAI"
              width={1254}
              height={1254}
              sizes="150px"
            />
          </Link>

          <div className={styles.footerBrand}>
            <h2>PrimeStyleAI</h2>
            <p>{t("Fashion, styled around you across one connected network.")}</p>
          </div>

          <div className={styles.footerContent}>
            <div className={styles.footerContact}>
              <h3>{t("Contact")}</h3>
              <a href="mailto:support@primestyleai.com"><EnvelopeSimple size={16} /> support@primestyleai.com</a>
              <span><MapPin size={16} /> {t("1968 S. Coast Hwy #4471, Laguna Beach, CA 92651")}</span>
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
                  <Link href="/shop#ai-stylist-scenario">{t("Try the AI Stylist")} <ArrowUpRight size={14} weight="bold" /></Link>
                  <Link href="/shop#merchant-system">{t("How the network works")} <ArrowUpRight size={14} weight="bold" /></Link>
                </>
              )}
            </div>

            <nav className={styles.footerQuickLinks} aria-label={t("Footer navigation")}>
              <h3>{t("Quick links")}</h3>
              <Link href="/shop">{t("Shop")}</Link>
              <Link href="/merchants">{t("Merchants")}</Link>
              <Link href="/influencers">{t("Creators")}</Link>
              <Link href="/suppliers">{t("Suppliers")}</Link>
            </nav>
          </div>

          <div className={styles.footerLegal}>
            <span>© {new Date().getFullYear()} PrimeStyleAI</span>
            <nav aria-label={t("Legal links")}>
              <Link href="/terms">{t("Terms & participation")}</Link>
              <Link href="/privacy-policy">{t("Privacy")}</Link>
              <Link href="/privacy-policy#section-3">{t("AI & photo data")}</Link>
              <Link href="/terms#section-22">{t("Accessibility")}</Link>
              <Link href="/privacy-policy#section-6">{t("Cookie & privacy choices")}</Link>
              <a href="mailto:support@primestyleai.com">{t("Contact")}</a>
            </nav>
          </div>
        </section>
      </div>
    </footer>
  );
}
