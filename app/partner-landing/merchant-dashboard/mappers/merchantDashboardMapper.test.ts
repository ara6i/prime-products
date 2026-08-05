import assert from "node:assert/strict";
import test from "node:test";
import { MERCHANT_DASHBOARD_DATA } from "../data/merchantDashboardData";
import { buildMerchantTabHref, resolveMerchantTabId } from "../hooks/useMerchantDashboard";
import { enrichMerchantView, mapMerchantDashboard, mapStatusTonesToHealth } from "./merchantDashboardMapper";

test("valid and invalid tab ids resolve predictably", () => {
  const ids = ["all-products", "import-products", "size-charts", "product-health"];
  assert.equal(resolveMerchantTabId(ids, "import-products"), "import-products");
  assert.equal(resolveMerchantTabId(ids, "not-a-real-task"), "all-products");
  assert.equal(resolveMerchantTabId(ids, null), "all-products");
});

test("task hrefs preserve deep links and remove the first task query", () => {
  assert.equal(
    buildMerchantTabHref("/merchants/dashboard/products", "all-products", "import-products"),
    "/merchants/dashboard/products?tab=import-products",
  );
  assert.equal(
    buildMerchantTabHref("/merchants/dashboard/products", "all-products", "all-products", "tab=import-products&review=blocked"),
    "/merchants/dashboard/products?review=blocked",
  );
});

test("health mapping always produces Good, Needs action, or Blocked semantics", () => {
  assert.equal(mapStatusTonesToHealth(["positive", "info"]), "good");
  assert.equal(mapStatusTonesToHealth(["positive", "warning"]), "attention");
  assert.equal(mapStatusTonesToHealth(["warning", "critical"]), "blocked");
});

test("view enrichment limits headline metrics and keeps evidence separate", () => {
  const source = MERCHANT_DASHBOARD_DATA.sections.overview.tabs[0];
  const enriched = enrichMerchantView(source);
  assert.equal(enriched.summary?.metrics?.length, 3);
  assert.equal(enriched.evidence, source.fields);
  assert.ok(["good", "attention", "blocked"].includes(enriched.health ?? ""));
});

test("dashboard mapper falls back to the first task for an invalid id", () => {
  const result = mapMerchantDashboard(MERCHANT_DASHBOARD_DATA, "products", "invalid");
  assert.equal(result.activeView.id, "all-products");
});
