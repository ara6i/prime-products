import type {
  MerchantDashboardData,
  MerchantFeatureCard,
  MerchantIconName,
  MerchantRecord,
  MerchantStatus,
  MerchantTone,
} from "../types";

const healthy: MerchantStatus = { label: "Healthy", tone: "positive" };
const ready: MerchantStatus = { label: "Ready", tone: "positive" };
const approved: MerchantStatus = { label: "Approved", tone: "positive" };
const connected: MerchantStatus = { label: "Connected", tone: "positive" };
const passed: MerchantStatus = { label: "Passed", tone: "positive" };
const review: MerchantStatus = { label: "In review", tone: "warning" };
const action: MerchantStatus = { label: "Action needed", tone: "critical" };
const blocked: MerchantStatus = { label: "Blocked", tone: "critical" };
const protectedStatus: MerchantStatus = { label: "Protected", tone: "info" };
const open: MerchantStatus = { label: "Open", tone: "warning" };
const paid: MerchantStatus = { label: "Paid", tone: "positive" };
const draft: MerchantStatus = { label: "Draft", tone: "neutral" };
const notGranted: MerchantStatus = { label: "Not granted", tone: "neutral" };
const scheduled: MerchantStatus = { label: "Scheduled", tone: "info" };
const excluded: MerchantStatus = { label: "Excluded", tone: "neutral" };

function card(
  id: string,
  title: string,
  detail: string,
  meta: string,
  tone: MerchantTone,
  icon: MerchantIconName,
  status: MerchantStatus,
  extras: Partial<MerchantFeatureCard> = {},
): MerchantFeatureCard {
  return { id, title, detail, meta, tone, icon, status, ...extras };
}

function record(
  id: string,
  title: string,
  subtitle: string,
  icon: MerchantIconName,
  status: MerchantStatus,
  cells: Record<string, string>,
  extras: Partial<MerchantRecord> = {},
): MerchantRecord {
  return { id, title, subtitle, icon, status, cells, ...extras };
}

export const MERCHANT_DASHBOARD_DATA: MerchantDashboardData = {
  merchant: {
    name: "Northstar Atelier",
    legalName: "Northstar Atelier, Inc.",
    contact: "Maya Chen",
    email: "maya@northstar.demo",
    avatar: "/images/landing/avatar-elena.png",
    merchantId: "MRC-10482",
    channel: "DIRECT_CONNECTED",
    integration: "Shopify API",
  },
  sections: {
    overview: {
      eyebrow: "Home",
      title: "Good morning, Northstar",
      detail:
        "Three things need your attention today. Everything else is running normally.",
      tabs: [
        {
          id: "overview",
          label: "Overview",
          detail: "What needs attention and how the business is performing",
          layout: "overview",
          eyebrow: "Pilot status",
          title: "Your pilot is ready for its next decision",
          description:
            "Setup is complete. You have 216 AI shopping results remaining before the 8 August review.",
          metrics: [
            {
              label: "Products live",
              value: "4,812",
              detail: "94.2% have all required information",
              trend: "+126 this week",
              tone: "blue",
            },
            {
              label: "Product pages ready",
              value: "97.4%",
              detail: "4,686 shopping pages are published",
              trend: "+1.8%",
              tone: "cyan",
            },
            {
              label: "Successful cart sends",
              value: "96.7%",
              detail: "Shoppers reached the correct variant",
              trend: "+0.9%",
              tone: "mint",
            },
            {
              label: "Sales from PrimeStyleAI",
              value: "$42.8K",
              detail: "218 confirmed customer orders",
              trend: "+8.4%",
              tone: "orange",
            },
          ],
          fields: [
            {
              label: "Activation gates",
              value: "12 / 12 complete",
              tone: "positive",
            },
            { label: "Pilot start", value: "01 Jul 2026" },
            { label: "Review date", value: "08 Aug 2026", tone: "warning" },
            { label: "Closeout", value: "Decision required", tone: "critical" },
          ],
          chart: {
            title: "Shopper outcomes",
            detail: "Eight-week qualified-result and validated-order trend",
            primaryLabel: "Qualified results",
            secondaryLabel: "Validated orders",
            points: [
              { label: "W1", primary: 112, secondary: 18 },
              { label: "W2", primary: 138, secondary: 23 },
              { label: "W3", primary: 146, secondary: 21 },
              { label: "W4", primary: 151, secondary: 27 },
              { label: "W5", primary: 164, secondary: 30 },
              { label: "W6", primary: 186, secondary: 36 },
              { label: "W7", primary: 193, secondary: 32 },
              { label: "W8", primary: 194, secondary: 31 },
            ],
          },
          progress: {
            label: "Pilot usage",
            value: 1284,
            max: 1500,
            valueLabel: "1,284 results used",
            maxLabel: "1,500 result allowance",
            detail: "216 AI shopping results remain before the pilot review.",
            tone: "orange",
          },
          cards: [
            card(
              "SYS-CATALOG",
              "Product catalog",
              "Products and variants sync from Shopify",
              "Synced today at 9:55 AM",
              "blue",
              "catalog",
              connected,
            ),
            card(
              "SYS-CART",
              "Shopping cart",
              "Shoppers are sent to the correct product variant",
              "96.7% successful",
              "mint",
              "cart",
              healthy,
            ),
            card(
              "SYS-LIFECYCLE",
              "Orders and returns",
              "Orders, refunds, returns and exchanges",
              "7 items need review",
              "lilac",
              "return",
              review,
            ),
          ],
          columns: [
            { key: "area", label: "Area" },
            { key: "owner", label: "Owner" },
            { key: "due", label: "Due" },
          ],
          records: [
            record(
              "ACT-03142",
              "Add missing size charts",
              "12 dress products cannot go live until their size charts are mapped.",
              "sizing",
              action,
              { area: "Products", owner: "Merchandising", due: "Today" },
              {
                href: "/merchants/dashboard/products?tab=size-charts",
                tags: ["12 products", "Pages paused"],
              },
            ),
            record(
              "ACT-01938",
              "Approve AI image use",
              "Your legal team needs to approve product-page image permissions.",
              "permission",
              review,
              { area: "Account & governance", owner: "Legal", due: "05 Aug" },
              {
                href: "/merchants/dashboard/account?tab=permissions",
                tags: ["Image rights", "Approval needed"],
              },
            ),
            record(
              "ACT-44012",
              "Choose what happens after the pilot",
              "216 AI shopping results remain before the pilot review.",
              "billing",
              blocked,
              {
                area: "Billing & reports",
                owner: "Program lead",
                due: "08 Aug",
              },
              {
                href: "/merchants/dashboard/billing?tab=statements",
                tags: ["216 results left", "Decision needed"],
              },
            ),
            record(
              "ACT-18405",
              "Check cart issues",
              "7 shoppers were sent back to a product page instead of the cart.",
              "cart",
              review,
              { area: "Commerce", owner: "Engineering", due: "06 Aug" },
              {
                href: "/merchants/dashboard/commerce?tab=cart",
                tags: ["7 cart issues", "Needs review"],
              },
            ),
          ],
          filters: ["All activity", "Action needed", "In review", "Blocked"],
        },
      ],
    },
    products: {
      eyebrow: "Products",
      title: "Merchant product workspace",
      detail:
        "Add, find and improve only the products the merchant sends to PrimeStyleAI.",
      tabs: [
        {
          id: "all-products",
          label: "All products",
          detail: "Parent, variant, quality, suppression, and change history",
          layout: "catalog",
          eyebrow: "Catalog operations",
          title: "Merchant-authorized catalog",
          description:
            "Shopify remains the source of truth. PrimeStyleAI normalizes identifiers without replacing missing merchant facts.",
          metrics: [
            {
              label: "Active SKUs",
              value: "4,812",
              detail: "Across 1,284 parent products",
              tone: "blue",
            },
            {
              label: "Completeness",
              value: "94.2%",
              detail: "Required product fields",
              tone: "mint",
            },
            {
              label: "Suppressed",
              value: "126",
              detail: "Quality or availability gates",
              tone: "rose",
            },
          ],
          cards: [
            card(
              "SYNC-184",
              "Catalog sync v184",
              "12,944 variants inspected with merchant values preserved.",
              "Completed 01 Aug, 09:55",
              "blue",
              "catalog",
              healthy,
            ),
            card(
              "QUALITY-12",
              "Quality queue",
              "Missing imagery, price conflicts, and unavailable variants remain suppressed.",
              "12 urgent issues",
              "orange",
              "incident",
              review,
            ),
          ],
          columns: [
            { key: "category", label: "Category" },
            { key: "variants", label: "Variants" },
            { key: "complete", label: "Complete" },
            { key: "updated", label: "Updated" },
          ],
          records: [
            record(
              "PRD-10412",
              "Silk column dress",
              "Ivory · Women’s dresses",
              "catalog",
              healthy,
              {
                category: "Dresses",
                variants: "8",
                complete: "100%",
                updated: "09:55",
              },
              {
                fields: [
                  { label: "Parent / variants", value: "1 / 8" },
                  { label: "Source", value: "Shopify product 829104" },
                  { label: "Inventory", value: "Merchant-controlled" },
                  { label: "Last change", value: "Price + imagery" },
                ],
                tags: ["Size chart mapped", "PDP live"],
              },
            ),
            record(
              "PRD-10418",
              "Tailored wool blazer",
              "Midnight · Women’s tailoring",
              "catalog",
              review,
              {
                category: "Tailoring",
                variants: "12",
                complete: "92%",
                updated: "09:48",
              },
              {
                fields: [
                  {
                    label: "Missing field",
                    value: "Material stretch",
                    tone: "warning",
                  },
                  { label: "Suppressed variants", value: "2" },
                  { label: "Source", value: "Shopify product 829118" },
                  { label: "Change history", value: "3 versions" },
                ],
                tags: ["2 suppressed", "Review"],
              },
            ),
            record(
              "PRD-10431",
              "Pleated wide-leg trouser",
              "Stone · Women’s trousers",
              "catalog",
              healthy,
              {
                category: "Trousers",
                variants: "10",
                complete: "98%",
                updated: "09:44",
              },
              {
                fields: [
                  { label: "Parent / variants", value: "1 / 10" },
                  { label: "Source", value: "Shopify product 829146" },
                  { label: "Size range", value: "XS–XXL" },
                  { label: "Last change", value: "Inventory" },
                ],
                tags: ["PDP live", "Chart v5"],
              },
            ),
            record(
              "PRD-10442",
              "Leather slingback pump",
              "Sand · Footwear",
              "catalog",
              blocked,
              {
                category: "Footwear",
                variants: "7",
                complete: "71%",
                updated: "08:51",
              },
              {
                fields: [
                  {
                    label: "Suppression reason",
                    value: "Missing region chart",
                    tone: "critical",
                  },
                  { label: "Missing variants", value: "EU 39–40" },
                  { label: "Source", value: "Shopify product 829177" },
                  { label: "Resolution", value: "Merchant input required" },
                ],
                tags: ["Suppressed", "Chart missing"],
              },
            ),
          ],
          filters: ["All products", "Healthy", "In review", "Suppressed"],
        },
        {
          id: "import-products",
          label: "Import products",
          detail:
            "Preview, review, version, disclosure, publication, and indexing",
          layout: "pdp",
          eyebrow: "Publication control",
          title: "Merchant product-page review",
          description:
            "Draft pages remain reviewable before publication, and only merchant-approved content can go live.",
          metrics: [
            {
              label: "Published",
              value: "4,686",
              detail: "97.4% product coverage",
              tone: "cyan",
            },
            {
              label: "Drafts",
              value: "24",
              detail: "Awaiting merchant review",
              tone: "orange",
            },
            {
              label: "Blocked",
              value: "12",
              detail: "Sizing or rights conflict",
              tone: "rose",
            },
          ],
          cards: [
            card(
              "PDP-CHECK",
              "Review checklist",
              "Identity, seller disclosure, price, availability, sizing, AI disclosures, and cart method.",
              "8 / 8 checks on selected PDP",
              "mint",
              "document",
              passed,
            ),
          ],
          columns: [
            { key: "region", label: "Region" },
            { key: "version", label: "Version" },
            { key: "reviewer", label: "Reviewer" },
            { key: "updated", label: "Updated" },
          ],
          records: [
            record(
              "PDP-11920",
              "Silk column dress",
              "Published product page",
              "document",
              approved,
              {
                region: "US / CA",
                version: "v7",
                reviewer: "Maya Chen",
                updated: "01 Aug",
              },
              {
                fields: [
                  { label: "Page layout", value: "Standard product page" },
                  { label: "Catalog update", value: "01 Aug" },
                  { label: "Indexing", value: "Allowed" },
                  { label: "Seller disclosure", value: "Northstar Atelier" },
                ],
                tags: ["Sample set approved", "SEO enabled"],
              },
            ),
            record(
              "PDP-11944",
              "Tailored wool blazer",
              "Draft with sizing changes",
              "document",
              review,
              {
                region: "US / UK",
                version: "v3 draft",
                reviewer: "Merchandising",
                updated: "31 Jul",
              },
              {
                fields: [
                  { label: "Changed", value: "Chart v6 + fit note" },
                  { label: "Previous", value: "PDP v2" },
                  { label: "Indexing", value: "Off until publish" },
                  { label: "Review state", value: "Merchant review" },
                ],
                tags: ["Diff available", "Draft"],
              },
            ),
            record(
              "PDP-11961",
              "Pleated wide-leg trouser",
              "Published product page",
              "document",
              healthy,
              {
                region: "Global EN",
                version: "v5",
                reviewer: "Catalog ops",
                updated: "30 Jul",
              },
              {
                fields: [
                  { label: "Page layout", value: "Standard product page" },
                  { label: "Catalog update", value: "30 Jul" },
                  { label: "Structured data", value: "Valid" },
                  { label: "Cart method", value: "Storefront API" },
                ],
                tags: ["Live", "Cart ready"],
              },
            ),
          ],
          filters: ["All PDPs", "Published", "Draft", "Blocked"],
          notice:
            "Publish is disabled in this demo. The selected record exposes version and checklist evidence only.",
        },
        {
          id: "size-charts",
          label: "Size charts",
          detail:
            "Values, region mapping, measurement basis, conflicts, tests, and history",
          layout: "matrix",
          eyebrow: "Sizing evidence",
          title: "Chart mapping & conflict review",
          description:
            "Merchant labels and source values are preserved. Recommendations stop when chart evidence is missing or ambiguous.",
          metrics: [
            {
              label: "Mapped charts",
              value: "318",
              detail: "Category and region specific",
              tone: "blue",
            },
            {
              label: "Conflicts",
              value: "12",
              detail: "Merchant confirmation needed",
              tone: "rose",
            },
            {
              label: "Test coverage",
              value: "96%",
              detail: "Representative profiles",
              tone: "mint",
            },
          ],
          fields: [
            { label: "Selected mapping", value: "Women / Dresses / US" },
            { label: "Measurement basis", value: "Body measurements" },
            { label: "Source version", value: "Northstar chart v6" },
            { label: "Published products", value: "164" },
          ],
          matrixColumns: [
            "Scope",
            "Source",
            "Basis",
            "Version",
            "Tests",
            "Decision",
          ],
          matrixRows: [
            {
              id: "SIZ-03142",
              label: "Women’s dresses · US",
              detail: "Bust overlap between M and L on 12 products",
              values: [
                { label: "Scope", value: "164 products" },
                { label: "Source", value: "Merchant CSV" },
                { label: "Basis", value: "Body" },
                { label: "Version", value: "v6" },
                { label: "Tests", value: "18 / 20", status: review },
                { label: "Decision", value: "Confirm overlap", status: action },
              ],
            },
            {
              id: "SIZ-03118",
              label: "Women’s tailoring · UK",
              detail: "Region conversion validated against source labels",
              values: [
                { label: "Scope", value: "88 products" },
                { label: "Source", value: "Shopify meta" },
                { label: "Basis", value: "Garment" },
                { label: "Version", value: "v4" },
                { label: "Tests", value: "20 / 20", status: passed },
                { label: "Decision", value: "Approved", status: approved },
              ],
            },
            {
              id: "SIZ-03091",
              label: "Women’s trousers · Global",
              detail: "Waist and hip ranges mapped without label conversion",
              values: [
                { label: "Scope", value: "126 products" },
                { label: "Source", value: "Merchant API" },
                { label: "Basis", value: "Body" },
                { label: "Version", value: "v5" },
                { label: "Tests", value: "20 / 20", status: passed },
                { label: "Decision", value: "Approved", status: approved },
              ],
            },
            {
              id: "SIZ-03072",
              label: "Footwear · EU",
              detail: "EU 39–40 source values are missing",
              values: [
                { label: "Scope", value: "42 products" },
                { label: "Source", value: "Merchant CSV" },
                { label: "Basis", value: "Foot length" },
                { label: "Version", value: "v2" },
                { label: "Tests", value: "8 / 20", status: blocked },
                { label: "Decision", value: "Source needed", status: blocked },
              ],
            },
          ],
          notice:
            "Chart confirmation is shown as evidence only; approval controls are intentionally disabled in the demo.",
        },
        {
          id: "product-health",
          label: "Product health",
          detail:
            "Gallery, product participation, provenance, QA, and permitted uses",
          layout: "gallery",
          eyebrow: "Authorized derivatives",
          title: "AI asset provenance gallery",
          description:
            "Every generated result remains linked to the participating product, source content, workflow, version, QA result, and granted use.",
          metrics: [
            {
              label: "Approved assets",
              value: "2,946",
              detail: "Within product rights scope",
              tone: "lilac",
            },
            {
              label: "QA review",
              value: "18",
              detail: "Material or silhouette checks",
              tone: "orange",
            },
            {
              label: "Training use",
              value: "0",
              detail: "Not granted",
              tone: "neutral",
            },
          ],
          cards: [
            card(
              "AST-51208",
              "Silk dress try-on",
              "User-requested virtual try-on result for the silk column dress.",
              "Virtual try-on",
              "blue",
              "ai",
              approved,
              {
                illustration: "/images/landing/ps/ps-raw-06-tryon.jpg",
                illustrationAlt:
                  "Virtual try-on result for a participating dress",
                fields: [
                  { label: "Product", value: "Silk column dress" },
                  { label: "Provenance", value: "Merchant image + user input" },
                  { label: "Permitted use", value: "Delivered result" },
                  { label: "QA", value: "Passed" },
                ],
              },
            ),
            card(
              "AST-51221",
              "Complete Look result",
              "Three participating Northstar products delivered as one styled outfit.",
              "Complete Look",
              "cyan",
              "ai",
              approved,
              {
                illustration: "/images/landing/feature-outfit-preview.png",
                illustrationAlt: "Complete outfit recommendation preview",
                fields: [
                  { label: "Products", value: "3 participating" },
                  { label: "Provenance", value: "Current catalog" },
                  { label: "Permitted use", value: "Shopper result" },
                  { label: "QA", value: "Passed" },
                ],
              },
            ),
            card(
              "AST-51184",
              "Blazer fit derivative",
              "Material drape needs manual review before reuse on a merchant product page.",
              "Try-on result",
              "orange",
              "ai",
              review,
              {
                illustration: "/images/landing/ps/ps-finalizing-pose-v2.png",
                illustrationAlt: "Fashion fit output awaiting merchant QA",
                fields: [
                  { label: "Product", value: "Tailored wool blazer" },
                  { label: "Provenance", value: "Merchant image" },
                  { label: "Permitted use", value: "Review only" },
                  { label: "QA", value: "Drape review" },
                ],
              },
            ),
          ],
          notice:
            "Regenerate and suppress controls are visibly disabled because no generation service is connected.",
        },
      ],
    },
    integrations: {
      eyebrow: "Integration operations",
      title: "Connections & testing",
      detail:
        "Merchant systems, credentials, scopes, webhooks, and acceptance evidence.",
      tabs: [
        {
          id: "connections",
          label: "Systems",
          detail: "Catalog, cart, order, return, and event connection health",
          layout: "connections",
          eyebrow: "Merchant-owned systems",
          title: "Connected commerce stack",
          description:
            "Each connection shows its authorized purpose, last evidence, and current operating state without exposing credentials.",
          metrics: [
            {
              label: "Connected systems",
              value: "3",
              detail: "All expected systems",
              tone: "blue",
            },
            {
              label: "Webhook delivery",
              value: "99.8%",
              detail: "Last 30 days",
              tone: "mint",
            },
            {
              label: "Median latency",
              value: "420ms",
              detail: "Catalog and commerce",
              tone: "cyan",
            },
          ],
          cards: [
            card(
              "INT-SHOPIFY",
              "Shopify Admin API",
              "Products, variants, price, inventory, orders, returns, and refunds.",
              "Checked 01 Aug, 11:42",
              "blue",
              "connection",
              connected,
              {
                illustration:
                  "/media/merchant-dashboard/illustrations/integrations.webp",
                illustrationAlt:
                  "Secure storefront and commerce-system connection",
                fields: [
                  { label: "Environment", value: "Production" },
                  { label: "Catalog sync", value: "Every 15 minutes" },
                  { label: "Credential", value: "Masked" },
                ],
              },
            ),
            card(
              "INT-CART",
              "Storefront Cart API",
              "Exact variant and quantity handoff with merchant checkout fallback.",
              "96.7% successful",
              "mint",
              "cart",
              healthy,
              {
                fields: [
                  { label: "Method", value: "Merchant cart API" },
                  { label: "Fallback", value: "Merchant PDP" },
                  { label: "Currency", value: "USD / CAD / GBP" },
                ],
              },
            ),
            card(
              "INT-WEBHOOK",
              "Lifecycle webhooks",
              "Orders, cancellations, refunds, returns, exchanges, and chargebacks.",
              "7 exceptions",
              "lilac",
              "activity",
              review,
              {
                fields: [
                  { label: "Events", value: "6 authorized" },
                  { label: "Idempotency", value: "Enabled" },
                  { label: "Retry policy", value: "3 attempts" },
                ],
              },
            ),
          ],
          timeline: [
            {
              id: "SYNC-88214",
              title: "Catalog sync completed",
              detail: "12,944 variants processed; 126 stayed suppressed.",
              meta: "01 Aug · 09:55",
              icon: "catalog",
              status: passed,
            },
            {
              id: "WH-30192",
              title: "Refund webhook retried",
              detail:
                "Second attempt accepted with the original idempotency key.",
              meta: "01 Aug · 09:18",
              icon: "return",
              status: review,
            },
            {
              id: "CART-18405",
              title: "Cart fallback used",
              detail:
                "Selected EU 40 variant was unavailable at merchant preflight.",
              meta: "31 Jul · 22:06",
              icon: "cart",
              status: protectedStatus,
            },
          ],
        },
        {
          id: "scopes",
          label: "Access",
          detail:
            "Masked credentials, exact authorization, rotation, and restrictions",
          layout: "matrix",
          eyebrow: "Least-privilege access",
          title: "Credential & scope matrix",
          description:
            "Only the access needed for this merchant service is shown. Secrets remain outside the merchant UI.",
          metrics: [
            {
              label: "Granted scopes",
              value: "8",
              detail: "Contracted service only",
              tone: "lilac",
            },
            {
              label: "Restricted",
              value: "3",
              detail: "Payments, customers, discounts",
              tone: "neutral",
            },
            {
              label: "Next rotation",
              value: "19 Oct",
              detail: "Credential schedule",
              tone: "orange",
            },
          ],
          fields: [
            { label: "Last rotation", value: "19 Jul 2026" },
            { label: "Revocation", value: "Demo only", tone: "neutral" },
          ],
          matrixColumns: ["Purpose", "Access", "Source", "Last used", "State"],
          matrixRows: [
            {
              id: "SCP-01",
              label: "Products",
              detail: "Read merchant product and variant records",
              values: [
                { label: "Purpose", value: "Catalog + PDP" },
                { label: "Access", value: "read_products" },
                { label: "Source", value: "Order Form v3" },
                { label: "Last used", value: "09:55" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
            {
              id: "SCP-02",
              label: "Inventory",
              detail: "Verify selected variants before cart handoff",
              values: [
                { label: "Purpose", value: "Cart preflight" },
                { label: "Access", value: "read_inventory" },
                { label: "Source", value: "Order Form v3" },
                { label: "Last used", value: "11:41" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
            {
              id: "SCP-03",
              label: "Orders & returns",
              detail: "Receive item-level lifecycle truth",
              values: [
                { label: "Purpose", value: "Reconciliation" },
                { label: "Access", value: "read_orders" },
                { label: "Source", value: "Order Form v3" },
                { label: "Last used", value: "11:38" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
            {
              id: "SCP-04",
              label: "Payments",
              detail:
                "PrimeStyleAI does not accept or control merchant payment",
              values: [
                { label: "Purpose", value: "Not required" },
                { label: "Access", value: "write_payments" },
                { label: "Source", value: "Restricted" },
                { label: "Last used", value: "Never" },
                { label: "State", value: "Not granted", status: notGranted },
              ],
            },
          ],
          notice:
            "Rotate and revoke are disabled demo controls; no merchant secret is displayed or stored here.",
        },
        {
          id: "tests",
          label: "Launch tests",
          detail:
            "Acceptance runs, lifecycle stages, retries, and exception evidence",
          layout: "tests",
          eyebrow: "Acceptance evidence",
          title: "End-to-end lifecycle tests",
          description:
            "A production connection is not considered ready until catalog, exact cart, order, refund, return, and idempotency paths pass.",
          metrics: [
            {
              label: "Checks passed",
              value: "42 / 44",
              detail: "Current acceptance suite",
              tone: "mint",
            },
            {
              label: "Exceptions",
              value: "2",
              detail: "Both under review",
              tone: "orange",
            },
            {
              label: "Last full run",
              value: "31 Jul",
              detail: "Production-like test",
              tone: "blue",
            },
          ],
          timeline: [
            {
              id: "TST-01",
              title: "Catalog import",
              detail:
                "Parent, variant, price, inventory, and image mappings validated.",
              meta: "Passed in 48s",
              icon: "catalog",
              status: passed,
            },
            {
              id: "TST-02",
              title: "Exact-variant cart",
              detail:
                "US and UK product, size, color, quantity, and currency paths validated.",
              meta: "Passed in 12s",
              icon: "cart",
              status: passed,
            },
            {
              id: "TST-03",
              title: "Order confirmation",
              detail:
                "Item-level order and creator-campaign references received once.",
              meta: "Passed in 4m",
              icon: "order",
              status: passed,
            },
            {
              id: "TST-04",
              title: "Refund and return",
              detail:
                "One exchange-reason field needs merchant mapping confirmation.",
              meta: "1 exception",
              icon: "return",
              status: review,
            },
          ],
          columns: [
            { key: "environment", label: "Environment" },
            { key: "coverage", label: "Coverage" },
            { key: "duration", label: "Duration" },
            { key: "executed", label: "Executed" },
          ],
          records: [
            record(
              "RUN-00442",
              "Full lifecycle acceptance",
              "44 checks across all authorized connections",
              "activity",
              review,
              {
                environment: "Production-like",
                coverage: "42 / 44",
                duration: "18m 22s",
                executed: "31 Jul",
              },
              {
                fields: [
                  { label: "Failed check", value: "Exchange reason mapping" },
                  { label: "Retry", value: "Idempotent" },
                  { label: "Owner", value: "Integration engineering" },
                  { label: "Evidence", value: "44 step records" },
                ],
              },
            ),
            record(
              "RUN-00438",
              "Exact-variant cart regression",
              "Size, color, currency and unavailable-variant fallback",
              "cart",
              passed,
              {
                environment: "Production-like",
                coverage: "16 / 16",
                duration: "6m 10s",
                executed: "29 Jul",
              },
            ),
            record(
              "RUN-00431",
              "Order/refund idempotency",
              "Duplicate delivery and retry protection",
              "return",
              passed,
              {
                environment: "Sandbox",
                coverage: "12 / 12",
                duration: "8m 04s",
                executed: "27 Jul",
              },
            ),
          ],
          notice:
            "Run test is disabled in the demo; historical evidence and exception detail remain interactive.",
        },
      ],
    },
    commerce: {
      eyebrow: "Commerce truth",
      title: "Shopper decisions & lifecycle",
      detail:
        "Sizing, AI results, exact cart handoff, orders, returns, and attribution.",
      tabs: [
        {
          id: "decisions",
          label: "Decision",
          detail:
            "Consent, chart version, recommendation, selection, confidence, and override",
          layout: "decision",
          eyebrow: "Sizing evidence",
          title: "Recommendation decision trace",
          description:
            "Each recommendation is an estimate backed by the merchant’s current chart, product attributes, consent state, and selected alternative.",
          metrics: [
            {
              label: "Decisions",
              value: "1,642",
              detail: "Last 30 days",
              tone: "blue",
            },
            {
              label: "High confidence",
              value: "87.2%",
              detail: "Evidence threshold met",
              tone: "mint",
            },
            {
              label: "Overrides",
              value: "9.6%",
              detail: "Shopper selected another size",
              tone: "orange",
            },
          ],
          columns: [
            { key: "product", label: "Product" },
            { key: "recommended", label: "Recommended" },
            { key: "selected", label: "Selected" },
            { key: "confidence", label: "Confidence" },
          ],
          records: [
            record(
              "DEC-78452",
              "Size recommendation delivered",
              "Anonymous shopper profile · Consent recorded",
              "decision",
              approved,
              {
                product: "Silk column dress",
                recommended: "M",
                selected: "M",
                confidence: "High · 92%",
              },
              {
                fields: [
                  { label: "Chart", value: "Women / Dresses / US v6" },
                  { label: "Method", value: "Profile measurements" },
                  { label: "Alternative", value: "L for relaxed fit" },
                  { label: "Caveat", value: "Bust near overlap boundary" },
                ],
                tags: ["Consent valid", "Chart v6"],
              },
            ),
            record(
              "DEC-78441",
              "Shopper override applied",
              "Recommendation recorded separately from final selection",
              "decision",
              review,
              {
                product: "Tailored wool blazer",
                recommended: "S",
                selected: "M",
                confidence: "Medium · 74%",
              },
              {
                fields: [
                  { label: "Chart", value: "Tailoring / UK v4" },
                  { label: "Method", value: "Measurements + fit preference" },
                  { label: "Override", value: "Relaxed layering" },
                  { label: "Caveat", value: "Material stretch missing" },
                ],
                tags: ["Override", "Evidence retained"],
              },
            ),
            record(
              "DEC-78412",
              "Guidance without definitive size",
              "Source evidence was incomplete",
              "decision",
              protectedStatus,
              {
                product: "Leather slingback pump",
                recommended: "Choose manually",
                selected: "EU 39",
                confidence: "Unavailable",
              },
              {
                fields: [
                  {
                    label: "Missing evidence",
                    value: "EU 39–40 source values",
                  },
                  { label: "Method", value: "Manual selection" },
                  { label: "Fallback", value: "Merchant PDP" },
                  { label: "Result", value: "No guaranteed recommendation" },
                ],
                tags: ["Safe fallback", "No invented size"],
              },
            ),
          ],
          filters: [
            "All decisions",
            "High confidence",
            "Override",
            "Manual choice",
          ],
        },
        {
          id: "ai-results",
          label: "Result",
          detail:
            "Try-on, AI Stylist, Complete Look, participating products, retries, cache, and billing eligibility",
          layout: "results",
          eyebrow: "Delivered-result ledger",
          title: "Try-on & styling evidence",
          description:
            "Only completed, shopper-requested results using participating merchant products can become qualified events.",
          metrics: [
            {
              label: "Delivered results",
              value: "1,284",
              detail: "Current pilot",
              tone: "blue",
            },
            {
              label: "Excluded",
              value: "46",
              detail: "Failures, retries, or no delivery",
              tone: "neutral",
            },
            {
              label: "Median latency",
              value: "8.2s",
              detail: "Delivered workflows",
              tone: "cyan",
            },
          ],
          cards: [
            card(
              "EVT-78432",
              "Virtual try-on delivered",
              "One participating silk dress result delivered to the shopper.",
              "$0.50 qualified event",
              "blue",
              "ai",
              approved,
              {
                illustration: "/images/landing/ps/ps-raw-06-tryon.jpg",
                illustrationAlt: "Delivered virtual try-on result",
                fields: [
                  { label: "Products", value: "Silk column dress" },
                  { label: "Result type", value: "Virtual try-on" },
                  { label: "Retry / cache", value: "0 / miss" },
                  { label: "Latency", value: "7.8s" },
                ],
              },
            ),
            card(
              "EVT-78421",
              "Complete Look delivered",
              "Three selected Northstar products delivered as one styled result.",
              "$1.50 · 3 products",
              "cyan",
              "ai",
              approved,
              {
                illustration: "/images/landing/feature-outfit-preview.png",
                illustrationAlt: "Delivered Complete Look styling result",
                fields: [
                  { label: "Products", value: "3 participating" },
                  { label: "Workflow", value: "complete-look v4" },
                  { label: "Retry / cache", value: "0 / hit" },
                  { label: "Latency", value: "4.1s" },
                ],
              },
            ),
            card(
              "EVT-78398",
              "Incomplete generation",
              "Automatic retry ended before a shopper-visible result was delivered.",
              "$0.00 excluded",
              "orange",
              "ai",
              excluded,
              {
                illustration: "/images/landing/ps/ps-finalizing-pose-v2.png",
                illustrationAlt: "AI fashion output excluded before delivery",
                fields: [
                  { label: "Products", value: "Tailored wool blazer" },
                  { label: "Result type", value: "Virtual try-on" },
                  { label: "Retries", value: "2 automatic" },
                  { label: "Reason", value: "No delivered result" },
                ],
              },
            ),
          ],
          notice:
            "Refreshes, verified automatic retries, failed generations, and cached duplicates are never double-charged.",
        },
        {
          id: "cart",
          label: "Cart",
          detail:
            "Exact variant, preflight, method, session, merchant result, retry, and fallback",
          layout: "handoff",
          eyebrow: "Merchant-authorized cart",
          title: "Exact-variant handoff trace",
          description:
            "PrimeStyleAI verifies product, size, color, quantity, price, inventory, region, and currency before opening the merchant cart.",
          metrics: [
            {
              label: "Successful",
              value: "96.7%",
              detail: "Last 30 days",
              tone: "mint",
            },
            {
              label: "Fallbacks",
              value: "52",
              detail: "Merchant PDP opened",
              tone: "orange",
            },
            {
              label: "Blocked",
              value: "7",
              detail: "No safe variant",
              tone: "rose",
            },
          ],
          timeline: [
            {
              id: "CART-01",
              title: "Resolve merchant variant",
              detail: "Silk column dress · Ivory · M · quantity 1",
              meta: "Exact match",
              icon: "catalog",
              status: passed,
            },
            {
              id: "CART-02",
              title: "Preflight price & inventory",
              detail: "$248.00 USD · 4 units available",
              meta: "Merchant truth",
              icon: "activity",
              status: passed,
            },
            {
              id: "CART-03",
              title: "Link shopper session",
              detail: "Consented first-party context attached",
              meta: "Session linked",
              icon: "attribution",
              status: passed,
            },
            {
              id: "CART-04",
              title: "Merchant cart confirmation",
              detail: "Storefront confirmed the selected line item",
              meta: "842ms",
              icon: "cart",
              status: passed,
            },
          ],
          columns: [
            { key: "variant", label: "Variant" },
            { key: "method", label: "Method" },
            { key: "result", label: "Result" },
            { key: "time", label: "Time" },
          ],
          records: [
            record(
              "HND-29184",
              "Silk column dress handoff",
              "CLK-DIR-884219",
              "cart",
              approved,
              {
                variant: "Ivory / M / 1",
                method: "Storefront API",
                result: "Cart confirmed",
                time: "11:42",
              },
              {
                fields: [
                  { label: "Region / currency", value: "US / USD" },
                  { label: "Merchant line", value: "5120481" },
                  { label: "Price", value: "$248.00" },
                  { label: "Fallback", value: "Not used" },
                ],
              },
            ),
            record(
              "HND-29175",
              "Leather slingback fallback",
              "CLK-DIR-884104",
              "cart",
              protectedStatus,
              {
                variant: "Sand / EU 40 / 1",
                method: "Merchant PDP",
                result: "Manual choice",
                time: "10:18",
              },
              {
                fields: [
                  { label: "Reason", value: "Variant unavailable" },
                  { label: "Fallback", value: "Tracked merchant PDP" },
                  { label: "Cart mutation", value: "None" },
                  { label: "Shopper state", value: "Recommendation shown" },
                ],
              },
            ),
          ],
        },
        {
          id: "orders",
          label: "Order",
          detail:
            "Item-level order, discount, tax, attribution, idempotency, and commission state",
          layout: "ledger",
          eyebrow: "Commercial lifecycle",
          title: "Validated order ledger",
          description:
            "Merchant order truth controls item-level net sales, attribution, reporting, and creator-campaign commission state.",
          metrics: [
            {
              label: "Validated orders",
              value: "218",
              detail: "$42.8K net sales",
              tone: "blue",
            },
            {
              label: "Pending",
              value: "14",
              detail: "Return window open",
              tone: "orange",
            },
            {
              label: "Exceptions",
              value: "3",
              detail: "Missing line references",
              tone: "rose",
            },
          ],
          columns: [
            { key: "product", label: "Line item" },
            { key: "net", label: "Net sale" },
            { key: "attribution", label: "Attribution" },
            { key: "commission", label: "Commission" },
          ],
          records: [
            record(
              "ORD-20819",
              "Northstar order #10584",
              "01 Aug · 2 line items",
              "order",
              approved,
              {
                product: "Silk dress + slingback",
                net: "$398.00",
                attribution: "Autumn tailoring",
                commission: "$33.43 pending",
              },
              {
                fields: [
                  { label: "Gross / discount", value: "$448 / $25" },
                  { label: "Tax / shipping", value: "$31 / $12" },
                  { label: "Duplicate protection", value: "Confirmed" },
                  { label: "Return window", value: "Ends 31 Aug" },
                ],
                tags: ["2 items", "Creator campaign"],
              },
            ),
            record(
              "ORD-20811",
              "Northstar order #10576",
              "31 Jul · 1 line item",
              "order",
              paid,
              {
                product: "Pleated trouser",
                net: "$184.00",
                attribution: "PrimeStyleAI",
                commission: "$0.00",
              },
              {
                fields: [
                  { label: "Gross / discount", value: "$199 / $15" },
                  { label: "Tax / shipping", value: "$16 / $0" },
                  { label: "Duplicate protection", value: "Confirmed" },
                  { label: "Campaign", value: "None" },
                ],
              },
            ),
            record(
              "ORD-20798",
              "Northstar order #10562",
              "30 Jul · missing variant reference",
              "incident",
              action,
              {
                product: "Unresolved line",
                net: "$126.00 held",
                attribution: "Exception review",
                commission: "Held",
              },
              {
                fields: [
                  { label: "Missing", value: "Merchant variant ID" },
                  { label: "Allocation", value: "Not estimated" },
                  { label: "Owner", value: "Finance data ops" },
                  { label: "Resolution", value: "Merchant evidence needed" },
                ],
              },
            ),
          ],
          filters: ["All orders", "Validated", "Pending", "Exception"],
        },
        {
          id: "returns",
          label: "Return",
          detail:
            "Refund, exchange, reason, reversal, and reconciliation cases",
          layout: "cases",
          eyebrow: "Return reconciliation",
          title: "Returns, refunds & exchanges",
          description:
            "Every returned line is reconciled to its original order, product, creator, commission, and financial state.",
          metrics: [
            {
              label: "Return rate",
              value: "6.4%",
              detail: "14 item-level records",
              tone: "orange",
            },
            {
              label: "Exchanges",
              value: "5",
              detail: "Size/color replacement",
              tone: "cyan",
            },
            {
              label: "Reversals",
              value: "$184",
              detail: "Commission adjusted",
              tone: "rose",
            },
          ],
          cards: [
            card(
              "RET-00184",
              "Dress size exchange",
              "Order #10521 · M returned for L after merchant approval.",
              "Exchange completed 31 Jul",
              "cyan",
              "return",
              approved,
              {
                fields: [
                  { label: "Reason", value: "Preferred relaxed fit" },
                  { label: "Net impact", value: "$0.00" },
                  { label: "Commission", value: "Unchanged" },
                  { label: "Idempotency", value: "return-10521-1" },
                ],
              },
            ),
            card(
              "RET-00179",
              "Blazer refund",
              "Order #10504 · merchant-confirmed material expectation return.",
              "Refunded 30 Jul",
              "orange",
              "return",
              paid,
              {
                fields: [
                  { label: "Reason", value: "Material expectation" },
                  { label: "Net impact", value: "-$286.00" },
                  { label: "Commission", value: "Reversed -$24.02" },
                  { label: "Refund", value: "Merchant-controlled" },
                ],
              },
            ),
            card(
              "RET-00176",
              "Duplicate webhook review",
              "The second delivery was suppressed by the original idempotency key.",
              "No financial duplicate",
              "lilac",
              "incident",
              protectedStatus,
              {
                fields: [
                  { label: "Order", value: "#10498" },
                  { label: "Event", value: "refund.created" },
                  { label: "Duplicate", value: "Suppressed" },
                  { label: "Ledger", value: "Single reversal" },
                ],
              },
            ),
          ],
          notice:
            "PrimeStyleAI does not issue refunds; this view reconciles merchant-reported lifecycle truth.",
        },
        {
          id: "attribution",
          label: "Source",
          detail:
            "Referral timeline, campaign terms, window, consent, account context, and postback evidence",
          layout: "timeline",
          eyebrow: "Creator referral evidence",
          title: "Referral-to-order timeline",
          description:
            "Creator identity starts the referral record; merchant order confirmation proves the sale. A visit alone is not enough.",
          metrics: [
            {
              label: "Matched orders",
              value: "92.7%",
              detail: "Creator attribution coverage",
              tone: "mint",
            },
            {
              label: "Unmatched",
              value: "16",
              detail: "Evidence review",
              tone: "orange",
            },
            {
              label: "Cross-device",
              value: "11",
              detail: "Authorized account match",
              tone: "lilac",
            },
          ],
          timeline: [
            {
              id: "ATT-01",
              title: "Qualified creator referral",
              detail: "Maya Laurent promoted the silk column dress",
              meta: "28 Jul · 14:02",
              icon: "publisher",
              status: approved,
            },
            {
              id: "ATT-02",
              title: "Shopper decision & result",
              detail:
                "The size recommendation was followed by a delivered try-on.",
              meta: "28 Jul · 14:05",
              icon: "decision",
              status: passed,
            },
            {
              id: "ATT-03",
              title: "Merchant cart handoff",
              detail:
                "The consented shopper session continued to the merchant cart.",
              meta: "28 Jul · 14:08",
              icon: "cart",
              status: passed,
            },
            {
              id: "ATT-04",
              title: "Order confirmation matched",
              detail:
                "Order #10584 arrived within the 30-day creator-campaign window.",
              meta: "01 Aug · 11:42",
              icon: "order",
              status: approved,
            },
          ],
          fields: [
            { label: "Creator", value: "Maya Laurent" },
            { label: "Campaign", value: "Autumn tailoring launch" },
            { label: "Attribution window", value: "30 days" },
            { label: "Consent context", value: "Server-side referral allowed" },
            { label: "Device association", value: "Authorized account match" },
            { label: "Postback", value: "Merchant order webhook" },
          ],
        },
      ],
    },
    campaigns: {
      eyebrow: "Creator partnerships",
      title: "Creators & performance",
      detail:
        "Find creators, review hired influencers, and see campaign performance for each partnership.",
      tabs: [
        {
          id: "campaigns",
          label: "Campaigns",
          detail:
            "Products, rates, windows, funding, exclusions, tracking, and performance",
          layout: "campaigns",
          eyebrow: "Creator campaigns",
          title: "Merchant campaign workspace",
          description:
            "Every campaign keeps its eligible products, creators, dates, funding, commission, and attribution rules together.",
          metrics: [
            {
              label: "Active campaigns",
              value: "6",
              detail: "Two scheduled",
              tone: "blue",
            },
            {
              label: "Approved creators",
              value: "14",
              detail: "Merchant-specific access",
              tone: "lilac",
            },
            {
              label: "Attributed sales",
              value: "$18.6K",
              detail: "Current month",
              tone: "mint",
            },
          ],
          chart: {
            title: "Creator campaign performance",
            detail: "Validated net sales and qualified orders",
            primaryLabel: "Net sales ($100)",
            secondaryLabel: "Orders",
            points: [
              { label: "W1", primary: 31, secondary: 18 },
              { label: "W2", primary: 38, secondary: 22 },
              { label: "W3", primary: 44, secondary: 27 },
              { label: "W4", primary: 52, secondary: 31 },
            ],
          },
          cards: [
            card(
              "CMP-DIR-204",
              "Autumn tailoring launch",
              "Blazers, trousers, and Complete Look results for approved US/UK creators.",
              "8.4% commission · 30-day window",
              "blue",
              "campaign",
              approved,
              {
                illustration:
                  "/media/merchant-dashboard/illustrations/campaigns.webp",
                illustrationAlt: "Merchant campaign and creator program",
                fields: [
                  { label: "Eligible products", value: "418" },
                  { label: "Funding", value: "Merchant commission" },
                  { label: "Exclusions", value: "Gift cards, returns" },
                  { label: "Net sales", value: "$12.8K" },
                ],
              },
            ),
            card(
              "CMP-DIR-219",
              "Holiday occasion edit",
              "US and Canada dresses with merchant-approved imagery and disclosure copy.",
              "Draft terms · starts 15 Oct",
              "orange",
              "campaign",
              draft,
              {
                fields: [
                  { label: "Eligible products", value: "146" },
                  { label: "Funding", value: "Merchant" },
                  { label: "Attribution", value: "14 days" },
                  { label: "Validation", value: "Paid orders" },
                ],
              },
            ),
          ],
          columns: [
            { key: "products", label: "Products" },
            { key: "publishers", label: "Creators" },
            { key: "tracking", label: "Tracking" },
            { key: "performance", label: "Performance" },
          ],
          records: [
            record(
              "CMP-DIR-204",
              "Autumn tailoring launch",
              "Active 01 Aug–30 Sep",
              "campaign",
              approved,
              {
                products: "418 eligible",
                publishers: "8 accepted",
                tracking: "Creator sessions",
                performance: "$12.8K / 64 orders",
              },
              { tags: ["US / UK", "8.4%"] },
            ),
            record(
              "CMP-DIR-219",
              "Holiday occasion edit",
              "Scheduled 15 Oct–31 Dec",
              "campaign",
              draft,
              {
                products: "146 eligible",
                publishers: "6 invited",
                tracking: "Not active",
                performance: "No traffic",
              },
              { tags: ["US / CA", "Draft"] },
            ),
          ],
          filters: ["All campaigns", "Active", "Scheduled", "Draft"],
        },
        {
          id: "publishers",
          label: "Creators",
          detail:
            "Approval, scope, disclosures, traffic restrictions, and acceptance",
          layout: "publishers",
          eyebrow: "Merchant-authorized distribution",
          title: "Creator approval roster",
          description:
            "A creator can promote only the campaign, products, assets, disclosures, and traffic methods accepted by the merchant.",
          metrics: [
            {
              label: "Approved",
              value: "14",
              detail: "Across six campaigns",
              tone: "lilac",
            },
            {
              label: "Pending",
              value: "3",
              detail: "Terms acceptance",
              tone: "orange",
            },
            {
              label: "Restricted",
              value: "2",
              detail: "Traffic-method limits",
              tone: "rose",
            },
          ],
          cards: [
            card(
              "PUB-00412",
              "Maya Laurent",
              "Fashion editorial and silent try-on reels for the autumn tailoring campaign.",
              "Accepted 24 Jul",
              "lilac",
              "publisher",
              approved,
              {
                fields: [
                  { label: "Product scope", value: "164 products" },
                  { label: "Traffic", value: "Organic social" },
                  { label: "Disclosure", value: "Required" },
                  {
                    label: "Assets",
                    value: "Product pages + approved derivatives",
                  },
                ],
              },
            ),
            card(
              "PUB-00418",
              "Rae Mensah",
              "Styling education and Complete Look content for tailoring products.",
              "Accepted 26 Jul",
              "blue",
              "publisher",
              approved,
              {
                fields: [
                  { label: "Product scope", value: "88 products" },
                  { label: "Traffic", value: "Social + newsletter" },
                  { label: "Disclosure", value: "Required" },
                  { label: "Assets", value: "Approved campaign kit" },
                ],
              },
            ),
            card(
              "PUB-00431",
              "Zoe Park",
              "Holiday occasion proposal awaiting campaign terms acceptance.",
              "Invite sent 31 Jul",
              "orange",
              "publisher",
              review,
              {
                fields: [
                  { label: "Product scope", value: "146 proposed" },
                  { label: "Traffic", value: "Organic social" },
                  { label: "Disclosure", value: "Pending acceptance" },
                  { label: "Assets", value: "Not released" },
                ],
              },
            ),
          ],
          notice:
            "Approve, revoke, and invite controls are intentionally disabled in this demo.",
        },
        {
          id: "terms",
          label: "Rates & terms",
          detail:
            "Effective dates, product conditions, exclusions, tracking IDs, and audit history",
          layout: "terms",
          eyebrow: "Commercial audit trail",
          title: "Rate & term history",
          description:
            "Rates shown to creators keep their conditions, dates, return treatment, validation rules, and funding source.",
          metrics: [
            {
              label: "Average rate",
              value: "8.4%",
              detail: "Weighted creator commission",
              tone: "orange",
            },
            {
              label: "Upcoming changes",
              value: "2",
              detail: "Effective this month",
              tone: "rose",
            },
            {
              label: "Term versions",
              value: "18",
              detail: "Auditable history",
              tone: "blue",
            },
          ],
          fields: [
            { label: "Campaign", value: "Autumn tailoring launch" },
            { label: "Current rate", value: "8.4% validated net sale" },
            {
              label: "Attribution",
              value: "Last qualified creator referral · 30 days",
            },
            { label: "Returns", value: "Commission reversed" },
            {
              label: "Exclusions",
              value: "Tax, shipping, gifts, canceled items",
            },
            { label: "Funding", value: "Merchant-funded" },
          ],
          timeline: [
            {
              id: "TERM-v4",
              title: "Rate v4 effective",
              detail: "Tailoring commission increased from 7.8% to 8.4%.",
              meta: "01 Aug 2026",
              icon: "billing",
              status: approved,
            },
            {
              id: "TERM-v3",
              title: "Product scope expanded",
              detail:
                "Pleated trousers and Complete Look results added after merchant review.",
              meta: "24 Jul 2026",
              icon: "catalog",
              status: approved,
            },
            {
              id: "TERM-v2",
              title: "Traffic restriction clarified",
              detail:
                "Paid search and merchant trademark bidding remain prohibited.",
              meta: "18 Jul 2026",
              icon: "permission",
              status: protectedStatus,
            },
            {
              id: "TERM-v1",
              title: "Creator campaign activated",
              detail: "Creator terms and the campaign ledger became active.",
              meta: "01 Jul 2026",
              icon: "campaign",
              status: approved,
            },
          ],
        },
      ],
    },
    billing: {
      eyebrow: "Creator payments",
      title: "Billing & payouts",
      detail:
        "Manage your payment method, see exact influencer commissions, pay creators, and download past invoices.",
      tabs: [
        {
          id: "events",
          label: "Billable events",
          detail:
            "Result evidence, participating products, exclusions, retries, cache, and charge",
          layout: "ledger",
          eyebrow: "Contract-defined usage",
          title: "Qualified-result ledger",
          description:
            "Only completed shopper-visible results using participating merchant products are charged under the signed Order Form.",
          metrics: [
            {
              label: "Qualified",
              value: "1,284",
              detail: "$642.00 gross usage",
              tone: "blue",
            },
            {
              label: "Excluded",
              value: "46",
              detail: "$0.00 charge",
              tone: "neutral",
            },
            {
              label: "Contracted rate",
              value: "$0.50",
              detail: "Per participating product",
              tone: "mint",
            },
          ],
          columns: [
            { key: "products", label: "Products" },
            { key: "workflow", label: "Workflow" },
            { key: "evidence", label: "Retry / cache" },
            { key: "charge", label: "Charge" },
          ],
          records: [
            record(
              "EVT-78432",
              "Qualified try-on result",
              "Delivered 01 Aug · 11:42",
              "billing",
              approved,
              {
                products: "1 · PRD-10412",
                workflow: "try-on v7",
                evidence: "0 retry / miss",
                charge: "$0.50",
              },
              {
                fields: [
                  { label: "Delivered result", value: "AST-51208" },
                  { label: "Merchant product", value: "Silk column dress" },
                  { label: "Latency", value: "7.8s" },
                  { label: "Rule", value: "Order Form v3 §4.2" },
                ],
              },
            ),
            record(
              "EVT-78421",
              "Qualified Complete Look",
              "Delivered 01 Aug · 11:17",
              "billing",
              approved,
              {
                products: "3 participating",
                workflow: "complete-look v4",
                evidence: "0 retry / hit",
                charge: "$1.50",
              },
              {
                fields: [
                  { label: "Delivered result", value: "AST-51221" },
                  { label: "Charge basis", value: "3 participating products" },
                  { label: "Latency", value: "4.1s" },
                  { label: "Duplicate", value: "No" },
                ],
              },
            ),
            record(
              "EVT-78398",
              "Incomplete result excluded",
              "Ended 31 Jul · 20:10",
              "billing",
              excluded,
              {
                products: "1 · PRD-10418",
                workflow: "try-on v7",
                evidence: "2 retries / miss",
                charge: "$0.00",
              },
              {
                fields: [
                  { label: "Reason", value: "No shopper-visible result" },
                  { label: "Automatic retries", value: "2" },
                  { label: "Delivered", value: "No" },
                  { label: "Charge", value: "Excluded" },
                ],
              },
            ),
            record(
              "EVT-78382",
              "Cached duplicate excluded",
              "Returned 31 Jul · 19:48",
              "billing",
              protectedStatus,
              {
                products: "1 · PRD-10412",
                workflow: "try-on v7",
                evidence: "0 retry / hit",
                charge: "$0.00",
              },
              {
                fields: [
                  { label: "Original event", value: "EVT-78379" },
                  { label: "Shopper request", value: "Refresh" },
                  { label: "Delivered", value: "Cached result" },
                  { label: "Double charge", value: "Prevented" },
                ],
              },
            ),
          ],
          filters: ["All events", "Qualified", "Excluded", "Cache protected"],
        },
        {
          id: "statements",
          label: "Statements",
          detail:
            "Commitment, qualified usage, credits, creator commission, payment, and balance",
          layout: "statement",
          eyebrow: "Itemized commercial record",
          title: "August statement",
          description:
            "Qualified usage, commitment credit, creator commission, adjustments, payments, and balance remain separately reconcilable.",
          metrics: [
            {
              label: "Current balance",
              value: "$642.00",
              detail: "Statement STM-2026-08",
              tone: "blue",
            },
            {
              label: "Usage charges",
              value: "$642.00",
              detail: "1,284 qualified events",
              tone: "orange",
            },
            {
              label: "Commitment credit",
              value: "-$118.00",
              detail: "Applied once",
              tone: "mint",
            },
            {
              label: "Creator commission",
              value: "$118.40",
              detail: "Validated campaign sales",
              tone: "lilac",
            },
          ],
          fields: [
            { label: "Qualified-event usage", value: "$642.00" },
            { label: "Monthly commitment", value: "$118.00" },
            { label: "Commitment credit", value: "-$118.00", tone: "positive" },
            { label: "Creator campaign commission", value: "$118.40" },
            { label: "Prior payment", value: "-$118.40", tone: "positive" },
            { label: "Amount due", value: "$642.00", tone: "warning" },
            { label: "Invoice period", value: "01–08 Aug 2026" },
            { label: "Dispute deadline", value: "22 Aug 2026" },
          ],
          chart: {
            title: "Usage by week",
            detail: "Qualified charges and protected exclusions",
            primaryLabel: "Qualified ($)",
            secondaryLabel: "Excluded events",
            points: [
              { label: "W1", primary: 56, secondary: 8 },
              { label: "W2", primary: 69, secondary: 12 },
              { label: "W3", primary: 84, secondary: 11 },
              { label: "W4", primary: 96, secondary: 15 },
            ],
          },
          notice:
            "Pay and dispute actions are unavailable in this demo; statement evidence is read-only.",
        },
        {
          id: "disputes",
          label: "Disputes",
          detail:
            "Reason, evidence, owner, amount, deadline, and decision history",
          layout: "cases",
          eyebrow: "Evidence-based review",
          title: "Open dispute cases",
          description:
            "Each question stays linked to event evidence, the applicable Order Form rule, ownership, response date, and final adjustment.",
          metrics: [
            {
              label: "Open cases",
              value: "2",
              detail: "$46.00 under review",
              tone: "rose",
            },
            {
              label: "Evidence complete",
              value: "1 / 2",
              detail: "One merchant file pending",
              tone: "orange",
            },
            {
              label: "Resolved this month",
              value: "4",
              detail: "$22.50 credited",
              tone: "mint",
            },
          ],
          cards: [
            card(
              "DSP-00418",
              "Duplicate event review",
              "Sixty-four refresh events were compared against original delivered-result IDs.",
              "$32.00 · response due 10 Aug",
              "rose",
              "incident",
              open,
              {
                fields: [
                  { label: "Owner", value: "Billing operations" },
                  { label: "Evidence", value: "Complete" },
                  { label: "Rule", value: "No duplicate charge" },
                  { label: "Proposed result", value: "$32 credit" },
                ],
              },
            ),
            card(
              "DSP-00421",
              "Pilot credit applicability",
              "Merchant requested confirmation that July commitment credit carried into August.",
              "$14.00 · response due 12 Aug",
              "orange",
              "document",
              review,
              {
                fields: [
                  { label: "Owner", value: "Merchant success" },
                  { label: "Evidence", value: "Order Form requested" },
                  { label: "Rule", value: "Monthly credit" },
                  { label: "Decision", value: "Pending" },
                ],
              },
            ),
            card(
              "DSP-00402",
              "Retry charge adjustment",
              "Verified automatic retries were excluded and the statement was credited.",
              "$12.50 · resolved 31 Jul",
              "mint",
              "billing",
              approved,
              {
                fields: [
                  { label: "Owner", value: "Billing operations" },
                  { label: "Evidence", value: "Complete" },
                  { label: "Adjustment", value: "-$12.50" },
                  { label: "Decision", value: "Merchant accepted" },
                ],
              },
            ),
          ],
          notice:
            "Open dispute is disabled in the demo. Existing case evidence and decisions remain selectable.",
        },
        {
          id: "exports",
          label: "Reports",
          detail:
            "Prepared reconciliation files, formats, row counts, and generation history",
          layout: "exports",
          eyebrow: "Report preparation",
          title: "Reconciliation exports",
          description:
            "Prepared files keep periods, filters, row counts, versions, and evidence scope visible before download.",
          metrics: [
            {
              label: "Reports",
              value: "3",
              detail: "Finance and campaigns",
              tone: "blue",
            },
            {
              label: "Largest report",
              value: "1,942",
              detail: "Qualified-event rows",
              tone: "cyan",
            },
            {
              label: "Retention",
              value: "90 days",
              detail: "Demo presentation",
              tone: "lilac",
            },
          ],
          columns: [
            { key: "period", label: "Period" },
            { key: "format", label: "Format" },
            { key: "rows", label: "Rows" },
            { key: "prepared", label: "Prepared" },
          ],
          records: [
            record(
              "EXP-10214",
              "Qualified-event reconciliation",
              "Event evidence, exclusion reason, participating products, and charge",
              "document",
              ready,
              {
                period: "July 2026",
                format: "CSV",
                rows: "1,942",
                prepared: "01 Aug",
              },
              { tags: ["Version 3", "Statement-ready"] },
            ),
            record(
              "EXP-10208",
              "Order and return ledger",
              "Item-level order, return, attribution, and commission state",
              "document",
              ready,
              {
                period: "July 2026",
                format: "CSV",
                rows: "232",
                prepared: "01 Aug",
              },
              { tags: ["Version 2", "Reconciled"] },
            ),
            record(
              "EXP-10191",
              "Creator campaign ledger",
              "Campaign, creator, terms, orders, returns, and commission",
              "document",
              scheduled,
              {
                period: "August MTD",
                format: "CSV",
                rows: "84",
                prepared: "Scheduled",
              },
              { tags: ["Creator campaigns", "Closes 08 Aug"] },
            ),
          ],
          filters: ["All files", "CSV", "XLSX", "Scheduled"],
          notice:
            "Download buttons are disabled because no report service or persisted files are connected.",
        },
      ],
    },
    account: {
      eyebrow: "Account & governance",
      title: "Merchant identity & controls",
      detail:
        "Qualification, agreements, permissions, contacts, privacy, support, and lifecycle.",
      tabs: [
        {
          id: "profile",
          label: "Merchant profile",
          detail:
            "Qualification, legal identity, integration, and activation readiness",
          layout: "profile",
          eyebrow: "Qualified merchant record",
          title: "Northstar Atelier, Inc.",
          description:
            "The legal seller, storefront identity, technical path, supported regions, catalog readiness, and go/no-go exceptions stay reviewable.",
          metrics: [
            {
              label: "Program status",
              value: "Active",
              detail: "Merchant service",
              tone: "blue",
            },
            {
              label: "Readiness",
              value: "12 / 12",
              detail: "Activation controls complete",
              tone: "mint",
            },
            {
              label: "Open exceptions",
              value: "2",
              detail: "Post-launch review",
              tone: "orange",
            },
          ],
          fields: [
            { label: "Legal entity", value: "Northstar Atelier, Inc." },
            { label: "Storefront", value: "Northstar Atelier" },
            { label: "Merchant ID", value: "MRC-10482" },
            { label: "Regions", value: "US, CA, UK" },
            { label: "Currencies", value: "USD, CAD, GBP" },
            { label: "Integration", value: "Shopify API" },
            { label: "Go-live", value: "01 Jul 2026" },
          ],
          timeline: [
            {
              id: "QUAL-01",
              title: "Commercial qualification",
              detail:
                "Business identity, product categories, regions, returns, and support reviewed.",
              meta: "Complete",
              icon: "agreement",
              status: passed,
            },
            {
              id: "QUAL-02",
              title: "Technical discovery",
              detail:
                "Catalog, cart, order, refund, and lifecycle paths confirmed.",
              meta: "Complete",
              icon: "connection",
              status: passed,
            },
            {
              id: "QUAL-03",
              title: "Catalog and rights readiness",
              detail:
                "Product set, size charts, PDP template, and permitted AI uses approved.",
              meta: "Complete",
              icon: "permission",
              status: passed,
            },
            {
              id: "QUAL-04",
              title: "Program activation",
              detail: "KPIs, privacy, incidents, and closeout path recorded.",
              meta: "Active",
              icon: "activity",
              status: approved,
            },
          ],
          cards: [
            card(
              "QUAL-RISK",
              "Post-launch watchlist",
              "Twelve size-chart conflicts and one refund field mapping remain under active review.",
              "No activation stop condition",
              "orange",
              "incident",
              review,
            ),
          ],
        },
        {
          id: "agreements",
          label: "Agreements",
          detail:
            "Agreement, Order Form, addenda, effective dates, pilot terms, and commercial limits",
          layout: "documents",
          eyebrow: "Legal & commercial authority",
          title: "Agreement record",
          description:
            "Activation depends on an effective Connected Merchant Agreement, a complete Order Form, and separately reviewable permissions and notice contacts.",
          metrics: [
            {
              label: "Agreement",
              value: "Effective",
              detail: "Signed 12 Jun 2026",
              tone: "mint",
            },
            {
              label: "Order Form",
              value: "v3",
              detail: "Effective 01 Jul 2026",
              tone: "blue",
            },
            {
              label: "Addenda",
              value: "2",
              detail: "Privacy + campaign",
              tone: "lilac",
            },
          ],
          cards: [
            card(
              "AGR-10482",
              "Connected Merchant Agreement",
              "Legal entity, authorized products, rights, notices, liability, term, and termination controls.",
              "Effective 12 Jun 2026",
              "blue",
              "agreement",
              approved,
              {
                fields: [
                  { label: "Term", value: "12 months" },
                  { label: "Renewal", value: "Manual" },
                  { label: "Notice", value: "30 days" },
                  { label: "Version", value: "Current signed copy" },
                ],
              },
            ),
            card(
              "OF-10482-V3",
              "Merchant Order Form v3",
              "Pilot scope, catalog limit, event pricing, commitment, campaign terms, reporting, and payment.",
              "Effective 01 Jul 2026",
              "orange",
              "document",
              approved,
              {
                fields: [
                  { label: "Catalog limit", value: "5,000 parents" },
                  { label: "Event fee", value: "$0.50 / product" },
                  { label: "Pilot allowance", value: "1,500 events" },
                  { label: "Payment", value: "Net 30" },
                ],
              },
            ),
            card(
              "ADD-PRIVACY",
              "Privacy & processing addendum",
              "Consent, first-party identifiers, retention, deletion, incidents, and subprocessors.",
              "Effective 01 Jul 2026",
              "lilac",
              "privacy",
              approved,
              {
                fields: [
                  { label: "Retention", value: "Contract + legal" },
                  { label: "Incident notice", value: "Without undue delay" },
                  { label: "Deletion", value: "On valid request" },
                  { label: "Training", value: "Not granted" },
                ],
              },
            ),
          ],
          notice:
            "Documents are summarized as demo records; source files and signing controls are not connected.",
        },
        {
          id: "permissions",
          label: "Permissions",
          detail:
            "Independent catalog, image, AI, product-page, retrieval, training, cart, reporting, and creator grants",
          layout: "matrix",
          eyebrow: "Independent rights",
          title: "Permission matrix",
          description:
            "One granted use never implies another. Every input and output keeps its source, scope, permission, version, and effective date.",
          metrics: [
            {
              label: "Granted uses",
              value: "8",
              detail: "Contract-defined scope",
              tone: "lilac",
            },
            {
              label: "Restricted",
              value: "2",
              detail: "Training + unapproved reuse",
              tone: "neutral",
            },
            {
              label: "Pending review",
              value: "1",
              detail: "PDP derivative scope",
              tone: "orange",
            },
          ],
          matrixColumns: ["Source", "Scope", "Agreement", "Effective", "State"],
          matrixRows: [
            {
              id: "PER-FEED",
              label: "Catalog feed",
              detail: "Import and normalize merchant-authorized product data",
              values: [
                { label: "Source", value: "Shopify" },
                { label: "Scope", value: "5,000 parents" },
                { label: "Agreement", value: "Order Form v3" },
                { label: "Effective", value: "01 Jul" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
            {
              id: "PER-IMG",
              label: "Merchant imagery",
              detail:
                "Display, crop, resize, normalize, and background removal",
              values: [
                { label: "Source", value: "Merchant images" },
                { label: "Scope", value: "Approved products" },
                { label: "Agreement", value: "Rights schedule" },
                { label: "Effective", value: "01 Jul" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
            {
              id: "PER-AI",
              label: "AI derivatives",
              detail:
                "Try-on, styling, comparison, and shopper-requested outputs",
              values: [
                { label: "Source", value: "Merchant + shopper" },
                { label: "Scope", value: "Delivered results" },
                { label: "Agreement", value: "Order Form v3" },
                { label: "Effective", value: "01 Jul" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
            {
              id: "PER-PDP",
              label: "Product pages & SEO",
              detail:
                "Product-page publication, metadata, structured data, and indexing",
              values: [
                { label: "Source", value: "Catalog + approved copy" },
                { label: "Scope", value: "Approved products" },
                { label: "Agreement", value: "Product-page addendum" },
                { label: "Effective", value: "01 Jul" },
                {
                  label: "State",
                  value: "Review page derivatives",
                  status: review,
                },
              ],
            },
            {
              id: "PER-RAG",
              label: "RAG retrieval",
              detail: "Retrieve merchant content for product-grounded answers",
              values: [
                { label: "Source", value: "Approved catalog" },
                { label: "Scope", value: "Product service" },
                { label: "Agreement", value: "Rights schedule" },
                { label: "Effective", value: "01 Jul" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
            {
              id: "PER-TRAIN",
              label: "General model training",
              detail:
                "General-purpose model improvement outside service delivery",
              values: [
                { label: "Source", value: "No content" },
                { label: "Scope", value: "None" },
                { label: "Agreement", value: "Explicit exclusion" },
                { label: "Effective", value: "Not granted" },
                { label: "State", value: "Not granted", status: notGranted },
              ],
            },
            {
              id: "PER-CART",
              label: "Cart & reporting",
              detail:
                "Exact cart handoff and merchant lifecycle reconciliation",
              values: [
                { label: "Source", value: "Merchant API" },
                { label: "Scope", value: "Contracted events" },
                { label: "Agreement", value: "Order Form v3" },
                { label: "Effective", value: "01 Jul" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
            {
              id: "PER-PUB",
              label: "Creator campaign assets",
              detail: "Campaign-specific assets and disclosure copy",
              values: [
                { label: "Source", value: "Approved campaign kit" },
                { label: "Scope", value: "Authorized creators" },
                { label: "Agreement", value: "Campaign terms" },
                { label: "Effective", value: "Per campaign" },
                { label: "State", value: "Granted", status: approved },
              ],
            },
          ],
        },
        {
          id: "contacts",
          label: "Contacts",
          detail:
            "Business, technical, billing, legal, privacy, support, and notice owners",
          layout: "contacts",
          eyebrow: "Account ownership",
          title: "Merchant contact directory",
          description:
            "Every operational, legal, financial, technical, privacy, support, and notice responsibility has a current named owner.",
          metrics: [
            {
              label: "Required roles",
              value: "7 / 7",
              detail: "All assigned",
              tone: "mint",
            },
            {
              label: "Notice contacts",
              value: "2",
              detail: "Legal + security",
              tone: "lilac",
            },
            {
              label: "Last verified",
              value: "28 Jul",
              detail: "Merchant confirmation",
              tone: "blue",
            },
          ],
          cards: [
            card(
              "CON-BUSINESS",
              "Maya Chen",
              "Business owner and pilot closeout approver.",
              "maya@northstar.demo",
              "blue",
              "contact",
              approved,
              {
                fields: [
                  { label: "Role", value: "Business owner" },
                  { label: "Coverage", value: "Commercial + pilot" },
                ],
              },
            ),
            card(
              "CON-TECH",
              "Alex Morgan",
              "Integration, catalog, cart, and lifecycle engineering.",
              "alex@northstar.demo",
              "cyan",
              "connection",
              approved,
              {
                fields: [
                  { label: "Role", value: "Technical owner" },
                  { label: "Coverage", value: "Production systems" },
                ],
              },
            ),
            card(
              "CON-BILLING",
              "Priya Shah",
              "Statements, reconciliation, tax, and payment questions.",
              "finance@northstar.demo",
              "orange",
              "billing",
              approved,
              {
                fields: [
                  { label: "Role", value: "Billing owner" },
                  { label: "Coverage", value: "Finance + tax" },
                ],
              },
            ),
            card(
              "CON-LEGAL",
              "Jordan Lee",
              "Agreement, rights, campaign terms, and notices.",
              "legal@northstar.demo",
              "lilac",
              "agreement",
              approved,
              {
                fields: [
                  { label: "Role", value: "Legal notice" },
                  { label: "Coverage", value: "Contract + rights" },
                ],
              },
            ),
            card(
              "CON-PRIVACY",
              "Privacy Office",
              "Consent, retention, deletion, and incident requests.",
              "privacy@northstar.demo",
              "rose",
              "privacy",
              approved,
              {
                fields: [
                  { label: "Role", value: "Privacy owner" },
                  { label: "Coverage", value: "Data rights" },
                ],
              },
            ),
            card(
              "CON-SUPPORT",
              "Merchant Operations",
              "Daily catalog, PDP, sizing, and support escalation.",
              "ops@northstar.demo",
              "mint",
              "support",
              approved,
              {
                fields: [
                  { label: "Role", value: "Operations" },
                  { label: "Coverage", value: "Mon–Fri 09:00–18:00" },
                ],
              },
            ),
          ],
        },
        {
          id: "privacy",
          label: "Privacy & support",
          detail:
            "Consent, retention, deletion, incidents, SLA, and escalation",
          layout: "support",
          eyebrow: "Consumer & operational safeguards",
          title: "Privacy, support & incidents",
          description:
            "The merchant sees operational evidence without receiving shopper photos, measurements, account history, or PrimeStyleAI credentials.",
          metrics: [
            {
              label: "Support coverage",
              value: "Standard",
              detail: "Business-hours response",
              tone: "blue",
            },
            {
              label: "Open incidents",
              value: "1",
              detail: "Sizing conflict",
              tone: "rose",
            },
            {
              label: "Privacy requests",
              value: "0",
              detail: "Current period",
              tone: "mint",
            },
          ],
          cards: [
            card(
              "SLA-STANDARD",
              "Support commitment",
              "P1 security or checkout incident acknowledged within one hour; standard issues within one business day.",
              "Escalation current",
              "blue",
              "support",
              healthy,
              {
                fields: [
                  { label: "P1 response", value: "1 hour" },
                  { label: "P2 response", value: "4 hours" },
                  { label: "Standard", value: "1 business day" },
                ],
              },
            ),
            card(
              "PRIV-CONTROLS",
              "Privacy controls",
              "Consent, minimization, retention, deletion, opt-out, and incident responsibilities remain documented.",
              "Privacy addendum active",
              "lilac",
              "privacy",
              protectedStatus,
              {
                fields: [
                  { label: "Photos shared", value: "No" },
                  { label: "Measurements shared", value: "No" },
                  { label: "Deletion", value: "Valid requests honored" },
                ],
              },
            ),
          ],
          timeline: [
            {
              id: "INC-00412",
              title: "Size-chart conflict escalation",
              detail:
                "Twelve PDPs paused while the merchant confirms the M/L overlap.",
              meta: "Open · owner Merchandising",
              icon: "sizing",
              status: action,
            },
            {
              id: "INC-00398",
              title: "Cart latency alert",
              detail:
                "Storefront API latency normalized after a 14-minute merchant incident.",
              meta: "Resolved 29 Jul",
              icon: "cart",
              status: approved,
            },
            {
              id: "INC-00372",
              title: "Refund webhook retry",
              detail:
                "Idempotent retry completed with no duplicate financial record.",
              meta: "Resolved 22 Jul",
              icon: "return",
              status: approved,
            },
          ],
        },
        {
          id: "lifecycle",
          label: "Pause or end the program",
          detail:
            "Pause, suspension, termination, access removal, and content/data/financial closeout",
          layout: "lifecycle",
          eyebrow: "Responsible program control",
          title: "Lifecycle & closeout readiness",
          description:
            "Products, features, credentials, content, reports, invoices, disputes, and retained records follow explicit pause, suspension, or termination state.",
          metrics: [
            {
              label: "Lifecycle state",
              value: "Active",
              detail: "No stop condition",
              tone: "mint",
            },
            {
              label: "Paused products",
              value: "12",
              detail: "Size-chart conflict",
              tone: "orange",
            },
            {
              label: "Closeout controls",
              value: "8 / 8",
              detail: "Documented",
              tone: "blue",
            },
          ],
          timeline: [
            {
              id: "LIF-01",
              title: "Pause or remove products",
              detail:
                "Merchant-requested or unsafe products are suppressed from new public experiences.",
              meta: "Control ready",
              icon: "catalog",
              status: ready,
            },
            {
              id: "LIF-02",
              title: "Suspend affected features",
              detail:
                "Rights, security, tracking, cost, or reliability stop conditions pause the relevant service.",
              meta: "Control ready",
              icon: "permission",
              status: ready,
            },
            {
              id: "LIF-03",
              title: "Revoke access & promotion",
              detail:
                "Connections, creator campaign access, new generation, and publication stop when the program ends.",
              meta: "Control ready",
              icon: "connection",
              status: ready,
            },
            {
              id: "LIF-04",
              title: "Content & data closeout",
              detail:
                "Merchant content is removed or retained only under effective contractual and legal requirements.",
              meta: "Plan recorded",
              icon: "privacy",
              status: protectedStatus,
            },
            {
              id: "LIF-05",
              title: "Financial reconciliation",
              detail:
                "Invoices, commissions, payouts, returns, disputes, and reversals close against final merchant truth.",
              meta: "Plan recorded",
              icon: "billing",
              status: protectedStatus,
            },
          ],
          fields: [
            { label: "Current state", value: "Active", tone: "positive" },
            { label: "Termination notice", value: "30 days" },
            {
              label: "Credential revocation",
              value: "Immediate on effective termination",
            },
            { label: "New generation", value: "Stops at rights end" },
            {
              label: "Historical records",
              value: "Privacy and legal retention only",
            },
          ],
          notice:
            "Pause, suspend, and terminate are disabled demo actions; this view exposes the required control sequence only.",
        },
      ],
    },
  },
};
