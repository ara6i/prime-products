"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Linkedin, Instagram, Youtube } from "lucide-react";
import { useLandingLanguage } from "@/app/landing/i18n";
import { FOOTER_POLICY_LINKS } from "@/app/landing/data/footerPolicyLinks";

const SOCIAL_LINKS = [
  { Icon: Linkedin, href: "https://www.linkedin.com/company/primestyleai/posts/?feedView=all", label: "LinkedIn" },
  { Icon: Instagram, href: "https://www.instagram.com/primestyleai/", label: "Instagram" },
  { Icon: Youtube, href: "https://www.youtube.com/@PrimeStyleAI", label: "YouTube" },
];

export function Footer() {
  const { t } = useLandingLanguage();
  const copyright = t.footer.copyright.replace("{year}", String(new Date().getFullYear()));

  return (
    <footer className="flex flex-col items-center gap-5 self-stretch w-full">
      <Link href="/" className="flex flex-col items-center gap-2">
        <Image
          src="/images/landing/logo-footer-6fe3f1.png"
          alt="PrimeStyleAI"
          width={120}
          height={120}
          className="object-contain w-[100px] h-[100px]"
        />
        <span className="text-[18px] font-semibold leading-tight text-text-primary tracking-[-0.01em]">
          {t.footer.brand}
        </span>
        <span className="text-[13px] leading-snug text-text-body text-center">
          {t.footer.tagline}
        </span>
      </Link>

      <div className="flex items-center gap-4">
        {SOCIAL_LINKS.map(({ Icon, href, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex items-center justify-center w-9 h-9 rounded-full text-text-body hover:text-brand-blue hover:bg-white transition-colors"
          >
            <Icon size={18} strokeWidth={1.75} />
          </a>
        ))}
      </div>

      <div className="h-px w-full bg-text-primary/10" />

      <div className="flex flex-wrap justify-center gap-2 px-2">
        {FOOTER_POLICY_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-text-primary/10 bg-white/60 px-3 py-1.5 text-[11px] font-semibold leading-[1.4] text-text-body transition-colors hover:border-brand-blue/25 hover:bg-white hover:text-brand-blue"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="h-px w-full bg-text-primary/10" />

      <div className="flex flex-col items-center gap-1.5 text-[12px] leading-[1.5] text-text-body">
        <a
          href="mailto:support@primestyleai.com"
          className="flex items-center gap-1.5 hover:text-brand-blue transition-colors"
        >
          <Mail size={13} strokeWidth={1.75} />
          support@primestyleai.com
        </a>
        <span className="flex items-center gap-1.5">
          <MapPin size={13} strokeWidth={1.75} />
          {t.footer.location}
        </span>
      </div>

      <span className="text-[11px] leading-[1.5] text-text-hint text-center">
        {copyright}
      </span>
    </footer>
  );
}
