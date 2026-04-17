"use client";

import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { CustomizeIcon } from "../../shared/icons";
import { SCALE, GARMENTS } from "../../../content/landing";

export function ScaleSection() {
  return (
    <section className="bg-[#F5F6F8] px-5 py-14">
      <Reveal variant="fade" className="mb-8 flex flex-col items-center gap-3 text-center">
        <Eyebrow>{SCALE.eyebrow}</Eyebrow>
        <h2 className="text-[26px] font-medium leading-[1.1] tracking-[-0.02em] text-text-primary">
          {SCALE.title}
        </h2>
      </Reveal>

      <div className="flex flex-col gap-4">
        <CustomizeCard />
        <DevicesCard />
        <LanguagesCard />
        <GarmentsCard />
      </div>
    </section>
  );
}

function CardShell({ delay, children }: { delay: 1 | 2 | 3 | 4; children: React.ReactNode }) {
  return (
    <Reveal
      delay={delay}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-brand-blue/10 bg-white"
    >
      {children}
    </Reveal>
  );
}

function CardCopy({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 pb-5 pt-4">
      <h3 className="text-base font-medium tracking-[-0.01em] text-text-primary">{title}</h3>
      <p className="text-sm leading-[1.55] text-text-body">{body}</p>
    </div>
  );
}

function CustomizeCard() {
  const card = SCALE.cards.find((c) => c.id === "customize")!;
  return (
    <CardShell delay={1}>
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-white via-brand-blue-pale/40 to-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-[0_4px_12px_rgba(33,84,239,0.12)]">
            <CustomizeIcon className="h-5 w-5 text-brand-blue-dark" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="block h-5 w-5 rounded-full border-2 border-white bg-brand-blue shadow-[0_2px_4px_rgba(0,0,0,0.08)]" />
            <span className="block h-5 w-5 rounded-full border-2 border-white bg-accent-purple shadow-[0_2px_4px_rgba(0,0,0,0.08)]" />
            <span className="block h-5 w-5 rounded-full border-2 border-white bg-brand-blue-pale shadow-[0_2px_4px_rgba(0,0,0,0.08)]" />
          </div>
        </div>
      </div>
      <CardCopy title={card.title} body={card.body} />
    </CardShell>
  );
}

function DevicesCard() {
  const card = SCALE.cards.find((c) => c.id === "devices")!;
  return (
    <CardShell delay={2}>
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-white via-brand-blue-pale/40 to-white">
        <div className="relative">
          <div className="flex h-20 w-32 flex-col overflow-hidden rounded-lg border-2 border-brand-blue/30 bg-white shadow-[0_4px_12px_rgba(33,84,239,0.12)]">
            <div className="h-2 bg-brand-blue-pale/40" />
            <div className="flex-1 p-1.5">
              <span className="block h-1 w-3/4 rounded-full bg-brand-blue/40" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-4 h-20 w-10 overflow-hidden rounded-lg border-2 border-accent-purple/30 bg-white shadow-[0_4px_12px_rgba(96,53,242,0.15)]">
            <div className="h-1.5 bg-accent-purple/10" />
          </div>
        </div>
      </div>
      <CardCopy title={card.title} body={card.body} />
    </CardShell>
  );
}

function LanguagesCard() {
  const card = SCALE.cards.find((c) => c.id === "globe")!;
  const flags = card.flags ?? [];
  const angleStep = 360 / flags.length;
  return (
    <CardShell delay={3}>
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-white via-brand-blue-pale/40 to-white">
        <div className="relative h-28 w-28">
          <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-blue to-accent-purple shadow-[0_4px_12px_rgba(33,84,239,0.25)]" />
          <div className="absolute inset-0 rounded-full border border-brand-blue/20" />
          {flags.map((code, i) => {
            const angle = angleStep * i - 90;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * 46;
            const y = Math.sin(rad) * 46;
            return (
              <div
                key={code}
                className="absolute left-1/2 top-1/2 h-5 w-5 overflow-hidden rounded-full border-2 border-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
              >
                <Image
                  src={`/images/landing/ps/ps-flag-${code}.png`}
                  alt={code}
                  width={20}
                  height={20}
                  className="h-full w-full object-cover"
                />
              </div>
            );
          })}
        </div>
      </div>
      <CardCopy title={card.title} body={card.body} />
    </CardShell>
  );
}

function GarmentsCard() {
  const card = SCALE.cards.find((c) => c.id === "garment")!;
  const sample = GARMENTS.items.slice(0, 5);
  return (
    <CardShell delay={4}>
      <div className="relative flex h-36 items-end justify-center overflow-hidden bg-gradient-to-br from-white via-brand-blue-pale/40 to-white">
        <div
          className="flex items-end gap-2 px-4"
          style={{
            maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)",
          }}
        >
          {sample.map((g) => (
            <div
              key={g.label}
              className="relative h-24 w-14 overflow-hidden rounded-lg border border-brand-blue/10 bg-white shadow-[0_4px_12px_rgba(33,84,239,0.08)]"
            >
              <Image src={g.image} alt={g.label} fill sizes="56px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
      <CardCopy title={card.title} body={card.body} />
    </CardShell>
  );
}
