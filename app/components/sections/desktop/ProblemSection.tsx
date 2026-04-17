"use client";

import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { QuoteIcon } from "../../shared/icons";
import { PROBLEM } from "../../../content/landing";

export function ProblemSection() {
  return (
    <section className="bg-[#F5F6F8] px-8 py-[clamp(5rem,7vw,7rem)]">
      <div className="mx-auto flex w-[59.722vw] flex-col items-center gap-8 text-center">
        <Reveal variant="fade" className="flex flex-col items-center gap-4">
          <Eyebrow>{PROBLEM.eyebrow}</Eyebrow>
          <h2 className="text-[clamp(2.25rem,1.8rem+2.2vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-text-primary">
            {PROBLEM.headline}
          </h2>
        </Reveal>

        <Reveal delay={1}>
          <p className="text-lg leading-[1.65] text-text-body">{PROBLEM.body}</p>
        </Reveal>

        <Reveal
          variant="scale"
          delay={2}
          className="mt-4 flex w-[52.778vw] max-w-full flex-col items-start gap-4 rounded-2xl border-l-[3px] border-brand-blue bg-white px-8 py-8 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <QuoteIcon className="h-8 w-8 text-brand-blue/40" />
          <blockquote className="font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.75rem)] italic leading-[1.35] text-text-primary">
            {PROBLEM.pullquote}
          </blockquote>
          <figcaption className="text-sm leading-[1.55] text-text-body">{PROBLEM.pullquoteFooter}</figcaption>
        </Reveal>
      </div>
    </section>
  );
}
