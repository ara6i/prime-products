"use client";

import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin, Mail, MapPin, Youtube } from "lucide-react";
import { FOOTER_POLICY_LINKS } from "@/app/landing/data/footerPolicyLinks";

const SOCIAL_LINKS = [
  { Icon: Linkedin, href: "https://www.linkedin.com/company/primestyleai/posts/?feedView=all", label: "LinkedIn" },
  { Icon: Instagram, href: "https://www.instagram.com/primestyleai/", label: "Instagram" },
  { Icon: Youtube, href: "https://www.youtube.com/@PrimeStyleAI", label: "YouTube" },
];

export function DemoFooter() {
  return (
    <footer className="border-t border-brand-blue/10 bg-brand-blue-pale px-5 py-7 sm:px-6 lg:px-[7.292vw] lg:py-[2vw]">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-5 lg:gap-[1.15vw]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/landing/logo-footer-6fe3f1.png"
              alt="PrimeStyleAI"
              width={56}
              height={56}
              className="h-11 w-11 shrink-0 object-contain lg:h-[3.4vw] lg:w-[3.4vw]"
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-base font-semibold leading-tight text-text-primary lg:text-[1.05vw]">
                PrimeStyleAI
              </span>
              <span className="text-sm leading-snug text-text-body lg:text-[0.78vw]">
                AI sizing and virtual try-on
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {SOCIAL_LINKS.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-text-primary/10 bg-white/65 text-text-body transition-colors hover:border-brand-blue/25 hover:text-brand-blue lg:h-[2vw] lg:w-[2vw]"
              >
                <Icon className="h-4 w-4 lg:h-[0.9vw] lg:w-[0.9vw]" strokeWidth={1.8} />
              </a>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-text-primary/10" />

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center lg:gap-[0.55vw]">
          {FOOTER_POLICY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-text-primary/10 bg-white/60 px-3 py-2 text-center text-xs font-semibold leading-tight text-text-body transition-colors hover:border-brand-blue/25 hover:bg-white hover:text-brand-blue sm:px-3.5 lg:px-[0.85vw] lg:py-[0.38vw] lg:text-[0.68vw]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="h-px w-full bg-text-primary/10" />

        <div className="flex flex-col gap-3 text-xs leading-relaxed text-text-body sm:flex-row sm:items-center sm:justify-between lg:text-[0.72vw]">
          <span className="text-text-hint">&copy; {new Date().getFullYear()} PrimeStyleAI. All rights reserved.</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5 lg:gap-[1.2vw]">
            <a href="mailto:support@primestyleai.com" className="flex items-center gap-1.5 transition-colors hover:text-brand-blue">
              <Mail className="h-3.5 w-3.5 lg:h-[0.78vw] lg:w-[0.78vw]" strokeWidth={1.8} />
              support@primestyleai.com
            </a>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 lg:h-[0.78vw] lg:w-[0.78vw]" strokeWidth={1.8} />
              Delaware, United States
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
