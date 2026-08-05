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
import styles from "./influencerLanding.module.css";

const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/primestyleai/", label: "Instagram", Icon: InstagramLogo },
  { href: "https://www.linkedin.com/company/primestyleai/posts/?feedView=all", label: "LinkedIn", Icon: LinkedinLogo },
  { href: "https://www.youtube.com/@PrimeStyleAI", label: "YouTube", Icon: YoutubeLogo },
] as const;

export function InfluencerFooter() {
  return (
    <footer className={styles.networkFooter}>
      <div className={styles.footerFrame}>
        <section className={styles.footerMain} aria-label="PrimeStyleAI footer">
          <Link href="/" className={styles.footerMark} aria-label="PrimeStyleAI home">
            <Image
              src="/media/partner-landing/primestyleai-new-mark.png"
              alt="PrimeStyleAI"
              width={1254}
              height={1254}
              sizes="150px"
            />
          </Link>

          <div className={styles.footerBrand}>
            <h2>Prime Style AI</h2>
            <p>Where every look becomes a story worth sharing.</p>
          </div>

          <div className={styles.footerContent}>
            <div className={styles.footerContact}>
              <h3>Contact</h3>
              <a href="mailto:support@primestyleai.com"><EnvelopeSimple size={16} /> support@primestyleai.com</a>
              <span><MapPin size={16} /> Laguna Niguel, California</span>
              <nav aria-label="Social links">
                {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                    <Icon size={17} weight="fill" />
                  </a>
                ))}
              </nav>
            </div>

            <div className={styles.footerActions}>
              <Link href="/influencers/dashboard/outfit-studio">Open Outfit Studio <ArrowUpRight size={14} weight="bold" /></Link>
              <Link href="#creator-journey">How it works <ArrowUpRight size={14} weight="bold" /></Link>
            </div>

            <nav className={styles.footerQuickLinks} aria-label="Footer navigation">
              <h3>Quick links</h3>
              <Link href="#outfit-studio">Outfit Studio</Link>
              <Link href="#creator-journey">How creators earn</Link>
              <Link href="#creator-commission">Commission</Link>
            </nav>
          </div>

          <div className={styles.footerLegal}>
            <span>© {new Date().getFullYear()} Prime Style AI</span>
            <nav aria-label="Legal links">
              <Link href="/privacy-policy">Privacy policy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/help-center">Creator help</Link>
            </nav>
          </div>
        </section>
      </div>
    </footer>
  );
}
