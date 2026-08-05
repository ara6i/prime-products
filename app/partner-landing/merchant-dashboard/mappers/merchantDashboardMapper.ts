import type { MerchantDashboardData, MerchantDashboardSection, MerchantHealth, MerchantStatusTone, MerchantTabView } from "../types";

export function mapStatusTonesToHealth(tones: MerchantStatusTone[]): MerchantHealth {
  if (tones.includes("critical")) return "blocked";
  if (tones.includes("warning")) return "attention";
  return "good";
}

export function enrichMerchantView(view: MerchantTabView): MerchantTabView {
  const tones = [
    ...(view.cards ?? []).map((card) => card.status.tone),
    ...(view.records ?? []).map((record) => record.status.tone),
    ...(view.timeline ?? []).map((item) => item.status.tone),
  ];

  return {
    ...view,
    health: view.health ?? mapStatusTonesToHealth(tones),
    summary: view.summary ?? {
      question: view.title,
      answer: view.description,
      metrics: view.metrics?.slice(0, 3),
    },
    evidence: view.evidence ?? view.fields,
  };
}

export function mapMerchantDashboard(
  data: MerchantDashboardData,
  section: MerchantDashboardSection,
  activeTabId: string,
) {
  const sectionData = data.sections[section];
  const sourceView = sectionData.tabs.find((tab) => tab.id === activeTabId) ?? sectionData.tabs[0];
  const activeView = enrichMerchantView(sourceView);

  return {
    merchant: data.merchant,
    section: sectionData,
    activeView,
  };
}
