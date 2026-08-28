"use client";

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
import styles from "./merchantLanding.module.css";

const SOCIAL_LINKS = [
  {
    href: "https://www.instagram.com/primestyleai/",
    label: "Instagram",
    Icon: InstagramLogo,
  },
  {
    href: "https://www.linkedin.com/company/primestyleai/posts/?feedView=all",
    label: "LinkedIn",
    Icon: LinkedinLogo,
  },
  {
    href: "https://www.youtube.com/@PrimeStyleAI",
    label: "YouTube",
    Icon: YoutubeLogo,
  },
] as const;

const QUICK_LINKS = [
  { id: "influencer-network", label: "Creator network" },
  { id: "merchant-dashboard", label: "Merchant dashboard" },
  { id: "pdp-studio-feature", label: "PDP Studio" },
] as const;

type MerchantLandingFooterProps = {
  onCtaClick: () => void;
  onSectionSelect: (sectionId: string) => void;
};

export function MerchantLandingFooter({
  onCtaClick,
  onSectionSelect,
}: MerchantLandingFooterProps) {
  return (
    <footer id="site-footer" className={styles.networkFooter}>
      <div className={styles.footerFrame}>
        <section
          className={styles.footerMain}
          aria-label="PrimeStyleAI merchant footer"
        >
          <Link
            href="/"
            className={styles.footerMark}
            aria-label="PrimeStyleAI home"
          >
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
            <p>Where every product becomes a story worth buying.</p>
          </div>

          <div className={styles.footerContent}>
            <div className={styles.footerContact}>
              <h3>Contact</h3>
              <a href="mailto:support@primestyleai.com">
                <EnvelopeSimple size={16} /> support@primestyleai.com
              </a>
              <span>
                <MapPin size={16} /> Laguna Niguel, California
              </span>
              <nav aria-label="Social links">
                {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                  >
                    <Icon size={17} weight="fill" />
                  </a>
                ))}
              </nav>
            </div>

            <div className={styles.footerActions}>
              <button type="button" onClick={onCtaClick}>
                Join the waitlist <ArrowUpRight size={14} weight="bold" />
              </button>
            </div>

            <nav
              className={styles.footerQuickLinks}
              aria-label="Footer navigation"
            >
              <h3>Quick links</h3>
              {QUICK_LINKS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionSelect(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className={styles.footerLegal}>
            <span>© {new Date().getFullYear()} Prime Style AI</span>
            <nav aria-label="Legal links">
              <Link href="/privacy-policy">Privacy policy</Link>
              <Link href="/terms">Terms</Link>
              <a href="https://primestyleai.com/help-center">Merchant help</a>
            </nav>
          </div>
        </section>
      </div>
    </footer>
  );
}
