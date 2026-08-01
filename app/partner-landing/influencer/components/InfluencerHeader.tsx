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
      <Link href="/" className={styles.logoLink} aria-label="PrimeStyleAI home">
        <Image src="/images/landing/optimized/logo-navbar-transparent.webp" alt="PrimeStyleAI virtual try-on" width={116} height={92} priority />
      </Link>
      <nav className={styles.desktopNav} aria-label="Influencer navigation">
        <Link href="/influencers" aria-current="page">Influencers</Link>
        <button type="button" onClick={() => props.onSectionSelect("creator-tools")}>Creator tools</button>
        <button type="button" onClick={() => props.onSectionSelect("creator-journey")}>How you earn</button>
        <button type="button" onClick={() => props.onSectionSelect("creator-commission")}>Commission</button>
        <Link href="/merchants">For merchants</Link>
      </nav>
      <div className={styles.headerActions}>
        <Link href="/customer/login" className={styles.signIn}>Sign in</Link>
        <button type="button" className={styles.headerCta} onClick={props.onPrimaryAction}>Start earning</button>
        <button type="button" className={styles.menuButton} onClick={props.onMenuToggle} aria-label={props.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={props.mobileMenuOpen}>
          {props.mobileMenuOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </div>
      {props.mobileMenuOpen ? (
        <nav className={styles.mobileNav} aria-label="Mobile influencer navigation">
          <button type="button" onClick={() => props.onSectionSelect("creator-tools")}>Creator tools</button>
          <button type="button" onClick={() => props.onSectionSelect("creator-journey")}>How you earn</button>
          <button type="button" onClick={() => props.onSectionSelect("creator-commission")}>Commission</button>
          <Link href="/merchants" onClick={props.onMenuClose}>For merchants</Link>
          <Link href="/customer/login" onClick={props.onMenuClose}>Sign in</Link>
          <button type="button" className={styles.mobileCta} onClick={() => { props.onMenuClose(); props.onPrimaryAction(); }}>Start earning</button>
        </nav>
      ) : null}
    </header>
  );
}
