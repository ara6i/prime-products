"use client";

import { useState, useCallback } from "react";
import {
  STATS,
  FEATURES,
  HOW_IT_WORKS_STEPS,
  PROBLEMS,
  SOLUTIONS,
  PRICING_PACKS,
  FAQ_ITEMS,
  TESTIMONIALS,
  FOOTER_LINK_GROUPS,
  BRAND_LOGOS,
  MEDIA_LOGOS,
} from "@/app/landing/data";

export function useLanding() {
  const [expandedFAQ, setExpandedFAQ] = useState("item-0");
  const [email, setEmail] = useState("");

  const handleFAQToggle = useCallback((value: string) => {
    setExpandedFAQ(value);
  }, []);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
    },
    []
  );

  const handleSubscribe = useCallback(() => {
    setEmail("");
  }, []);

  return {
    stats: STATS,
    features: FEATURES,
    steps: HOW_IT_WORKS_STEPS,
    problems: PROBLEMS,
    solutions: SOLUTIONS,
    pricingPacks: PRICING_PACKS,
    faqItems: FAQ_ITEMS,
    testimonials: TESTIMONIALS,
    footerLinks: FOOTER_LINK_GROUPS,
    brandLogos: BRAND_LOGOS,
    mediaLogos: MEDIA_LOGOS,
    expandedFAQ,
    email,
    handleFAQToggle,
    handleEmailChange,
    handleSubscribe,
  };
}
