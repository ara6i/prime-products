"use client";

import { DeveloperNavbar } from "@/app/components/shared/DeveloperNavbar";
import { MobileDeveloperNavbar } from "@/app/components/shared/MobileDeveloperNavbar";
import { PilotModalProvider } from "@/app/components/shared/PilotModalContext";
import { Footer } from "@/app/landing/components/desktop/Footer";
import type { CatalogProductViewModel } from "@/app/dashboard/catalog/mapper/catalogMapper";
import { ProductShowcase } from "./ProductShowcase";
import { CodePanel } from "./CodePanel";

interface DemoContentProps {
  product: CatalogProductViewModel;
  isLoggedIn: boolean;
}

export function DemoContent({ product }: DemoContentProps) {
  return (
    <PilotModalProvider>
    <div className="flex flex-col w-full min-h-screen bg-white text-text-primary">
      <div className="hidden lg:block"><DeveloperNavbar /></div>
      <div className="lg:hidden"><MobileDeveloperNavbar /></div>

      {/* Hero */}
      <div className="border-b border-border-light bg-dev-section-bg">
        <div className="lg:w-[88vw] mx-auto px-4 sm:px-6 lg:px-[2vw] py-8 sm:py-12 lg:py-[2vw] text-center">
          <div className="inline-flex items-center gap-2 lg:gap-[0.3vw] px-3 py-1 lg:px-[0.6vw] lg:py-[0.2vw] rounded-full bg-dev-badge-bg border border-dev-badge-border text-dev-badge-text text-xs lg:text-[0.8vw] font-medium mb-4 lg:mb-[0.6vw]">
            Live Demo
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-[2.8vw] font-bold text-text-primary mb-3 lg:mb-[0.5vw]">
            SDK in Action
          </h1>
          <p className="text-text-body max-w-xl mx-auto text-sm sm:text-base lg:text-[1vw]">
            See how the PrimeStyle Try-On React SDK works on a real product page.
            The button below is a live{" "}
            <code className="text-brand-blue bg-brand-blue-pale px-1.5 py-0.5 rounded text-xs lg:text-[0.8vw] font-mono">
              {"<PrimeStyleTryon />"}
            </code>{" "}
            component powered by our API.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <div className="lg:w-[88vw] mx-auto px-4 sm:px-6 lg:px-[2vw] py-8 sm:py-12 lg:py-[2vw]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-[1.5vw]">
            {/* Product page (left) */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-dev-card-border bg-dev-card-bg overflow-hidden shadow-card-elevated">
                <div className="px-4 py-3 lg:px-[0.8vw] lg:py-[0.5vw] border-b border-border-light flex items-center gap-2 lg:gap-[0.3vw]">
                  <div className="flex gap-1.5 lg:gap-[0.2vw]">
                    <span className="size-3 lg:size-[0.25vw] rounded-full bg-red-500/80" />
                    <span className="size-3 lg:size-[0.25vw] rounded-full bg-yellow-500/80" />
                    <span className="size-3 lg:size-[0.25vw] rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs lg:text-[0.7vw] text-text-hint font-mono ml-2 lg:ml-[0.3vw]">
                    yourstore.com/products/{product.product_id.slice(0, 8)}
                  </span>
                </div>
                <ProductShowcase product={product} />
              </div>
            </div>

            {/* Code panel (right) */}
            <div className="lg:col-span-2">
              <CodePanel productImage={product.image_urls[0]} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-[1.25vw] bg-brand-blue-pale px-[7.292vw] py-[2.5vw]">
        <Footer />
      </div>
    </div>
    </PilotModalProvider>
  );
}
