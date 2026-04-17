"use client";

import { useState } from "react";
import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { cn } from "@/app/shared/lib/utils";
import { FEATURES } from "../../../content/landing";

export function FeaturesSection() {
  const [active, setActive] = useState(0);
  const tabs = FEATURES.tabs;
  const tab = tabs[active];

  return (
    <section className="overflow-x-clip px-5 py-14">
      <Reveal variant="fade" className="mb-8 flex flex-col items-center gap-3 text-center">
        <Eyebrow>{FEATURES.eyebrow}</Eyebrow>
        <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
          {FEATURES.title}
        </h2>
      </Reveal>

      <Reveal variant="fade" delay={1} className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-2 [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
              active === i
                ? "border-brand-blue bg-brand-blue-pale text-brand-blue-dark"
                : "border-text-primary/10 bg-white text-text-body"
            )}
          >
            <span className="text-[10px] font-mono text-text-hint">0{i + 1}</span>
            {t.label}
          </button>
        ))}
      </Reveal>

      <Reveal delay={2}>
        <div key={active} className="flex flex-col gap-4 animate-in fade-in duration-400">
          <div className="relative aspect-[4/5] w-full max-w-full overflow-hidden rounded-2xl border border-text-primary/8 bg-surface-light">
            <Image src={tab.image} alt={tab.title} fill sizes="(max-width: 640px) 100vw, 600px" className="object-contain" />
          </div>
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-brand-blue">
            Capability 0{active + 1}
          </span>
          <h3 className="text-2xl font-semibold leading-tight tracking-[-0.015em] text-text-primary">
            {tab.title}
          </h3>
          <p className="text-[15px] leading-[1.6] text-text-body">{tab.body}</p>
        </div>
      </Reveal>
    </section>
  );
}
