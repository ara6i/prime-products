import type { AdminBehaviorResponse, BehaviorRow, BehaviorStatCard, BehaviorViewModel } from "../types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function stat(label: string, value: string, helper: string): BehaviorStatCard {
  return { label, value, helper };
}

function row(label: string, value: string, helper?: string): BehaviorRow {
  return { label, value, helper };
}

export function mapBehaviorPage(response: AdminBehaviorResponse): BehaviorViewModel {
  return {
    rangeLabel: `Last ${response.range.days} days`,
    stats: [
      stat("Sessions", formatNumber(response.kpis.uniqueSessions), "Anonymous shopper sessions"),
      stat("Product views", formatNumber(response.kpis.productViews ?? 0), `${formatNumber(response.kpis.sdkOpened ?? 0)} SDK opens`),
      stat("Sizing", formatNumber(response.kpis.sizeShown), `${formatNumber(response.kpis.sizingFailed ?? 0)} failed sizing attempts`),
      stat("Try-ons", formatNumber(response.kpis.initiated), `${formatNumber(response.kpis.completed)} completed`),
      stat("Cart adds", formatNumber(response.kpis.cartAdds), `${formatNumber(response.kpis.clientErrors ?? 0)} client errors`),
    ],
    funnel: response.funnel.map((item) => row(item.step, formatNumber(item.count))),
    topProducts: response.topProducts.map((item) => {
      const pieces = [
        item.views != null ? `${formatNumber(item.views)} views` : null,
        `${formatNumber(item.tryOns)} try-ons`,
        item.cartAdds != null ? `${formatNumber(item.cartAdds)} cart adds` : null,
      ].filter(Boolean);
      return row(item.productTitle, formatNumber(item.activity ?? item.tryOns), `${item.productId} · ${pieces.join(" · ")}`);
    }),
    devices: response.deviceSplit.map((item) => row(item.device, formatNumber(item.count))),
    countries: response.countrySplit.map((item) => row(item.name, formatNumber(item.count), item.iso2)),
  };
}
