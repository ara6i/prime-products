import { List, X } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import styles from "./merchantLanding.module.css";

export function MerchantHeader({ mobileMenuOpen, onMenuToggle, onMenuClose, onPrimaryAction, onSectionSelect }: {
  mobileMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onPrimaryAction: () => void;
  onSectionSelect: (id: string) => void;
}) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logoLink} aria-label="PrimeStyleAI home"><Image src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp" alt="PrimeStyleAI" width={600} height={471} sizes="64px" priority /></Link>
      <nav className={styles.desktopNav} aria-label="Merchant navigation">
        <button type="button" onClick={() => onSectionSelect("influencer-network")}>Creators</button>
        <button type="button" onClick={() => onSectionSelect("merchant-dashboard")}>Dashboard</button>
        <button type="button" onClick={() => onSectionSelect("pdp-studio-feature")}>PDP Studio</button>
      </nav>
      <div className={styles.headerActions}>
        <Link className={styles.signIn} href="/login">Sign in</Link>
        <button type="button" className={styles.headerCta} onClick={onPrimaryAction}>Join the network</button>
        <button type="button" className={styles.menuButton} onClick={onMenuToggle} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X size={24} /> : <List size={24} />}</button>
      </div>
      {mobileMenuOpen ? (
        <nav className={styles.mobileNav} aria-label="Mobile merchant navigation">
          <button type="button" onClick={() => onSectionSelect("influencer-network")}>Creator showcase</button>
          <button type="button" onClick={() => onSectionSelect("creator-discovery")}>Find creators</button>
          <button type="button" onClick={() => onSectionSelect("merchant-dashboard")}>Merchant dashboard</button>
          <button type="button" onClick={() => onSectionSelect("pdp-studio-feature")}>PDP Studio</button>
          <Link href="/login" onClick={onMenuClose}>Sign in</Link>
          <button type="button" className={styles.mobileCta} onClick={() => { onMenuClose(); onPrimaryAction(); }}>Join the network</button>
        </nav>
      ) : null}
    </header>
  );
}
