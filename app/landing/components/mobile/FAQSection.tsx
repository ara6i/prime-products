import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import {
  Button,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/app/shared/components/ui";
import { ArrowRightIcon } from "@/app/shared/components/icons";
import type { FAQItem } from "@/app/landing/types";

interface FAQSectionProps {
  faqItems: FAQItem[];
  expandedFAQ: string;
  onFAQToggle: (value: string) => void;
}

export function FAQSection({ faqItems, expandedFAQ, onFAQToggle }: FAQSectionProps) {
  return (
    <section className="flex flex-col gap-6 bg-landing-blue-section-bg px-4 py-10">
      <div className="flex flex-col gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-catalog-link-underline bg-white">
          <MessageCircleQuestion size={24} className="text-catalog-link-underline" />
        </div>
        <h2 className="text-[22px] font-normal leading-[1.4] text-text-primary">
          Questions, answered
        </h2>
        <p className="text-sm leading-[1.57] text-text-body">
          Everything you need to know about the platform, tokens, and your try-on experience.
        </p>
        <Button variant="tunal" size="sm" className="self-start" asChild>
          <Link href="#">
            View All
            <ArrowRightIcon size={16} color="var(--brand-blue-dark)" />
          </Link>
        </Button>
      </div>

      <Accordion
        type="single"
        collapsible
        value={expandedFAQ}
        onValueChange={onFAQToggle}
      >
        {faqItems.map((item, i) => (
          <AccordionItem key={item.question} value={`item-${i}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
