import Image from "next/image";
import { FormatQuoteIcon } from "@/app/shared/components/icons";
import type { Testimonial } from "@/app/landing/types";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <section className="flex flex-col gap-6 py-10">
      <div className="flex flex-col gap-2 px-4">
        <h2 className="text-[22px] font-normal leading-[1.4] text-text-primary">
          What people are saying
        </h2>
        <p className="text-sm leading-[1.57] text-text-body">
          See how real users are using virtual try-on to discover outfits they actually love.
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="flex w-full flex-col gap-3 rounded-[16px] bg-landing-blue-section-bg p-4"
          >
            <FormatQuoteIcon size={24} color="var(--dashboard-chart-medium-blue)" />
            <p className="flex-1 text-sm leading-[1.57] text-black">{t.quote}</p>
            <div className="flex items-center gap-2">
              <Image
                src={t.avatar}
                alt={t.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-[1.4] text-text-primary">
                  {t.name}
                </span>
                <span className="text-xs leading-[1.4] text-text-body">{t.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
