import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Gauge,
  PanelsTopLeft,
  Ruler,
  ScanLine,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const metadata = {
  title: "Test Lab - PrimeStyleAI",
};

const LABS = [
  {
    title: "Try-On Test",
    description:
      "Run the SDK virtual try-on flow against local and staging data.",
    href: "/try-on-test",
    icon: Activity,
  },
  {
    title: "AI Sizing Lab",
    description:
      "Debug size-chart parsing, measurements, and recommendation output.",
    href: "/try-on-test/sizing-lab",
    icon: Ruler,
  },
  {
    title: "SDK · WEAR Mesh",
    description:
      "Test any of the 448 held-out WEAR meshes and inspect nearest matches by body part.",
    href: "/try-on-test/sdk-wear-mesh",
    icon: ScanSearch,
  },
  {
    title: "3D Teacher Proof · 10",
    description:
      "Inspect ten real WEAR scans, exact body sections, depth, contours, ratios, and teacher pass/fail gates in Blender-style 3D.",
    href: "/try-on-test/wear-teacher-proof",
    icon: ScanLine,
  },
  {
    title: "Capacity Lab",
    description:
      "Check capacity routes, scenarios, and request safety before testing load.",
    href: "/try-on-test/capacity-lab",
    icon: Gauge,
  },
  {
    title: "AI Stylist",
    description:
      "Monitor Trendsi intake, catalog preparation, Luna enrichment, and stylist publishing.",
    href: "/try-on-test/ai-stylist",
    icon: Sparkles,
  },
  {
    title: "PDP Studio",
    description:
      "Draft PDP prompts with a photo input and product cloth image.",
    href: "/try-on-test/pdp-studio",
    icon: PanelsTopLeft,
  },
] as const;

export default async function TestLabPage() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-5 py-10 text-text-primary">
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-[28px] border border-[#dbe4f4] bg-white p-6 shadow-[0_24px_80px_rgba(33,84,239,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
            Local tools
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#0d1324] sm:text-5xl">
            PrimeStyleAI Test Lab
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-body">
            Internal test routes for try-on, sizing, capacity, catalog
            enrichment, and PDP checks.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {LABS.map((lab) => {
              const Icon = lab.icon;
              return (
                <Link
                  key={lab.href}
                  href={lab.href}
                  className="group flex min-h-[220px] flex-col rounded-2xl border border-[#dbe4f4] bg-[#f8fbff] p-5 transition hover:-translate-y-0.5 hover:border-brand-blue/40 hover:bg-white hover:shadow-[0_18px_50px_rgba(33,84,239,0.14)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#0d1324]">
                    {lab.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-text-body">
                    {lab.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue">
                    Open lab
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
