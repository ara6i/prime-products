"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Linkedin, Instagram, Youtube } from "lucide-react";
import { useScrollFadeIn } from "@/app/landing/hooks/useScrollAnimation";
import { useLandingLanguage } from "@/app/landing/i18n";
import { FOOTER_POLICY_LINKS } from "@/app/landing/data/footerPolicyLinks";

const SOCIAL_LINKS = [
  { Icon: Linkedin, href: "https://www.linkedin.com/company/primestyleai/posts/?feedView=all", label: "LinkedIn" },
  { Icon: Instagram, href: "https://www.instagram.com/primestyleai/", label: "Instagram" },
  { Icon: Youtube, href: "https://www.youtube.com/@PrimeStyleAI", label: "YouTube" },
];

export function Footer() {
  const ref = useScrollFadeIn({ duration: 0.8 });
  const { t } = useLandingLanguage();
  const copyright = t.footer.copyright.replace("{year}", String(new Date().getFullYear()));

  return (
    <footer ref={ref} className="flex flex-col self-stretch w-full">
      <div className="flex items-start justify-between gap-[2vw] pt-[1.5vw] pb-[1.25vw]">
        <Link href="/" className="flex items-center gap-[1.25vw]">
          <Image
            src="/images/landing/logo-footer-6fe3f1.png"
            alt="PrimeStyleAI"
            width={200}
            height={200}
            className="object-contain shrink-0 w-[7vw] h-[7vw]"
          />
          <div className="flex flex-col gap-[0.25vw]">
            <span className="text-[1.458vw] font-semibold leading-[1.2] text-text-primary tracking-[-0.01em]">
              {t.footer.brand}
            </span>
            <span className="text-[0.938vw] leading-[1.4] text-text-body">
              {t.footer.tagline}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-[0.6vw] pt-[0.625vw]">
          {SOCIAL_LINKS.map(({ Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex items-center justify-center w-[2vw] h-[2vw] rounded-full text-text-body hover:text-brand-blue hover:bg-white transition-colors"
            >
              <Icon className="w-[1vw] h-[1vw]" strokeWidth={1.75} />
            </a>
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-text-primary/10" />

      <div className="flex flex-wrap items-center justify-center gap-[0.65vw] py-[0.95vw]">
        {FOOTER_POLICY_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-text-primary/10 bg-white/55 px-[0.95vw] py-[0.42vw] text-[0.729vw] font-semibold leading-[1.4] text-text-body transition-colors hover:border-brand-blue/25 hover:bg-white hover:text-brand-blue"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="h-px w-full bg-text-primary/10" />

      <div className="flex items-center justify-between gap-[1vw] py-[1vw] text-[0.729vw] leading-[1.5] text-text-body">
        <span>{copyright}</span>
        <div className="flex items-center gap-[1.5vw]">
          <a
            href="mailto:support@primestyleai.com"
            className="flex items-center gap-[0.35vw] hover:text-brand-blue transition-colors"
          >
            <Mail className="w-[0.85vw] h-[0.85vw]" strokeWidth={1.75} />
            support@primestyleai.com
          </a>
          <span className="flex items-center gap-[0.35vw]">
            <MapPin className="w-[0.85vw] h-[0.85vw]" strokeWidth={1.75} />
            {t.footer.location}
          </span>
        </div>
      </div>
    </footer>
  );
}
