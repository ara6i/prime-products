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
      <Link href="/" className={styles.logoLink} aria-label="PrimeStyleAI home"><Image src="/images/landing/optimized/logo-navbar-transparent.webp" alt="PrimeStyleAI virtual try-on" width={116} height={92} priority /></Link>
      <nav className={styles.desktopNav} aria-label="Merchant navigation">
        <Link href="/merchants" aria-current="page">Merchants</Link>
        <button type="button" onClick={() => onSectionSelect("connected-system")}>Connected system</button>
        <button type="button" onClick={() => onSectionSelect("merchant-capabilities")}>Capabilities</button>
        <button type="button" onClick={() => onSectionSelect("merchant-channels")}>Programs</button>
        <Link href="/influencers">For influencers</Link>
      </nav>
      <div className={styles.headerActions}>
        <Link href="/customer/login" className={styles.signIn}>Sign in</Link>
        <button type="button" className={styles.headerCta} onClick={onPrimaryAction}>Become connected</button>
        <button type="button" className={styles.menuButton} onClick={onMenuToggle} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X size={24} /> : <List size={24} />}</button>
      </div>
      {mobileMenuOpen ? (
        <nav className={styles.mobileNav} aria-label="Mobile merchant navigation">
          <button type="button" onClick={() => onSectionSelect("connected-system")}>Connected system</button>
          <button type="button" onClick={() => onSectionSelect("merchant-capabilities")}>Capabilities</button>
          <button type="button" onClick={() => onSectionSelect("merchant-channels")}>Programs</button>
          <Link href="/influencers" onClick={onMenuClose}>For influencers</Link>
          <Link href="/customer/login" onClick={onMenuClose}>Sign in</Link>
          <button type="button" className={styles.mobileCta} onClick={() => { onMenuClose(); onPrimaryAction(); }}>Become connected</button>
        </nav>
      ) : null}
    </header>
  );
}
