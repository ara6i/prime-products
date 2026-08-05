import { List, X } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import styles from "./influencerLanding.module.css";

interface InfluencerHeaderProps {
  mobileMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onPrimaryAction: () => void;
  onSectionSelect: (id: string) => void;
}

export function InfluencerHeader(props: InfluencerHeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logoLink} aria-label="Prime Style AI home">
        <Image
          src="/media/partner-landing/primestyleai-new-mark.png"
          alt="Prime Style AI"
          width={1254}
          height={1254}
          sizes="42px"
          priority
        />
        <span>Prime Style AI</span>
      </Link>
      <nav className={styles.desktopNav} aria-label="Influencer navigation">
        <Link href="/influencers" aria-current="page">Influencers</Link>
        <button type="button" onClick={() => props.onSectionSelect("outfit-studio")}>Outfit Studio</button>
        <button type="button" onClick={() => props.onSectionSelect("creator-journey")}>How you earn</button>
        <button type="button" onClick={() => props.onSectionSelect("creator-commission")}>Commission</button>
        <Link href="/merchants">For merchants</Link>
      </nav>
      <div className={styles.headerActions}>
        <button type="button" className={styles.headerCta} onClick={props.onPrimaryAction}>Join waitlist</button>
        <button type="button" className={styles.menuButton} onClick={props.onMenuToggle} aria-label={props.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={props.mobileMenuOpen}>
          {props.mobileMenuOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </div>
      {props.mobileMenuOpen ? (
        <nav className={styles.mobileNav} aria-label="Mobile influencer navigation">
          <button type="button" onClick={() => props.onSectionSelect("outfit-studio")}>Outfit Studio</button>
          <button type="button" onClick={() => props.onSectionSelect("creator-journey")}>How you earn</button>
          <button type="button" onClick={() => props.onSectionSelect("creator-commission")}>Commission</button>
          <Link href="/merchants" onClick={props.onMenuClose}>For merchants</Link>
          <button type="button" className={styles.mobileCta} onClick={() => { props.onMenuClose(); props.onPrimaryAction(); }}>Join waitlist</button>
        </nav>
      ) : null}
    </header>
  );
}
