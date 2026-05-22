"use client";

import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { CheckIcon, SparkleIcon } from "../../shared/icons";
import { useLandingLanguage } from "@/app/landing/i18n";
import type { SdkStep } from "../../../types/landing";

export function SdkDemoSection() {
  const { content } = useLandingLanguage();
  const { sdkDemo } = content;

  return (
    <section id="sdk-demo" className="overflow-x-clip bg-white px-5 py-14">
      <Reveal variant="fade" className="flex flex-col items-center gap-3 text-center">
        <Eyebrow>{sdkDemo.eyebrow}</Eyebrow>
        <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
          {sdkDemo.title}
        </h2>
        <p className="text-base leading-[1.55] text-text-body">{sdkDemo.subtitle}</p>
      </Reveal>

      <div className="mt-10 flex flex-col gap-8">
        {sdkDemo.flow1.steps.map((s, i) => (
          <MobileStepCard key={`f1-${i}`} step={s} />
        ))}
      </div>

      <Reveal variant="fade" className="mt-12 flex justify-center">
        <Eyebrow>{sdkDemo.flow2.tag}</Eyebrow>
      </Reveal>

      <div className="mt-6 flex flex-col gap-8">
        {sdkDemo.flow2.steps.map((s, i) => (
          <MobileStepCard
            key={`f2-${i}`}
            step={s}
            aiTag={i === sdkDemo.flow2.steps.length - 1 ? sdkDemo.flow2.aiTag : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function MobileStepCard({ step, aiTag }: { step: SdkStep; aiTag?: string }) {
  return (
    <Reveal className="flex min-w-0 flex-col gap-4">
      <div className="relative aspect-[4/5] w-full max-w-full overflow-hidden">
        <Image src={step.image} alt={step.title} fill sizes="(max-width: 640px) 100vw, 600px" className="object-contain" />
        <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white font-mono text-xs font-medium text-brand-blue-dark shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          {step.num}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-[0.14em] text-brand-blue">{step.tag}</span>
        <h3 className="text-2xl font-semibold leading-tight tracking-[-0.015em] text-text-primary">{step.title}</h3>
        <p className="text-[15px] leading-[1.6] text-text-body">{step.body}</p>
      </div>
      {step.badges.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {step.badges.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-text-primary">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue-pale text-brand-blue-dark">
                <CheckIcon className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      {aiTag ? (
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-brand-blue-pale to-accent-purple-light/60 px-3 py-1.5 text-xs font-medium text-brand-blue-dark">
          <SparkleIcon className="h-3 w-3" />
          {aiTag}
        </div>
      ) : null}
    </Reveal>
  );
}
