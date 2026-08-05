"use client";

import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import type { usePreferencesWorkspaceUi } from "../../hooks/usePreferencesWorkspaceUi";
import type { PdpStudioPlan } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PreferenceCard, SavedIndicator } from "./PreferencePrimitives";

type PreferencesUi = ReturnType<typeof usePreferencesWorkspaceUi>;

const LANGUAGES = [
  "Dansk", "Deutsch", "Ελληνικά", "English", "Español", "Suomi", "Français", "Magyar", "Italiano", "Norsk", "Português (BR)", "Português (PT)", "Română", "Svenska", "日本語", "中文（台灣)", "中文", "Nederlands", "Polski", "Bahasa Indonesia", "한국어", "Melayu", "Русский", "ภาษาไทย", "Türkçe", "Українська", "Tiếng Việt", "العربية",
];

function UsagePanel({ui}:{ui:PreferencesUi}) {
  return (
    <PreferenceCard title="Account usage" description="Live values from the immutable workspace usage ledger.">
      <div className="grid gap-[var(--space-pdp-md)] sm:grid-cols-2">
        {[["AI credits", `${ui.usage?.credits.used??0} / ${ui.usage?.credits.limit??100}`], ["Exports", `${ui.usage?.exports.used??0} / ${ui.usage?.exports.limit??100}`]].map(([label, value]) => (
          <div key={label} className="rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-surface-soft)] p-[var(--space-pdp-md)]">
            <span className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">{label}</span>
            <p className="mt-[var(--space-pdp-xs)] font-[family-name:var(--font-pdp-mono)] text-[var(--text-pdp-lg)] font-medium">{value}</p>
            <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">Current billing period</p>
          </div>
        ))}
      </div>
    </PreferenceCard>
  );
}

export function AccountPreferencePanels({
  section,
  ui,
  plans,
}: {
  section: string;
  ui: PreferencesUi;
  plans: PdpStudioPlan[];
}) {
  if (section === "account-usage") return <UsagePanel ui={ui} />;

  if (section === "account-billing") {
    return (
      <PreferenceCard title="Account billing" description="Current subscription and checkout readiness.">
        <div className="rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-accent-soft)] p-[var(--space-pdp-lg)]">
          <span className="text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-accent)]">Current plan</span>
          <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-xl)] font-medium">{ui.billing?.plan ?? "Free"}</p>
          <ul className="mt-[var(--space-pdp-md)] grid gap-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-ink-soft)] sm:grid-cols-2">
            {plans[0]?.features.map((feature) => <li key={feature}>• {feature}</li>)}
          </ul>
          <PdpStudioButton type="button" disabled={!ui.billing?.checkoutReady} className="mt-[var(--space-pdp-lg)]">{ui.billing?.checkoutReady?"Choose plan":"Checkout not configured"}</PdpStudioButton>
        </div>
      </PreferenceCard>
    );
  }

  return (
    <PreferenceCard title="Profile" description="Manage account identity, language, and appearance.">
      <div className="grid gap-[var(--space-pdp-md)]">
        <div className="grid gap-[var(--space-pdp-md)] sm:grid-cols-2">
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Display name</Label>
            <Input value={ui.displayName} onChange={(event) => ui.setDisplayName(event.target.value)} className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]" />
          </label>
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Email address</Label>
            <Input value={ui.email} disabled className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]" />
          </label>
        </div>
        <div className="grid gap-[var(--space-pdp-md)] sm:grid-cols-2">
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Language</Label>
            <select value={ui.language} onChange={(event) => ui.setLanguage(event.target.value)} className="h-[var(--size-pdp-control)] rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] px-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] outline outline-2 outline-transparent focus-visible:outline-[var(--color-pdp-focus)]">
              {LANGUAGES.map((language) => <option key={language}>{language}</option>)}
            </select>
          </label>
          <label className="grid gap-[var(--space-pdp-xs)]">
            <Label>Appearance</Label>
            <select value={ui.appearance} onChange={(event) => ui.setAppearance(event.target.value)} className="h-[var(--size-pdp-control)] rounded-[var(--radius-pdp-sm)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] px-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] outline outline-2 outline-transparent focus-visible:outline-[var(--color-pdp-focus)]">
              <option value="light">Light</option><option value="system">System</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-[var(--space-pdp-sm)]">
          <PdpStudioButton type="button" onClick={() => ui.save("account-profile")}>Save changes</PdpStudioButton>
          <SavedIndicator visible={ui.savedSection === "account-profile"} />
        </div>
      </div>
    </PreferenceCard>
  );
}
