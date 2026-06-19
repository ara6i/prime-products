"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tabs as TabsPrimitive } from "radix-ui";
import { Package, Zap, LayoutGrid, ShoppingBag, Clock3 } from "lucide-react";
import { Reveal } from "../../shared/Reveal";
import { SectionHeading } from "../../shared/SectionHeading";
import { LandingButton } from "../../shared/LandingButton";
import { NotifyModal, type NotifyProduct } from "../../shared/NotifyModal";
import { usePilotModal } from "../../shared/PilotModalContext";
import { cn } from "@/app/shared/lib/utils";
import { useLandingLanguage } from "@/app/landing/i18n";

const SHOPIFY_APP_HREF = "https://apps.shopify.com/primestyleai";

type Visual =
  | {
      kind: "video";
      webm: string;
      mp4: string;
      poster: string;
    }
  | { kind: "code" }
  | { kind: "soon"; tag: "widget" | "shopify" };

type IntegrationTab = {
  value: "sdk" | "api" | "widget" | "shopify";
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
    icon: <Package className="h-4 w-4 shrink-0" />,
    content: {
      status: "available",
      title: "React & JavaScript SDK",
      description:
        "A fully-typed SDK with sizing, smart-size, and virtual try-on components built in. Tree-shakable and framework-agnostic — feels native in Next.js, Vite, Remix, or plain JavaScript. Drop in three components and you have a complete fit experience without writing any UI of your own.",
      primaryHref: "#pilot",
      primaryLabel: "Apply for free pilot",
      visual: {
        kind: "video",
        webm: "/images/landing/ps/optimized/sdk-demo.webm",
        mp4: "/images/landing/ps/optimized/sdk-demo.mp4",
        poster: "/images/landing/ps/optimized/sdk-demo-poster.webp",
      },
    },
  },
  {
    value: "shopify",
    label: "Shopify",
    icon: <ShoppingBag className="h-4 w-4 shrink-0" />,
    content: {
      status: "available",
      title: "Shopify App",
      description:
        "A native Shopify app trained on your own size chart. Themed automatically to match your store and live on every product page in minutes — no theme edits, no developer required, no maintenance tax.",
      primaryHref: SHOPIFY_APP_HREF,
      primaryLabel: "Install on Shopify",
      visual: { kind: "soon", tag: "shopify" },
    },
  },
  {
    value: "api",
    label: "API",
    icon: <Zap className="h-4 w-4 shrink-0" />,
    content: {
      status: "available",
      title: "REST API",
      description:
        "Direct endpoints for photo sizing, smart sizing, virtual try-on, and catalog sync. Webhook events keep long-running jobs in your own queue, and a typed OpenAPI spec means clients in any language. Build the experience you want — we just return the answer.",
      primaryHref: "#pilot",
      primaryLabel: "Apply for free pilot",
      visual: { kind: "code" },
    },
  },
  {
    value: "widget",
    label: "Widget",
    icon: <LayoutGrid className="h-4 w-4 shrink-0" />,
    content: {
      status: "soon",
      title: "Drop-in Widget",
      description:
        "A single-script embed for any product page on any platform — Webflow, Wix, BigCommerce, or a custom storefront. No framework, no build step, no engineering. Drop the tag in, theme it to match your brand, and the full sizing + try-on flow is live.",
      primaryHref: "#notify",
      primaryLabel: "Notify me",
      visual: { kind: "soon", tag: "widget" },
    },
  },
];

export function IntegrationsSection() {
  const [notifyProduct, setNotifyProduct] = useState<NotifyProduct | null>(null);
  const { open: openPilot } = usePilotModal();
  const { translate } = useLandingLanguage();

  return (
    <section id="integrations" className="relative scroll-mt-24 overflow-hidden px-8 py-[clamp(5rem,7vw,7rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 50% 15%, rgba(218, 231, 255, 0.6), transparent 70%)",
        }}
      />

      <div className="mx-auto flex w-[86.111vw] flex-col gap-10">
        <SectionHeading
          eyebrow={translate("Ship it your way")}
          title={translate("Four ways to integrate.")}
          subtitle={translate("SDK, Shopify app, and REST API are live today. Widget is next up.")}
        />

        <Reveal variant="fade" delay={1}>
          <TabsPrimitive.Root defaultValue="sdk" className="flex flex-col gap-8">
            <TabsPrimitive.List className="mx-auto inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-text-primary/10 bg-white/70 p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm">
              {TABS.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-text-body transition-all duration-300",
                    "hover:text-text-primary",
                    "data-[state=active]:bg-gradient-to-br data-[state=active]:from-brand-blue data-[state=active]:to-brand-blue-dark",
                    "data-[state=active]:text-white data-[state=active]:shadow-[0_6px_18px_rgba(33,84,239,0.22)]"
                  )}
                >
                  {tab.icon}
                  {translate(tab.label)}
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>

            <div className="mx-auto w-full rounded-3xl border border-brand-blue/10 bg-gradient-to-br from-white via-brand-blue-pale/30 to-white p-8 shadow-[0_24px_64px_rgba(33,84,239,0.08),0_8px_24px_rgba(0,0,0,0.04)] lg:p-12">
              {TABS.map((tab) => (
                <TabsPrimitive.Content
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14",
                    "data-[state=inactive]:hidden",
                    "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-500"
                  )}
                >
                  <TabCopy tab={tab} onNotify={setNotifyProduct} onPilot={openPilot} translate={translate} />
                  <TabVisual tab={tab} translate={translate} />
                </TabsPrimitive.Content>
              ))}
            </div>
          </TabsPrimitive.Root>
        </Reveal>
      </div>

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

function TabCopy({
  tab,
  onNotify,
  onPilot,
  translate,
}: {
  tab: IntegrationTab;
  onNotify: (product: NotifyProduct) => void;
  onPilot: () => void;
  translate: (value: string, replacements?: Record<string, string | number>) => string;
}) {
  const { content } = tab;
  const soon = content.status === "soon";
  const notifyProduct: NotifyProduct | null =
    tab.value === "widget" ? "widget" : tab.value === "shopify" ? "shopify" : null;
  const isPilotCta = !soon && content.primaryHref === "#pilot";
  return (
    <div className="flex flex-col items-start gap-4">
      <span
        className={cn(
          "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-[0.08em]",
          soon
            ? "border-text-primary/15 bg-surface-segment text-text-hint"
            : "border-status-success/25 bg-status-success/10 text-status-success"
        )}
      >
        {!soon ? <span className="h-1 w-1 rounded-full bg-status-success" /> : null}
        {soon ? translate("Coming soon") : translate("Available today")}
      </span>

      <h3 className="text-[clamp(1.375rem,1.2rem+0.6vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.012em] text-text-primary">
        {translate(content.title)}
      </h3>

      <p className="max-w-[52ch] text-[15px] leading-[1.65] text-text-body">{translate(content.description)}</p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {soon ? (
          <button
            type="button"
            onClick={() => notifyProduct && onNotify(notifyProduct)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-brand-blue/20 bg-white px-5 text-sm font-medium text-brand-blue-dark transition-all cursor-pointer hover:-translate-y-0.5 hover:border-brand-blue/40 hover:bg-brand-blue-pale/40 hover:shadow-[0_6px_18px_rgba(33,84,239,0.12)]"
          >
            {translate(content.primaryLabel)}
          </button>
        ) : isPilotCta ? (
          <LandingButton onClick={onPilot} variant="primary" size="lg" icon="arrow-right">
            {translate(content.primaryLabel)}
          </LandingButton>
        ) : (
          <LandingButton href={content.primaryHref} variant="primary" size="lg" icon="arrow-right">
            {translate(content.primaryLabel)}
          </LandingButton>
        )}
        {content.secondaryHref ? (
          <Link
            href={content.secondaryHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue transition-colors hover:text-brand-blue-dark"
          >
            {content.secondaryLabel ? translate(content.secondaryLabel) : null} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function TabVisual({
  tab,
  translate,
}: {
  tab: IntegrationTab;
  translate: (value: string, replacements?: Record<string, string | number>) => string;
}) {
  switch (tab.content.visual.kind) {
    case "video":
      return <VideoFrame visual={tab.content.visual} translate={translate} />;
    case "code":
      return <CodeFrame />;
    case "soon":
      return <SoonFrame tag={tab.content.visual.tag} translate={translate} />;
  }
}

function VideoFrame({
  visual,
  translate,
}: {
  visual: Extract<Visual, { kind: "video" }>;
  translate: (value: string, replacements?: Record<string, string | number>) => string;
}) {
  return (
    <video
      aria-label={translate("SDK demo")}
      autoPlay
      loop
      muted
      playsInline
      poster={visual.poster}
      preload="none"
      className="w-full rounded-2xl shadow-[0_16px_48px_rgba(33,84,239,0.1)]"
    >
      <source src={visual.webm} type="video/webm" />
      <source src={visual.mp4} type="video/mp4" />
    </video>
  );
}

function CodeFrame() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-brand-blue/10 bg-[#0B1020] shadow-[0_16px_48px_rgba(33,84,239,0.18)]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
          POST /v1/sizing
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-[1.6]">
        <code>
          <span className="text-[#7DD3FC]">curl</span>
          <span className="text-white/80"> -X </span>
          <span className="text-[#FBBF24]">POST</span>
          <span className="text-white/80"> https://api.primestyle.ai/v1/sizing </span>
          <span className="text-white/40">\</span>
          {"\n  "}
          <span className="text-white/80">-H </span>
          <span className="text-[#A5F3FC]">{'"Authorization: Bearer $PS_KEY"'}</span>
          <span className="text-white/40"> \</span>
          {"\n  "}
          <span className="text-white/80">-H </span>
          <span className="text-[#A5F3FC]">{'"Content-Type: application/json"'}</span>
          <span className="text-white/40"> \</span>
          {"\n  "}
          <span className="text-white/80">-d </span>
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
          <span className="text-white/80">,</span>
          {"\n    "}
          <span className="text-[#C4B5FD]">{'"product_id"'}</span>
          <span className="text-white/80">: </span>
          <span className="text-[#A5F3FC]">{'"jkt_001"'}</span>
          {"\n  "}
          <span className="text-[#A5F3FC]">{"}'"}</span>
        </code>
      </pre>
    </div>
  );
}

function SoonFrame({
  tag,
  translate,
}: {
  tag: "widget" | "shopify";
  translate: (value: string, replacements?: Record<string, string | number>) => string;
}) {
  return (
    <div className="relative flex aspect-[5/4] w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-brand-blue/10 bg-white p-10 text-center shadow-[0_16px_48px_rgba(33,84,239,0.08)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(218,231,255,0.6), transparent 70%)" }}
      />

      {tag === "shopify" ? (
        <Image
          src="/images/landing/ps/shopify-glyph.svg"
          alt="Shopify"
          width={72}
          height={72}
          className="relative grayscale opacity-60"
        />
      ) : (
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue-pale text-brand-blue-dark">
          <LayoutGrid className="h-7 w-7" />
        </div>
      )}

      <div className="relative flex flex-col items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-text-primary/15 bg-surface-segment px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-hint">
          <Clock3 className="h-3 w-3" />
          {translate("Coming soon")}
        </span>
        <span className="font-mono text-xs text-text-hint">
          {tag === "shopify" ? translate("Shopify App") : translate("Drop-in Widget")}
        </span>
      </div>
    </div>
  );
}
