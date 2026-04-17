"use client";

import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { Button, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/app/shared/components/ui";
import { ArrowRightIcon } from "@/app/shared/components/icons";
import { useScrollSlideIn, useScrollFadeUp } from "@/app/landing/hooks/useScrollAnimation";
import type { FAQItem } from "@/app/landing/types";

interface FAQSectionProps {
  faqItems: FAQItem[];
  expandedFAQ: string;
  onFAQToggle: (value: string) => void;
}

export function FAQSection({ faqItems, expandedFAQ, onFAQToggle }: FAQSectionProps) {
  const sidebarRef = useScrollSlideIn("left", { duration: 0.8 });
  const accordionRef = useScrollFadeUp({ delay: 0.2 });

  return (
    <section className="flex items-start gap-[2.5vw] w-full px-[7.292vw] py-[5.208vw] bg-landing-blue-section-bg">
      <div ref={sidebarRef} className="flex flex-col gap-[1.25vw] w-[20.833vw] shrink-0">
        <div className="w-[4.167vw] h-[4.167vw] rounded-full bg-white border border-catalog-link-underline flex items-center justify-center">
          <MessageCircleQuestion className="text-catalog-link-underline w-[1.875vw] h-[1.875vw]" />
        </div>
        <h2 className="text-[1.667vw] leading-[1.5] text-text-primary font-normal">
          Questions, answered
        </h2>
        <p className="text-[1.042vw] leading-[1.7] text-text-body">
          Everything you need to know about how the platform works, token usage,
          and your try-on experience.
        </p>
        <Button variant="tunal" size="default" className="h-[2.604vw] px-[0.833vw] text-[0.833vw] rounded-[52.083vw]" asChild>
          <Link href="#">
            View All
            <ArrowRightIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="var(--brand-blue-dark)" />
          </Link>
        </Button>
      </div>

      <div ref={accordionRef} className="flex-1">
        <Accordion type="single" collapsible value={expandedFAQ} onValueChange={onFAQToggle}>
          {faqItems.map((item, i) => (
            <AccordionItem key={item.question} value={`item-${i}`}>
              <AccordionTrigger className="text-[1.042vw] py-[1.042vw] [&>span]:w-[1.042vw] [&>span]:h-[1.042vw] [&_svg]:!w-[1.042vw] [&_svg]:!h-[1.042vw]">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-[1.042vw] leading-[1.7] pb-[1.042vw]">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
