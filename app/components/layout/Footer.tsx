"use client";

import Image from "next/image";
import { Mail, Phone, MapPin, Linkedin, Instagram, Youtube } from "lucide-react";

const FOOTER_LINKS = [
  {
    title: "Product",
    links: ["Outfit Builder", "Virtual Try-On", "Style Quiz", "Pricing", "Premium Features", "Mobile App"],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Press Kit", "Blog", "Contact"],
  },
  {
    title: "Support",
    links: ["Help Center", "Size Guide", "Returns", "Shipping info", "FAQ"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR Compliance"],
  },
];

export function Footer() {
  return (
    <footer className="flex flex-col self-stretch">
      <div className="h-0 border-t-[0.5px] border-product-card-selected-border" />

      <div className="flex self-stretch">
        <div className="flex flex-col gap-[1.042vw] w-[21.667vw] shrink-0 pb-[1.042vw]">
          <div className="flex items-center gap-[0.833vw] pt-[1.042vw]">
            <Image
              src="/images/landing/logo-footer-6fe3f1.png"
              alt="PrimeStyleAI"
              width={100}
              height={100}
              className="object-contain shrink-0 w-[5.208vw] h-[5.208vw]"
            />
            <p className="text-[0.729vw] leading-[1.57] text-text-primary font-normal flex-1">
              Revolutionizing personal styling with AI-powered fashion
              recommendations. Discover your perfect style and build confidence
              through intelligent outfit suggestions.
            </p>
          </div>

          <div className="h-0 border-t-[0.5px] border-product-card-selected-border" />

          <div className="flex flex-col gap-[0.625vw]">
            <div className="flex items-center gap-[0.417vw]">
              <Mail className="text-catalog-link-underline shrink-0 w-[1.042vw] h-[1.042vw]" />
              <span className="text-[0.833vw] leading-[1.625] text-text-primary font-normal">
                Support@primestyleai.com
              </span>
            </div>
            <div className="flex items-center gap-[0.417vw]">
              <Phone className="text-catalog-link-underline shrink-0 w-[1.042vw] h-[1.042vw]" />
              <span className="text-[0.833vw] leading-[1.625] text-text-primary font-normal">
                +1 (949) 364-4449
              </span>
            </div>
            <div className="flex items-center gap-[0.417vw]">
              <MapPin className="text-catalog-link-underline shrink-0 w-[1.042vw] h-[1.042vw]" />
              <span className="text-[0.833vw] leading-[1.625] text-text-primary font-normal">
                1968 S. Coast Hwy #4471, Laguna Beach, CA 92651
              </span>
            </div>
          </div>

          <div className="h-0 border-t-[0.5px] border-product-card-selected-border" />

          <div className="flex items-end gap-[1.979vw]">
            <Linkedin className="text-catalog-nav-text w-[1.25vw] h-[1.25vw]" />
            <Instagram className="text-catalog-nav-text w-[1.25vw] h-[1.25vw]" />
            <Youtube className="text-catalog-nav-text w-[1.25vw] h-[1.25vw]" />
          </div>
        </div>

        <div className="h-auto w-0 border-l-[0.5px] border-product-card-selected-border" />

        {FOOTER_LINKS.map((group, i) => (
          <div key={group.title} className="flex flex-1">
            <div className="flex flex-col gap-[0.625vw] flex-1 pt-[1.042vw] px-[1.042vw]">
              <span className="text-[0.833vw] leading-[1.625] text-text-hint font-normal">
                {group.title}
              </span>
              {group.links.map((link) => (
                <span
                  key={link}
                  className="text-[0.833vw] leading-[1.625] text-text-primary font-normal cursor-pointer hover:text-brand-blue transition-colors"
                >
                  {link}
                </span>
              ))}
            </div>
            {i < FOOTER_LINKS.length - 1 && (
              <div className="h-auto w-0 border-l-[0.5px] border-product-card-selected-border" />
            )}
          </div>
        ))}
      </div>

      <div className="h-0 border-t-[0.5px] border-product-card-selected-border" />

      <div className="flex justify-center py-[1.042vw]">
        <span className="text-[0.833vw] leading-[1.625] text-text-body font-normal">
          © {new Date().getFullYear()} PrimeStyleAI. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
