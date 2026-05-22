"use client";

import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { CheckIcon, SparkleIcon } from "../../shared/icons";
import { useAutoAdvance } from "../../../hooks/useAutoAdvance";
import { cn } from "@/app/shared/lib/utils";
import { useLandingLanguage } from "@/app/landing/i18n";
import type { SdkStep } from "../../../types/landing";

export function SdkDemoSection() {
  const { content, translate } = useLandingLanguage();
  const { sdkDemo } = content;

  return (
    <section id="sdk-demo" className="bg-white">
      <div className="mx-auto w-[86.111vw] px-[2.222vw] pb-[clamp(3rem,5vw,5rem)] pt-[clamp(5rem,7vw,7rem)]">
        <Reveal variant="fade" className="flex flex-col items-center gap-4 text-center">
          <Eyebrow>{sdkDemo.eyebrow}</Eyebrow>
          <h2 className="text-[clamp(2.25rem,1.8rem+2.2vw,3.75rem)] font-medium leading-[1.05] tracking-[-0.025em] text-text-primary">
            {sdkDemo.title}
          </h2>
          <p className="max-w-[48ch] text-lg leading-[1.6] text-text-body">{sdkDemo.subtitle}</p>
        </Reveal>
      </div>

      <TabFlow steps={sdkDemo.flow1.steps} translate={translate} />

      <div className="mx-auto w-[86.111vw] px-[2.222vw] text-center pt-[clamp(3rem,5vw,5rem)]">
        <Reveal variant="fade">
          <Eyebrow>{sdkDemo.flow2.tag}</Eyebrow>
        </Reveal>
      </div>

      <TabFlow steps={sdkDemo.flow2.steps} aiTag={sdkDemo.flow2.aiTag} translate={translate} />
    </section>
  );
}

interface TabFlowProps {
  steps: SdkStep[];
  aiTag?: string;
  translate: (value: string, replacements?: Record<string, string | number>) => string;
}

function TabFlow({ steps, aiTag, translate }: TabFlowProps) {
  const { step, progress, jumpToStep, containerRef } = useAutoAdvance({ count: steps.length });

  return (
    <div ref={containerRef} className="py-[clamp(3rem,5vw,5rem)]">
      <div className="mx-auto grid w-[86.111vw] grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-[3.333vw] px-[2.222vw]">
        <div className="flex flex-col gap-8">
          <StepProgress steps={steps} active={step} progress={progress} onStepClick={jumpToStep} translate={translate} />
          <div className="relative min-h-[300px]">
            {steps.map((s, i) => (
              <StepSlide key={i} step={s} active={i === step} aiTag={aiTag && i === steps.length - 1 ? aiTag : undefined} />
            ))}
          </div>
        </div>

        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-text-primary/8 bg-surface-light shadow-[0_24px_64px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)]">
          {steps.map((s, i) => (
            <div
              key={i}
              className={cn(
                "absolute inset-0 transition-all duration-500",
                i === step ? "opacity-100 scale-100" : "opacity-0 scale-[0.97]"
              )}
            >
              <Image src={s.image} alt={s.title} fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepProgress({
  steps,
  active,
  progress,
  onStepClick,
  translate,
}: {
  steps: SdkStep[];
  active: number;
  progress: number;
  onStepClick: (i: number) => void;
  translate: (value: string, replacements?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex items-center gap-3" role="tablist">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <button
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => onStepClick(i)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border font-mono text-xs transition-all cursor-pointer",
              i === active
                ? "border-brand-blue bg-brand-blue text-white shadow-[0_0_0_4px_rgba(33,84,239,0.15)]"
                : i < active
                ? "border-brand-blue/40 bg-brand-blue-pale text-brand-blue-dark"
                : "border-text-primary/15 bg-white text-text-hint"
            )}
          >
            {s.num}
          </button>
          <span
            className={cn(
              "text-xs font-medium uppercase tracking-[0.1em]",
              i === active ? "text-text-primary" : "text-text-hint"
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => onStepClick(i + 1)}
              aria-label={translate("Jump to step {step}", { step: i + 2 })}
              className="relative h-px w-16 bg-text-primary/15 cursor-pointer"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-brand-blue transition-[width] duration-200 ease-linear"
                style={{
                  width:
                    i < active ? "100%" : i === active ? `${Math.max(0, Math.min(progress, 1)) * 100}%` : "0%",
                }}
              />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StepSlide({ step, active, aiTag }: { step: SdkStep; active: boolean; aiTag?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col gap-4 transition-all duration-500",
        active ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-6"
      )}
      aria-hidden={!active}
    >
      <span className="text-xs font-mono uppercase tracking-[0.14em] text-brand-blue">{step.tag}</span>
      <h3 className="text-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-text-primary">
        {step.title}
      </h3>
      <p className="max-w-[48ch] text-base leading-[1.65] text-text-body">{step.body}</p>
      {step.badges.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2">
          {step.badges.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-text-primary">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue-pale text-brand-blue-dark">
                <CheckIcon className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      {aiTag ? (
        <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-brand-blue-pale to-accent-purple-light/60 px-3.5 py-1.5 text-xs font-medium text-brand-blue-dark">
          <SparkleIcon className="h-3 w-3" />
          {aiTag}
        </div>
      ) : null}
    </div>
  );
}
