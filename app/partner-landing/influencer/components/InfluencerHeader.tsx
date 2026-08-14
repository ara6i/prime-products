import { List, X } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { LandingLanguageSwitcher } from "@/app/landing/i18n";
import { useCreatorLanguage } from "../../i18n/CreatorLanguageProvider";
import styles from "./influencerLanding.module.css";

interface InfluencerHeaderProps {
  mobileMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onPrimaryAction: () => void;
  onSectionSelect: (id: string) => void;
}

export function InfluencerHeader(props: InfluencerHeaderProps) {
  const { language, setLanguage, t } = useCreatorLanguage();

  return (
    <header className={styles.header}>
      <Link href="/influencers" className={styles.logoLink} aria-label={t("Prime Style AI home")}>
        <Image
          src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
          alt="Prime Style AI"
          width={1254}
          height={1254}
          sizes="42px"
          preload
        />
        <span>Prime Style AI</span>
      </Link>
      <nav className={styles.desktopNav} aria-label={t("Influencer navigation")}>
        <Link href="/" aria-current="page">{t("Influencers")}</Link>
        <button type="button" onClick={() => props.onSectionSelect("outfit-studio")}>{t("Outfit Studio")}</button>
        <button type="button" onClick={() => props.onSectionSelect("creator-journey")}>{t("How you earn")}</button>
        <button type="button" onClick={() => props.onSectionSelect("creator-commission")}>{t("Commission")}</button>
        <a href="https://primestyleai.com/merchants">{t("For merchants")}</a>
      </nav>
      <div className={styles.headerActions}>
        <LandingLanguageSwitcher
          compact
          className={styles.headerLanguage}
          language={language}
          onLanguageChange={setLanguage}
          variant="creator"
        />
        <button type="button" className={styles.headerCta} onClick={props.onPrimaryAction}>{t("Join waitlist")}</button>
        <button type="button" className={styles.menuButton} onClick={props.onMenuToggle} aria-label={props.mobileMenuOpen ? t("Close menu") : t("Open menu")} aria-expanded={props.mobileMenuOpen}>
          {props.mobileMenuOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </div>
      {props.mobileMenuOpen ? (
        <nav className={styles.mobileNav} aria-label={t("Mobile influencer navigation")}>
          <button type="button" onClick={() => props.onSectionSelect("outfit-studio")}>{t("Outfit Studio")}</button>
          <button type="button" onClick={() => props.onSectionSelect("creator-journey")}>{t("How you earn")}</button>
          <button type="button" onClick={() => props.onSectionSelect("creator-commission")}>{t("Commission")}</button>
          <a href="https://primestyleai.com/merchants" onClick={props.onMenuClose}>{t("For merchants")}</a>
          <button type="button" className={styles.mobileCta} onClick={() => { props.onMenuClose(); props.onPrimaryAction(); }}>{t("Join waitlist")}</button>
        </nav>
      ) : null}
    </header>
  );
}
