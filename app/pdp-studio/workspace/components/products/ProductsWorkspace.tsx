"use client";

import { useState } from "react";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

export function ProductsWorkspace() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="grid gap-8 py-6">
      <section className="mx-auto grid min-h-[32rem] w-full max-w-2xl place-items-center text-center">
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#e8f7e8] text-[#168343]">
            <PdpStudioUiIcon name="shopify" size={32} />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Connect your Shopify store</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-pdp-muted)]">
            Boost product sales by creating pro-quality visuals for your Shopify store.
            Install the PrimeStyleAI Listing Assistant app and connect your store to one
            of your Spaces.
          </p>
          <ul className="mx-auto mt-6 grid max-w-md gap-3 text-left text-sm">
            {[
              "Publish listings directly from PrimeStyleAI",
              "Sync product images and variants",
              "Manage product variants at scale",
              "Automatically optimize image metadata",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <PdpStudioUiIcon name="check" size={18} className="text-[var(--color-pdp-accent)]" />
                {item}
              </li>
            ))}
          </ul>
          <PdpStudioButton type="button" onClick={() => setShowNotice(true)} className="mt-7">
            Connect to Shopify
          </PdpStudioButton>
          {showNotice ? (
            <p role="status" className="mt-3 text-sm text-[var(--color-pdp-muted)]">
              Shopify authorization is not connected in this UI-only preview.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
