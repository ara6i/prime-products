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
      <Link href="/merchants" className={styles.logoLink} aria-label="PrimeStyleAI merchants home">
        <Image
          src="/media/partner-landing/optimized/primestyleai-mark-256.webp"
          alt="PrimeStyleAI"
          width={1254}
          height={1254}
          sizes="42px"
          preload
        />
        <span>Prime Style AI</span>
      </Link>
      <nav className={styles.desktopNav} aria-label="Merchant navigation">
        <Link href="/merchants" aria-current="page">Merchants</Link>
        <button type="button" onClick={() => onSectionSelect("shopping-network")}>Your store</button>
        <button type="button" onClick={() => onSectionSelect("influencer-network")}>Creators</button>
        <button type="button" onClick={() => onSectionSelect("merchant-dashboard")}>Dashboard</button>
        <button type="button" onClick={() => onSectionSelect("pdp-studio-feature")}>PDP Studio</button>
      </nav>
      <div className={styles.headerActions}>
        <button type="button" className={styles.headerCta} onClick={onPrimaryAction}>Join the waitlist</button>
        <button type="button" className={styles.menuButton} onClick={onMenuToggle} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X size={24} /> : <List size={24} />}</button>
      </div>
      {mobileMenuOpen ? (
        <nav className={styles.mobileNav} aria-label="Mobile merchant navigation">
          <button type="button" onClick={() => onSectionSelect("shopping-network")}>Your storefront</button>
          <button type="button" onClick={() => onSectionSelect("influencer-network")}>Creator showcase</button>
          <button type="button" onClick={() => onSectionSelect("creator-discovery")}>Find creators</button>
          <button type="button" onClick={() => onSectionSelect("merchant-dashboard")}>Merchant dashboard</button>
          <button type="button" onClick={() => onSectionSelect("pdp-studio-feature")}>PDP Studio</button>
          <button type="button" className={styles.mobileCta} onClick={() => { onMenuClose(); onPrimaryAction(); }}>Join the waitlist</button>
        </nav>
      ) : null}
    </header>
  );
}
