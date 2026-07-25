"use client";

import { useState } from "react";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioPageHeader } from "../shared/PdpStudioPageHeader";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

export function ProductsWorkspace() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="grid gap-[var(--space-pdp-xl)]">
      <PdpStudioPageHeader
        title="Shopify Products"
        description="Connect one Shopify store to a Space, then manage product imagery and variants from the catalog workspace."
      />

      <section className="grid overflow-hidden rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="p-[var(--space-pdp-xl)]">
          <span className="inline-flex items-center gap-[var(--space-pdp-xs)] rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-success-soft)] px-[var(--space-pdp-sm)] py-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-success)]">
            <PdpStudioUiIcon name="shopify" />
            Shopify AI Listing Assistant
          </span>
          <h2 className="mt-[var(--space-pdp-lg)] max-w-[18ch] text-[var(--text-pdp-xl)] font-bold leading-tight tracking-[-0.025em]">
            Bring your product catalog into one visual workspace.
          </h2>
          <p className="mt-[var(--space-pdp-md)] max-w-[60ch] text-[var(--text-pdp-sm)] leading-relaxed text-[var(--color-pdp-muted)]">
            The audited flow publishes listings, syncs images and variants, manages variants at scale, and optimizes image metadata after authorization.
          </p>
          <PdpStudioButton type="button" onClick={() => setShowNotice(true)} className="mt-[var(--space-pdp-lg)]">
            <PdpStudioUiIcon name="shopify" />
            Connect a Shopify store
          </PdpStudioButton>
          {showNotice ? (
            <p role="status" className="mt-[var(--space-pdp-sm)] rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-warning-soft)] p-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-warning)]">
              Shopify authorization is disabled. This UI does not open or modify an external store.
            </p>
          ) : null}
        </div>

        <div className="grid content-center gap-[var(--space-pdp-sm)] bg-[var(--color-pdp-surface-blue)] p-[var(--space-pdp-xl)]">
          {[
            ["Publish listings directly", "Keep visual production and catalog publishing in one flow."],
            ["Sync images and variants", "Review product media and variant coverage together."],
            ["Optimize image metadata", "Prepare consistent catalog assets at scale."],
            ["One store per Space", "Keep each connected catalog isolated by workspace."],
          ].map(([title, description]) => (
            <article key={title} className="flex gap-[var(--space-pdp-sm)] rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-md)]">
              <span className="grid size-[2.25rem] shrink-0 place-items-center rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
                <PdpStudioUiIcon name="check" />
              </span>
              <div>
                <h3 className="text-[var(--text-pdp-sm)] font-bold">{title}</h3>
                <p className="mt-[var(--space-pdp-2xs)] text-[var(--text-pdp-xs)] leading-relaxed text-[var(--color-pdp-muted)]">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
