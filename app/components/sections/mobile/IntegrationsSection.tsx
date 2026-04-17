"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tabs as TabsPrimitive } from "radix-ui";
import { Package, Zap, LayoutGrid, ShoppingBag, Clock3 } from "lucide-react";
import { Reveal } from "../../shared/Reveal";
import { Eyebrow } from "../../shared/Eyebrow";
import { LandingButton } from "../../shared/LandingButton";
import { NotifyModal, type NotifyProduct } from "../../shared/NotifyModal";
import { usePilotModal } from "../../shared/PilotModalContext";
import { cn } from "@/app/shared/lib/utils";
import { DOCS_HREF } from "../../../content/landing";

type Visual = { kind: "gif"; src: string } | { kind: "code" } | { kind: "soon"; tag: "widget" | "shopify" };

type IntegrationTab = {
  value: string;
  label: string;
  icon: React.ReactNode;
  content: {
    status: "available" | "soon";
    title: string;
    description: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref?: string;
    secondaryLabel?: string;
    visual: Visual;
  };
};

const TABS: IntegrationTab[] = [
  {
    value: "sdk",
    label: "SDK",
    icon: <Package className="h-3.5 w-3.5 shrink-0" />,
    content: {
      status: "available",
      title: "React & JavaScript SDK",
      description:
        "A fully-typed SDK with sizing, smart-size, and virtual try-on components built in. Tree-shakable and framework-agnostic — feels native in Next.js, Vite, or plain JavaScript. Drop in three components and you have a complete fit experience without writing any UI of your own.",
      primaryHref: "#pilot",
      primaryLabel: "Apply for free pilot",
      secondaryHref: `${DOCS_HREF}#sdk`,
      secondaryLabel: "SDK Docs",
      visual: { kind: "gif", src: "/images/landing/ps/sdk-demo.gif" },
    },
  },
  {
    value: "api",
    label: "API",
    icon: <Zap className="h-3.5 w-3.5 shrink-0" />,
    content: {
      status: "available",
      title: "REST API",
      description:
        "Direct endpoints for photo sizing, smart sizing, virtual try-on, and catalog sync. Webhook events keep long-running jobs in your own queue, and a typed OpenAPI spec means clients in any language. Build the experience you want — we just return the answer.",
      primaryHref: "#pilot",
      primaryLabel: "Apply for free pilot",
      secondaryHref: `${DOCS_HREF}#api`,
      secondaryLabel: "API Reference",
      visual: { kind: "code" },
    },
  },
  {
    value: "widget",
    label: "Widget",
    icon: <LayoutGrid className="h-3.5 w-3.5 shrink-0" />,
    content: {
      status: "soon",
      title: "Drop-in Widget",
      description:
        "A single-script embed for any product page on any platform — Webflow, Wix, BigCommerce, custom storefront. No framework, no build step, no engineering. Drop the tag in, theme it, and the full sizing + try-on flow is live.",
      primaryHref: "#notify",
      primaryLabel: "Notify me",
      visual: { kind: "soon", tag: "widget" },
    },
  },
  {
    value: "shopify",
    label: "Shopify",
    icon: <ShoppingBag className="h-3.5 w-3.5 shrink-0" />,
    content: {
      status: "soon",
      title: "Shopify App",
      description:
        "A native Shopify app trained on your own size chart. Themed to match your store, live on every product page in minutes — no theme edits, no developer required.",
      primaryHref: "#notify",
      primaryLabel: "Notify me",
      visual: { kind: "soon", tag: "shopify" },
    },
  },
];

export function IntegrationsSection() {
  const [notifyProduct, setNotifyProduct] = useState<NotifyProduct | null>(null);
  const { open: openPilot } = usePilotModal();
  return (
    <section id="integrations" className="relative overflow-hidden px-5 py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 15%, rgba(218,231,255,0.6), transparent 70%)",
        }}
      />

      <Reveal variant="fade" className="mb-6 flex flex-col items-center gap-3 text-center">
        <Eyebrow>Ship it your way</Eyebrow>
        <h2 className="text-[26px] font-medium leading-[1.1] tracking-[-0.02em] text-text-primary">
          Four ways to integrate.
        </h2>
        <p className="text-[15px] leading-[1.55] text-text-body">
          SDK and REST API are live today. Widget and Shopify app are next up.
        </p>
      </Reveal>

      <Reveal variant="fade" delay={1}>
        <TabsPrimitive.Root defaultValue="sdk" className="flex flex-col gap-5">
          <TabsPrimitive.List className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <TabsPrimitive.Trigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-text-primary/10 bg-white px-4 py-2 text-sm font-medium text-text-body transition-all duration-300",
                  "data-[state=active]:border-transparent data-[state=active]:bg-gradient-to-br data-[state=active]:from-brand-blue data-[state=active]:to-brand-blue-dark",
                  "data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(33,84,239,0.25)]"
                )}
              >
                {tab.icon}
                {tab.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          {TABS.map((tab) => (
            <TabsPrimitive.Content
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex flex-col gap-4 rounded-2xl border border-brand-blue/10 bg-gradient-to-br from-white via-brand-blue-pale/30 to-white p-5 shadow-[0_8px_24px_rgba(33,84,239,0.08)]",
                "data-[state=inactive]:hidden",
                "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-400"
              )}
            >
              <TabVisualMobile tab={tab} />
              <TabCopyMobile tab={tab} onNotify={setNotifyProduct} onPilot={openPilot} />
            </TabsPrimitive.Content>
          ))}
        </TabsPrimitive.Root>
      </Reveal>

      {notifyProduct ? (
        <NotifyModal
          open={notifyProduct !== null}
          onOpenChange={(open) => {
            if (!open) setNotifyProduct(null);
          }}
          product={notifyProduct}
        />
      ) : null}
    </section>
  );
}

function TabCopyMobile({
  tab,
  onNotify,
  onPilot,
}: {
  tab: IntegrationTab;
  onNotify: (product: NotifyProduct) => void;
  onPilot: () => void;
}) {
  const { content } = tab;
  const soon = content.status === "soon";
  const notifyProduct: NotifyProduct | null =
    tab.value === "widget" ? "widget" : tab.value === "shopify" ? "shopify" : null;
  const isPilotCta = !soon && content.primaryHref === "#pilot";
  return (
    <div className="flex flex-col gap-3">
      <span
        className={cn(
          "inline-flex h-6 w-fit items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-[0.08em]",
          soon
            ? "border-text-primary/15 bg-surface-segment text-text-hint"
            : "border-status-success/25 bg-status-success/10 text-status-success"
        )}
      >
        {!soon ? <span className="h-1 w-1 rounded-full bg-status-success" /> : null}
        {soon ? "Coming soon" : "Available today"}
      </span>

      <h3 className="text-[19px] font-medium leading-[1.2] tracking-[-0.012em] text-text-primary">
        {content.title}
      </h3>
      <p className="text-[14.5px] leading-[1.65] text-text-body">{content.description}</p>

      <div className="flex flex-col gap-2 pt-1">
        {soon ? (
          <button
            type="button"
            onClick={() => notifyProduct && onNotify(notifyProduct)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-brand-blue/25 bg-white px-6 text-sm font-medium text-brand-blue-dark transition-colors cursor-pointer hover:bg-brand-blue-pale/40"
          >
            {content.primaryLabel}
          </button>
        ) : isPilotCta ? (
          <LandingButton onClick={onPilot} variant="primary" size="lg" icon="arrow-right" className="w-full">
            {content.primaryLabel}
          </LandingButton>
        ) : (
          <LandingButton href={content.primaryHref} variant="primary" size="lg" icon="arrow-right" className="w-full">
            {content.primaryLabel}
          </LandingButton>
        )}
        {content.secondaryHref ? (
          <Link
            href={content.secondaryHref}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-brand-blue"
          >
            {content.secondaryLabel} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function TabVisualMobile({ tab }: { tab: IntegrationTab }) {
  switch (tab.content.visual.kind) {
    case "gif":
      return (
        <div className="w-full max-w-full overflow-hidden rounded-xl bg-white">
          <img src={tab.content.visual.src} alt="SDK demo" className="block h-auto w-full max-w-full" />
        </div>
      );
    case "code":
      return (
        <div className="overflow-hidden rounded-xl border border-brand-blue/10 bg-[#0B1020]">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/40">
              POST /v1/sizing
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-[1.55]">
            <code>
              <span className="text-[#7DD3FC]">curl</span>
              <span className="text-white/80"> -X </span>
              <span className="text-[#FBBF24]">POST</span>
              <span className="text-white/80"> /v1/sizing </span>
              <span className="text-white/40">\</span>
              {"\n  -H "}
              <span className="text-[#A5F3FC]">{'"Authorization: Bearer $KEY"'}</span>
              <span className="text-white/40"> \</span>
              {"\n  -d "}
              <span className="text-[#A5F3FC]">{"'{"}</span>
              {"\n    "}
              <span className="text-[#C4B5FD]">{'"height_cm"'}</span>
              <span className="text-white/80">: </span>
              <span className="text-[#86EFAC]">178</span>
              <span className="text-white/80">,</span>
              {"\n    "}
              <span className="text-[#C4B5FD]">{'"weight_kg"'}</span>
              <span className="text-white/80">: </span>
              <span className="text-[#86EFAC]">72</span>
              {"\n  "}
              <span className="text-[#A5F3FC]">{"}'"}</span>
            </code>
          </pre>
        </div>
      );
    case "soon":
      return (
        <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-brand-blue/10 bg-white p-6 text-center">
          {tab.content.visual.tag === "shopify" ? (
            <Image
              src="/images/landing/ps/shopify-glyph.svg"
              alt="Shopify"
              width={56}
              height={56}
              className="grayscale opacity-60"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-pale text-brand-blue-dark">
              <LayoutGrid className="h-5 w-5" />
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-text-primary/15 bg-surface-segment px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-hint">
            <Clock3 className="h-3 w-3" />
            Coming soon
          </span>
        </div>
      );
  }
}
