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

function UsagePanel() {
  return (
    <PreferenceCard title="Account usage" description="Preview meters use sample values and do not read account usage.">
      <div className="grid gap-[var(--space-pdp-md)] sm:grid-cols-2">
        {[["AI credits", "18 / 100"], ["Exports", "26 / 100"]].map(([label, value]) => (
          <div key={label} className="rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-surface-soft)] p-[var(--space-pdp-md)]">
            <span className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">{label}</span>
            <p className="mt-[var(--space-pdp-xs)] font-[family-name:var(--font-pdp-mono)] text-[var(--text-pdp-lg)] font-bold">{value}</p>
            <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">Renews August 24</p>
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
  if (section === "account-usage") return <UsagePanel />;

  if (section === "account-billing") {
    return (
      <PreferenceCard title="Account billing" description="Current subscription and plan controls. Checkout is not connected.">
        <div className="rounded-[var(--radius-pdp-md)] bg-[var(--color-pdp-accent-soft)] p-[var(--space-pdp-lg)]">
          <span className="text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-accent)]">Current plan</span>
          <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-xl)] font-bold">Free</p>
          <ul className="mt-[var(--space-pdp-md)] grid gap-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-ink-soft)] sm:grid-cols-2">
            {plans[0]?.features.map((feature) => <li key={feature}>• {feature}</li>)}
          </ul>
          <PdpStudioButton type="button" disabled className="mt-[var(--space-pdp-lg)]">Upgrade · preview only</PdpStudioButton>
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
            <Input value="admin@primestyleai.com" disabled className="h-[var(--size-pdp-control)] border-[var(--color-pdp-rule)]" />
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
              {["Light", "Dark", "System"].map((appearance) => <option key={appearance}>{appearance}</option>)}
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
