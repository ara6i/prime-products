"use client";

import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { QuoteIcon } from "../../shared/icons";
import { PROBLEM } from "../../../content/landing";

export function ProblemSection() {
  return (
    <section className="bg-[#F5F6F8] px-5 py-14">
      <div className="flex flex-col items-center gap-6 text-center">
        <Reveal variant="fade" className="flex flex-col items-center gap-3">
          <Eyebrow>{PROBLEM.eyebrow}</Eyebrow>
          <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
            {PROBLEM.headline}
          </h2>
        </Reveal>

        <Reveal delay={1}>
          <p className="text-base leading-[1.6] text-text-body">{PROBLEM.body}</p>
        </Reveal>

        <Reveal
          variant="scale"
          delay={2}
          className="mt-2 flex flex-col items-start gap-3 rounded-2xl border-l-[3px] border-brand-blue bg-white px-5 py-5 text-left"
        >
          <QuoteIcon className="h-6 w-6 text-brand-blue/40" />
          <blockquote className="font-serif text-xl italic leading-[1.35] text-text-primary">
            {PROBLEM.pullquote}
          </blockquote>
          <figcaption className="text-sm leading-[1.5] text-text-body">{PROBLEM.pullquoteFooter}</figcaption>
        </Reveal>
      </div>
    </section>
  );
}
