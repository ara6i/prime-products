"use client";

import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { SectionHeading } from "../../shared/SectionHeading";
import { CustomizeIcon } from "../../shared/icons";
import { SCALE, GARMENTS } from "../../../content/landing";

export function ScaleSection() {
  return (
    <section className="bg-[#F5F6F8] px-8 py-[clamp(5rem,7vw,7rem)]">
      <div className="mx-auto flex w-[77.778vw] flex-col gap-12">
        <SectionHeading eyebrow={SCALE.eyebrow} title={SCALE.title} />

        <div className="grid grid-cols-6 gap-4">
          <CustomizeCard />
          <DevicesCard />
          <LanguagesCard />
          <GarmentsCard />
        </div>
      </div>
    </section>
  );
}

function CardShell({
  delay,
  span,
  children,
}: {
  delay: 1 | 2 | 3 | 4;
  span: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal
      delay={delay}
      className={`col-span-full ${span} relative flex flex-col overflow-hidden rounded-2xl border border-brand-blue/10 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/25 hover:shadow-[0_16px_48px_rgba(33,84,239,0.12)]`}
    >
      {children}
    </Reveal>
  );
}

function CardCopy({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative mt-auto flex flex-col gap-1.5 px-6 pb-6 pt-5">
      <h3 className="text-lg font-medium tracking-[-0.01em] text-text-primary">{title}</h3>
      <p className="text-sm leading-[1.55] text-text-body">{body}</p>
    </div>
  );
}

function CustomizeCard() {
  const card = SCALE.cards.find((c) => c.id === "customize")!;
  return (
    <CardShell delay={1} span="lg:col-span-2">
      <div className="relative flex h-48 items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(218,231,255,0.6), transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(33,84,239,0.15)]">
            <CustomizeIcon className="h-6 w-6 text-brand-blue-dark" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="h-2 w-24 rounded-full bg-brand-blue" />
            <span className="h-2 w-16 rounded-full bg-brand-blue-light" />
            <span className="h-2 w-20 rounded-full bg-accent-purple/70" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="h-6 w-6 rounded-full border-2 border-white bg-brand-blue shadow-[0_2px_6px_rgba(0,0,0,0.08)]" />
            <span className="h-6 w-6 rounded-full border-2 border-white bg-accent-purple shadow-[0_2px_6px_rgba(0,0,0,0.08)]" />
            <span className="h-6 w-6 rounded-full border-2 border-white bg-brand-blue-pale shadow-[0_2px_6px_rgba(0,0,0,0.08)]" />
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
    <CardShell delay={2} span="lg:col-span-2">
      <div className="relative flex h-48 items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,223,255,0.5), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex h-24 w-40 flex-col overflow-hidden rounded-lg border-2 border-brand-blue/30 bg-white shadow-[0_8px_24px_rgba(33,84,239,0.15)]">
            <div className="h-3 border-b border-brand-blue/10 bg-brand-blue-pale/40" />
            <div className="flex flex-1 flex-col gap-1.5 p-2">
              <span className="h-1.5 w-3/4 rounded-full bg-brand-blue/40" />
              <span className="h-1.5 w-1/2 rounded-full bg-brand-blue/20" />
              <span className="mt-auto h-4 w-16 rounded-full bg-brand-blue" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-6 flex h-28 w-14 flex-col overflow-hidden rounded-xl border-2 border-accent-purple/30 bg-white shadow-[0_8px_24px_rgba(96,53,242,0.2)]">
            <div className="h-2 border-b border-accent-purple/10 bg-accent-purple/10" />
            <div className="flex flex-1 flex-col gap-1 p-1.5">
              <span className="h-1 w-full rounded-full bg-accent-purple/40" />
              <span className="h-1 w-2/3 rounded-full bg-accent-purple/20" />
              <span className="mt-auto h-3 w-8 rounded-full bg-accent-purple" />
            </div>
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
    <CardShell delay={3} span="lg:col-span-2">
      <div className="relative flex h-48 items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(218,231,255,0.6), transparent 70%)",
          }}
        />
        <div className="relative h-36 w-36">
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-blue to-accent-purple shadow-[0_8px_24px_rgba(33,84,239,0.3)]" />
          <div className="absolute inset-0 rounded-full border border-brand-blue/20" />
          {flags.map((code, i) => {
            const angle = angleStep * i - 90;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * 60;
            const y = Math.sin(rad) * 60;
            return (
              <div
                key={code}
                className="absolute left-1/2 top-1/2 h-6 w-6 overflow-hidden rounded-full border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
                style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
              >
                <Image
                  src={`/images/landing/ps/ps-flag-${code}.png`}
                  alt={code}
                  width={24}
                  height={24}
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
  const sample = GARMENTS.items.slice(0, 6);
  return (
    <CardShell delay={4} span="lg:col-span-6">
      <div className="relative flex h-48 items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(218,231,255,0.5), transparent 75%)",
          }}
        />
        <div
          className="relative flex items-end gap-4 px-6"
          style={{
            maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)",
          }}
        >
          {sample.map((g) => (
            <div
              key={g.label}
              className="relative h-32 w-20 overflow-hidden rounded-xl border border-brand-blue/10 bg-white shadow-[0_8px_24px_rgba(33,84,239,0.08)]"
            >
              <Image src={g.image} alt={g.label} fill sizes="80px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
      <CardCopy title={card.title} body={card.body} />
    </CardShell>
  );
}
