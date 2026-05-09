# Polaris for the embedded admin app

A short reference for how the Shopify admin (the embedded app at `shopify.primestyleai.com`, mounted inside Shopify Admin) should be built.

> **Two flavors of Polaris exist** — both are official:
> - **Polaris React** (`@shopify/polaris`) — the classic component library. Still supported and widely used in production apps.
> - **Polaris web components / App Home** (`s-page`, `s-section`, `s-button` …) — the **current direction Shopify is pushing for new embedded admin apps**. Globally registered HTML elements, no import needed, types via `@shopify/polaris-types`. Tighter integration with App Bridge.
>
> For a new app or a route refactor, prefer **web components**. The two interoperate, so an incremental migration is fine.

## TL;DR

| Question | Answer |
|---|---|
| Should the admin be built with Polaris? | **Yes** — for the embedded app's pages. |
| Does the storefront try-on widget need Polaris? | **No.** Polaris only applies to merchant-facing UI inside Shopify Admin. |
| Does the marketing site (`primestyleai.com`) need Polaris? | **No.** Your own brand. |
| Does Polaris ship charts? | **No** — use the sibling library `@shopify/polaris-viz`. |
| Can we mix Tailwind with Polaris? | Yes, for layout. **Don't** restyle Polaris components. |
| Required for App Store basic submission? | **No** (custom UI passes basic review). |
| Required for Built for Shopify status? | **Effectively yes** — req 4.1.1 explicitly checks. |

## What Polaris is

`@shopify/polaris` is Shopify's official React design system. Components look exactly like the rest of Shopify admin and ship with built-in WCAG 2.1 AA accessibility, App Bridge integration, and design tokens.

Pair it with `@shopify/app-bridge-react` for the shell pieces (nav, save bar, modals, toasts) — they compose seamlessly with Polaris.

## What Polaris covers

| Category | Examples |
|---|---|
| Layout & shell | `<Page>`, `<Layout>`, `<Card>`, `<EmptyState>`, `<Box>`, `<BlockStack>`, `<InlineStack>` |
| Forms | `<TextField>`, `<Select>`, `<Checkbox>`, `<RadioButton>`, `<DatePicker>`, `<FormLayout>` |
| Tables / lists | `<DataTable>`, `<ResourceList>`, `<ResourceItem>`, `<IndexTable>` |
| Actions | `<Button>`, `<ButtonGroup>`, `<Pagination>` |
| Feedback | `<Banner>`, `<Toast>` (via App Bridge), `<SkeletonPage>`, `<Loading>` |
| Disclosure | `<Modal>` (App Bridge), `<Popover>`, `<Tooltip>`, `<Collapsible>` |
| Navigation | `<TopBar>`, `<Navigation>`, `s-app-nav` (App Bridge) |
| Display | `<Badge>`, `<Tag>`, `<Avatar>`, `<Text>` |

## What Polaris does NOT cover (and what to use instead)

| Need | Use |
|---|---|
| **Charts** (line, bar, donut, sparkline, funnel) | `@shopify/polaris-viz` — Shopify's official chart library, themed to match admin |
| Rich text editor | TipTap / Lexical, themed with Polaris tokens |
| File upload UI | Polaris `<DropZone>` is fine for files; for image cropping reach for a third-party |
| Heavy data grid (sort/filter/virtualize 10k+ rows) | `@tanstack/react-table` skinned with Polaris styles, or `<IndexTable>` if rows are reasonable |
| Drag & drop | `dnd-kit` — Polaris doesn't ship one |

## Charts — `@shopify/polaris-viz`

Install:

```bash
npm i @shopify/polaris-viz
```

### Available chart components

| Component | Best for | Common use in our admin |
|---|---|---|
| `LineChart` | Trends over time, multi-series comparisons | Try-ons per day, conversion rate over time |
| `BarChart` | Categorical comparisons | Try-ons by product, refunds by category |
| `StackedBarChart` | Multi-series totals broken down by group | Orders broken down by "tried-on / didn't try-on / different size" |
| `AreaChart` | Volume trends with cumulative emphasis | Cumulative revenue impact from VTO |
| `ComboChart` | Bars + line on the same axis | Try-ons (bars) + conversion rate (line overlay) |
| `DonutChart` | Part-of-whole, ≤6 slices | Returns prevented vs returned |
| `FunnelChart` | Step-by-step drop-off | Try-on funnel: viewed → uploaded → completed → bought |
| `Sparkline` | Inline trend in a metric card (no axes) | The little wave under a "Try-ons this week" KPI tile |
| `Sparkbar` | Inline tiny bar chart in a card | Bar version of the same |
| `SimpleNormalizedChart` | Compact horizontal share bar | Top 5 products contributing X% of try-ons |

### Provider setup

Wrap your app once at the root, alongside the Polaris `<AppProvider>`:

```tsx
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import enTranslations from "@shopify/polaris/locales/en.json";
import { PolarisVizProvider } from "@shopify/polaris-viz";
import "@shopify/polaris-viz/build/esm/styles.css";

<AppProvider i18n={enTranslations}>
  <PolarisVizProvider
    themes={{
      Default: {
        chartContainer: { backgroundColor: "transparent" },
        seriesColors: { upToFour: ["#2154EF", "#4ade80", "#f59e0b", "#a855f7"] },
      },
    }}
  >
    {children}
  </PolarisVizProvider>
</AppProvider>
```

Built-in themes: `"Light"`, `"Dark"`, `"Default"`. You can register custom themes (`themes={{...}}`) and pick one per chart with `theme="Default"`.

### Data shape

Every chart takes a `data` array of named series. Each series has a `name` and a `data` array of `{ key, value }` points. Switching from `LineChart` → `BarChart` → `AreaChart` typically only requires changing the import — the data shape is the same.

```tsx
const data = [
  {
    name: "Tried on, bought recommended size",
    data: [
      { key: "Mon", value: 24 },
      { key: "Tue", value: 31 },
      { key: "Wed", value: 28 },
    ],
  },
  {
    name: "Did not try on",
    data: [
      { key: "Mon", value: 12 },
      { key: "Tue", value: 9 },
      { key: "Wed", value: 18 },
    ],
  },
];
```

### Sparklines inside metric cards

Tight inline trends — perfect for the dashboard's KPI tiles. No axes, no legend, just the shape of the trend.

```tsx
import { Card, Text, BlockStack } from "@shopify/polaris";
import { SparkLineChart } from "@shopify/polaris-viz";

<Card>
  <BlockStack gap="100">
    <Text as="p" variant="bodySm" tone="subdued">Try-ons this week</Text>
    <Text as="h3" variant="headingLg">186</Text>
    <div style={{ height: 48 }}>
      <SparkLineChart
        data={[{ data: [
          { key: 0, value: 12 }, { key: 1, value: 18 },
          { key: 2, value: 24 }, { key: 3, value: 31 },
          { key: 4, value: 28 }, { key: 5, value: 42 },
          { key: 6, value: 31 },
        ]}]}
      />
    </div>
  </BlockStack>
</Card>
```

### Sizing inside Polaris cards

Polaris-viz charts are **responsive width** but need an **explicit container height** to render. Wrap each chart in a div with `height` (or use a fixed-height card body):

```tsx
<Card>
  <Text as="h2" variant="headingMd">Try-ons per day</Text>
  <div style={{ height: 280 }}>
    <LineChart data={data} />
  </div>
</Card>
```

Without an explicit height, the chart collapses to 0 px and looks broken.

### Loading + empty states

```tsx
<LineChart data={data} state="Loading" />
<LineChart data={data} state="Error" errorText="Couldn't load data" />
<LineChart data={[]} emptyStateText="No try-ons yet" />
```

Use these instead of swapping in your own loaders/banners — they keep the layout stable so the card doesn't jump in size.

### Brand-color the chart series

Pick a 4-color palette that pairs with your brand (`#2154EF` is our primary). Register it once in the provider's `themes.Default.seriesColors`, and every chart picks it up. No per-chart `color` props needed.

### Mapping our analytics page to charts

| Block on `app.analytics.tsx` | Chart |
|---|---|
| "Try-ons this week" KPI | `SparkLineChart` |
| "Conversion rate over 30 days" | `LineChart` |
| "Top 10 tried-on products" | `BarChart` (horizontal) |
| "Tried-on vs didn't try-on, by week" | `StackedBarChart` |
| "Try-on funnel" (viewed → uploaded → completed → bought) | `FunnelChart` |
| "Returns prevented" share-of-total | `DonutChart` |
| "Revenue impact, cumulative" | `AreaChart` |

### Bundle weight

Polaris-viz is tree-shakeable: importing only `LineChart` doesn't pull `FunnelChart`, etc. Practical add: ~30–60 KB gzipped depending on what you use.

Docs: https://polaris-viz.shopify.com

## Mixing Tailwind with Polaris

Allowed:

- Tailwind on **wrappers around Polaris** for layout — `grid`, `flex`, `gap`, `padding`. Polaris owns the components inside.
- Tailwind for **purely custom areas** Polaris doesn't ship (custom hero blocks, illustrations, brand accents in non-Polaris regions).

Not allowed (review risk):

- Overriding Polaris component internals with Tailwind. If a `<Button>` needs to be branded, use Polaris `tone` / `variant` props or design tokens — not `className="bg-blue-600 !rounded-none"`.
- Building admin-shaped UI from Tailwind divs to "look like" Polaris instead of using the components. Reviewers tag this as inconsistent admin UX. Built for Shopify rejects it.

Right pattern:

```tsx
// ✅ Tailwind for layout, Polaris for components
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
  <Card>
    <Text as="h2" variant="headingMd">Settings</Text>
    <FormLayout>
      <TextField label="Button text" value={value} onChange={setValue} autoComplete="off" />
    </FormLayout>
  </Card>
</div>

// ❌ Tailwind reskin of a Polaris-shaped div
<div className="rounded-lg border border-shopify-border bg-white p-6">
  <h2 className="text-base font-semibold">Settings</h2>
  <button className="bg-shopify-action px-4 py-2 text-white">Save</button>
</div>
```

## Brand accents — Polaris design tokens

Use Polaris CSS variables in custom CSS so your branding stays consistent with the admin:

| Token | Purpose |
|---|---|
| `--p-color-bg-surface` | Page background |
| `--p-color-bg-fill-brand` | Primary brand fill (buttons) |
| `--p-color-text` | Default text |
| `--p-color-text-secondary` | Muted text |
| `--p-color-border` | Borders |
| `--p-space-100` … `--p-space-1600` | Spacing scale |
| `--p-border-radius-200` … `--p-border-radius-500` | Corner radii |

Full list: https://polaris.shopify.com/tokens

## Required for what

| Goal | Polaris required? |
|---|---|
| Pass App Store basic review | **No** — custom UI passes. Reviewers may flag inconsistent UX as a soft issue. |
| Built for Shopify status | **Yes** — req 4.1.1 explicitly checks for Polaris use, mobile responsiveness, contrast. |
| Pass `s-app-nav` requirement (BFS 4.1.4) | **Yes** — App Bridge `s-app-nav` is required for in-app navigation. |
| Contextual Save Bar on forms (BFS 4.1.5) | **Yes** — App Bridge `<ContextualSaveBar>` required for forms. |
| Modal usage (BFS 4.1.6) | **Yes** — App Bridge `s-modal` required, with proper slots. |

## Where this app stands today

The current admin (`PrimeStyleAI-shopify/app/routes/app.*.tsx`) is mostly **Tailwind with shopify-themed CSS variables** (`bg-shopify-action`, `text-shopify-text`, `border-shopify-border`). Functional + good-looking but not actual Polaris.

To pass Built for Shopify, swap the Tailwind components out for Polaris primitives. Routes that need work:

- `app._index.tsx` — replace custom cards + buttons with `<Page>` + `<Card>` + `<Button>`
- `app.detect-size-charts.tsx` — replace the picker rows + tabs with `<Tabs>` + `<ResourceList>` (or `<IndexTable>`)
- `app.size-charts.tsx` — replace tables with `<DataTable>` or `<IndexTable>`
- `app.products.tsx` — same
- `app.settings.tsx` — wrap in `<Page>` + `<Layout.AnnotatedSection>`, use `<TextField>`, `<ColorPicker>`, etc., wire `<ContextualSaveBar>`
- `app.billing.tsx` — `<Page>` + `<CalloutCard>` for plan tiles
- `app.analytics.tsx` — keep custom cards, swap chart code to `@shopify/polaris-viz`

Migration is mostly mechanical — the data + state stays, the JSX changes. Estimate: 2-4 days of focused refactoring.

## Quick install

```bash
cd ~/Projects/PrimeStyleAI-shopify
npm i @shopify/polaris @shopify/polaris-icons @shopify/polaris-viz
```

Then in `app/root.tsx` (or wherever the providers are wired):

```tsx
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import enTranslations from "@shopify/polaris/locales/en.json";
import { PolarisVizProvider } from "@shopify/polaris-viz";
import "@shopify/polaris-viz/build/esm/styles.css";

<AppProvider i18n={enTranslations}>
  <PolarisVizProvider>
    {/* app */}
  </PolarisVizProvider>
</AppProvider>
```

## Resources

- Polaris components: https://polaris.shopify.com/components
- Polaris tokens: https://polaris.shopify.com/tokens
- Polaris Viz (charts): https://polaris-viz.shopify.com
- App Bridge React: https://shopify.dev/docs/api/app-bridge-library
- Polaris App Home (web components + patterns): https://shopify.dev/docs/api/app-home
- Built for Shopify design checks: https://shopify.dev/docs/apps/launch/built-for-shopify/requirements

---

## Templates — start from these, don't invent layout

Shopify ships four canonical full-page templates. Every screen in the app should map to one of them. Reviewers look for these patterns; using them = "feels like Shopify admin" for free.

| Template | When to use | Our route mapping |
|---|---|---|
| **Homepage** | Primary landing page — quick metrics, setup guide, key actions | `app._index.tsx` |
| **Index** | Manage a collection of resources, perform bulk actions | `app.size-charts.tsx`, `app.products.tsx`, `app.detect-size-charts.tsx` |
| **Details** | View / edit one resource (dual-column main + aside) | (future: per size-chart edit page, per product config) |
| **Settings** | App preferences grouped by topic, with Save Bar | `app.settings.tsx`, `app.billing.tsx` |

Reference: https://shopify.dev/docs/api/app-home/patterns

### Homepage template — minimal validated example

```tsx
export default function Homepage() {
  return (
    <s-page heading="PrimeStyle Try-On">
      <s-button slot="primary-action" href="/app/size-charts">Upload size chart</s-button>
      <s-button slot="secondary-actions" href="/app/detect-size-charts">Detect existing</s-button>
      <s-button slot="secondary-actions" href="/app/products">Configure products</s-button>

      <s-section heading="Setup">
        <s-stack direction="block" gap="base">
          <s-text>Add the Try-On block to your theme to show the widget on product pages.</s-text>
          <s-button variant="primary">Open Theme Editor</s-button>
        </s-stack>
      </s-section>

      <s-section heading="This week">
        <s-grid grid-template-columns="repeat(3, 1fr)" gap="base">
          <s-stack direction="block" gap="small-100">
            <s-text tone="neutral">Try-ons</s-text>
            <s-heading>186</s-heading>
          </s-stack>
          <s-stack direction="block" gap="small-100">
            <s-text tone="neutral">Conversion rate</s-text>
            <s-heading>34%</s-heading>
          </s-stack>
          <s-stack direction="block" gap="small-100">
            <s-text tone="neutral">Returns prevented</s-text>
            <s-heading>12</s-heading>
          </s-stack>
        </s-grid>
      </s-section>
    </s-page>
  );
}
```

(Validated against Shopify's `app-home` schema. No `@shopify/polaris` import needed — `s-*` web components are globally registered.)

---

## Patterns — drop-in compositions

Patterns are pre-designed compositions Shopify recommends — use them instead of inventing your own:

- **Setup guide** — multi-step onboarding card with progress
- **Metrics card** — KPI tile (number + sparkline + trend arrow)
- **Empty state** — when a collection has no items yet
- **Callout card** — inline promo / upgrade prompt
- **Account connection** — link an external account (we'd use this for the merchant's own analytics integrations)
- **Footer help** — "Learn more" / docs link block at the bottom
- **Index table** — rich table with sort, filter, bulk actions
- **Resource list** — scrollable list with thumbnails + actions
- **App card** / **Media card** — cards with imagery
- **Interstitial nav** — multi-step flow nav

Each pattern's full code: https://shopify.dev/docs/api/app-home/patterns

---

## Best practices (from Shopify's official guidelines)

### Page

- One `<s-page>` per route. Always set a `heading`.
- **Max one primary action** per page (`slot="primary-action"`).
- **Max three secondary actions** (`slot="secondary-actions"`). More → group inside `<s-menu>` and trigger with a single button.
- **No actions at the bottom of the page**. Top-bar only. Save Bar handles save/cancel for forms.
- Use **breadcrumbs** (`slot="breadcrumb-actions"`) when the page is part of a flow.
- Add a **status badge** (`slot="accessory"`) when the page represents a stateful resource.
- `inline-size`: `"small" | "base" | "large"`. The `aside` slot only renders when `inline-size="large"`.

### Banners

- **Only one banner visible at a time.**
- **Persist dismissals** to localStorage or DB so the user doesn't see the same banner twice. Don't keep showing the same upgrade nag.

### Setup guide

- Keep step instructions brief and direct.
- Only ask merchants for **required** info — no optional fields cluttering setup.
- Persist dismissal so the guide doesn't reappear after the user marks it done.

### Forms

- Wrap forms with **App Bridge Save Bar** (`shopify.saveBar.show()` / `<s-save-bar>`). Don't ship your own "Save" button at the bottom of the page.
- Disable the save button until the form is dirty.
- Show inline errors on the offending field (red, persistent — never auto-dismiss errors via toast).

### Toasts vs banners

- **Toast** = transient confirmation ("Saved"). Auto-dismisses. Never use for errors.
- **Banner** = persistent message. Use for errors, warnings, info that stays until acknowledged.

### Modals

- Use App Bridge `<s-modal>` (or `shopify.modal.show()`), not your own div with backdrop.
- Use `commandFor` + `command="--show"` from a button to open declaratively.
- One modal at a time. Keep content scannable.

### Navigation

- Use App Bridge `<s-app-nav>` for the in-app navigation. Don't ship a custom sidebar.
- Each nav item should map to a route in your app.

### Accessibility

- WCAG 2.1 AA contrast — Polaris components handle this automatically. If you write custom CSS, hit 4.5:1 for body text and 3:1 for large text.
- Every interactive element needs a label. Use `accessibility-label` on icon-only buttons.
- Tab order must be logical.

---

## Folder structure (RR7 + Polaris admin)

What the embedded admin should look like. This matches `PrimeStyleAI-shopify`:

```
app/
├── root.tsx                   # AppProvider, PolarisVizProvider, App Bridge script — load order matters!
├── shopify.server.ts          # authenticate.admin, sessions, billing helpers (server-only)
├── routes/
│   ├── _index.tsx             # public landing (rare — usually redirect to /app)
│   ├── app.tsx                # admin shell + AppBridge boundary + nav
│   ├── app._index.tsx         # Homepage template
│   ├── app.products.tsx       # Index template
│   ├── app.size-charts.tsx    # Index template
│   ├── app.size-charts.$id.tsx# Details template
│   ├── app.detect-size-charts.tsx
│   ├── app.settings.tsx       # Settings template
│   ├── app.billing.tsx        # Settings template (variant: pricing tiles)
│   ├── app.analytics.tsx      # Custom — uses polaris-viz
│   ├── auth.$.tsx             # Shopify OAuth catch-all
│   ├── api.proxy.$.tsx        # App proxy passthrough → backend
│   └── webhooks.*.tsx         # GDPR + lifecycle webhooks (each its own route)
├── components/                # Reusable composites (UploadModal, SizeChartTable, etc.)
├── services/                  # Browser-callable backend wrappers (calls api.proxy)
├── lib/                       # Pure utilities — no React, no fetch
└── styles/                    # Polaris/PolarisViz globals if needed

extensions/
└── primestyle-tryon/          # Theme app extension (separate world from admin)
    ├── blocks/
    ├── snippets/
    ├── locales/
    └── assets/

shopify.app.toml               # App config — scopes, webhooks, app proxy
package.json
```

**Conventions:**

- **Routes are dot-namespaced** — `app.settings.tsx` is `/app/settings`. RR7 nests under `app.tsx` automatically.
- **`shopify.server.ts`** is the only file that imports `@shopify/shopify-app-react-router/server`. Loaders import from this, never from the package directly. Keeps the seam thin if Shopify ever changes the helper API.
- **`services/`** holds the typed wrappers around App Proxy / backend calls. Loaders + actions call services, not `fetch` directly. Easy to mock for tests.
- **`components/`** holds composites only — anything one-off lives in its route file. Don't pre-extract.
- **Webhook handlers stay tiny** — validate → enqueue → 200. Heavy work goes to a background job that the backend owns. Webhook route shouldn't take >2 s or Shopify retries.

---

## Code cleaning checklist

Run through this whenever you finish a route or section. Catches the obvious wins.

### Components / JSX

- [ ] Every page wrapped in `<s-page heading="…">`
- [ ] One primary action per page; secondary actions ≤3 (or grouped in `<s-menu>`)
- [ ] No bottom-of-page action buttons (use Save Bar / page header instead)
- [ ] No raw `<button>` / `<input>` / `<table>` for admin chrome — use Polaris components / `s-*`
- [ ] Tailwind only on layout wrappers around Polaris, never restyling Polaris internals
- [ ] No `bg-shopify-*` Tailwind tokens left after migration — use Polaris tokens (`--p-color-*`)
- [ ] Status badges on `slot="accessory"` for stateful resources (Active / Draft / etc.)
- [ ] Empty states use the Empty State pattern, not `<div>You have no items</div>`
- [ ] Errors render in `<s-banner tone="critical">` (persistent), not in toasts

### Forms

- [ ] Save Bar wired (`shopify.saveBar.show()` on dirty)
- [ ] Submit button disabled until dirty
- [ ] Inline errors on offending fields, not modal alerts
- [ ] No custom save buttons in the page body

### Loaders / actions

- [ ] Loader does the minimum data fetch — defer expensive aggregations to client-side or background
- [ ] Loaders call `authenticate.admin()` first; nothing renders before that resolves
- [ ] Mutations go through actions, not client-only fetches
- [ ] Errors thrown from loaders/actions surface as banners on the page, not crashes

### Performance

- [ ] No `useEffect` waterfalls — fetch in loader where possible
- [ ] Lists virtualized when ≥100 rows (or paginated)
- [ ] Images use `loading="lazy"` and explicit `width` / `height` (avoids CLS)
- [ ] Charts wrapped in fixed-height containers (polaris-viz needs explicit height)

### Code hygiene

- [ ] No `any` in non-trivial typings
- [ ] No commented-out code blocks left in
- [ ] No console.log in shipped code (`console.warn` / `error` for legit warnings is fine)
- [ ] No "TODO" without an owner + ticket
- [ ] No duplicated route logic — extract into `services/` or `lib/`
- [ ] Webhooks are idempotent (Shopify retries on non-2xx)

### Accessibility

- [ ] Every icon-only button has `accessibility-label`
- [ ] Tab order matches visual order
- [ ] Focus rings preserved (don't `outline: none` without alternative)
- [ ] Form fields have `<label>` (Polaris components do this automatically; native ones need it)

### Mobile

- [ ] Page tested at 375 / 414 / 768 px
- [ ] Tables collapse responsibly (horizontal scroll OR card view on small)
- [ ] No fixed pixel widths > viewport
- [ ] Modals usable at narrow width

---

## I do have access to Shopify's official skills + docs

Through Claude's Shopify plugin I can pull authoritative docs for:

- **Polaris App Home** (this — embedded admin) — `s-*` web components, templates, patterns
- **Polaris Admin Extensions** — admin actions, blocks, link extensions
- **Polaris Checkout / Customer Account / POS UI Extensions**
- **Admin GraphQL API** — Shopify Admin GraphQL queries/mutations
- **Storefront GraphQL API** — for custom storefronts
- **Hydrogen** — Shopify's React storefront framework
- **Liquid** — themes
- **Functions** — discount, cart/checkout validation, delivery customization, etc.
- **Custom Data** — metafields, metaobjects
- **Storefront Web Components** — `<shopify-store>`, `<shopify-cart>` tags
- **Shopify Admin Execution** — run Admin GraphQL ops against your store via Shopify CLI

Plus a generic **shopify-dev** doc search for anything not covered above.

When I write code through these skills, I run it through Shopify's official validator before showing it — so the snippet above is already type-checked against Shopify's schema. If something fails, I get an exact error and re-search the docs to fix it.

---

## New detections

A second pass through Shopify's full App Home docs surfaced things the earlier sections only hinted at. These are the high-value items worth wiring into our app.

### App Bridge APIs — the JS surface our admin should be using

Available via `useAppBridge()` (hook) or globally on `window.shopify`. Every one of these is officially supported and reduces custom code we'd otherwise have to write.

| API | What it does | Where it should land in our app |
|---|---|---|
| **`useAppBridge`** | Entry hook — returns the `shopify` object | Required wrapper for every other API call from React |
| **Resource Picker** | Native Shopify product / collection / variant picker | **Replace our custom picker on `app.detect-size-charts.tsx`** — looks identical to admin, no UI to maintain |
| **Picker** | Generic typed picker for non-Shopify resources | Future use |
| **Save Bar** | Sticky save / cancel bar at bottom of the embedded admin | **Required on `app.settings.tsx`** — BFS req 4.1.5 |
| **Toast** | Quick confirmation banners ("Saved", "Error") | Replace any custom toasts |
| **Modal** | Programmatic open/close of `<s-modal>` | Replace `UploadSizeChartModal` shell (keep our content inside) |
| **Loading** | Spinner in the title bar during long ops | Show during chart import / VTO call from admin |
| **Navigation** | Type-safe in-admin routing | Wire onboarding deep link to theme editor (TODO #9) |
| **Intents** | Deep links into and out of admin | Activate-app-block deep link |
| **Scopes** | Request additional OAuth scopes post-install | Smaller install footprint — request `read_orders` only when merchant enables analytics |
| **Reviews** | Programmatically prompt for an App Store review | Call after positive moments to hit BFS ≥5 reviews gate |
| **Web Vitals** | Report your own LCP / CLS / INP back to Shopify | Helps BFS perf gates |
| **Support** | "Get help" button | UX polish |
| **Print / Scanner / Share / POS / Tools** | Specialised | Probably not relevant to us |

Reference: https://shopify.dev/docs/api/app-bridge-library

### App Bridge web components — the four shell pieces

These are separate from the regular Polaris `s-*` components and provide the embedded-app chrome itself:

| Component | Purpose | Required because |
|---|---|---|
| `<s-app-nav>` | Sidebar / nav inside the embedded app | **BFS req 4.1.4** — must use this, not a custom sidebar |
| `<s-title-bar>` | Page title bar with primary / secondary actions | Replaces page header chrome you'd otherwise build |
| `<s-save-bar>` | Sticky save / cancel | **BFS req 4.1.5** — required for any form |
| `<s-app-window>` | Embedded-window controls | Rarely needed |

### Form inputs I didn't enumerate before

The full list of input components, with the ones we should adopt right now flagged:

- `s-text-field` · `s-text-area` · `s-email-field` · `s-password-field` · `s-url-field`
- `s-number-field` · **`s-money-field`** — formatted currency
- `s-date-field` · `s-date-picker` · `s-search-field`
- `s-select` · `s-checkbox` · `s-switch` · `s-choice-list`
- **`s-color-picker` / `s-color-field`** — replace the raw hex inputs in `app.settings.tsx`
- **`s-drop-zone`** — replace custom file input in `UploadSizeChartModal`

### Patterns we should adopt — with concrete app placement

Each pattern has a full HTML template in the docs; we drop them in instead of inventing layouts.

| Pattern | Where in our app |
|---|---|
| **Setup guide** | `app._index.tsx` — TODO #22 onboarding checklist (full progress UI included) |
| **Metrics card** | `app._index.tsx` + `app.analytics.tsx` — KPI tiles |
| **Index table** | `app.size-charts.tsx`, `app.products.tsx` — replaces our custom tables |
| **Resource list** | Inside each chart's "assigned products" panel |
| **Empty state** | When merchant has no charts / no try-ons yet |
| **Callout card** | "Add the Try-On block to your theme" promo block |
| **Footer help** | "Need help? Read the docs / Contact us" at the bottom of every page |
| **Account connection** | Future — connect Klaviyo / Google Analytics |

### Per-component gotchas (easy to miss)

These are real caveats from the official docs that bit us before:

- **`<s-page>` `inline-size`** — only `"small" | "base" | "large"`. The `aside` slot **only renders when `inline-size="large"`**. Without that, your sidebar disappears silently.
- **Anchor tags** — `<a>` isn't supported in Remix / React Router 7 apps. Must use the framework's `<Link>`.
- **`s-text` `tone`** — valid values are `"auto" | "neutral" | "info" | "success" | "caution" | "warning" | "critical"`. **`"subdued"` is NOT valid** (caught this when validating the homepage example earlier).
- **String props vs boolean props on web components** — kebab-case attribute names, string keyword props need string values (`padding="base"`, never `padding={true}`).
- **One primary action per page** — multiple `slot="primary-action"` buttons don't error, they just stack badly.
- **Banner persistence** — dismiss state must be stored (localStorage or DB). Re-rendering a "dismissed" banner across visits will fail review for a dark-pattern flag.

### Built-for-Shopify wins from these APIs

Three concrete, low-effort wires that move us toward BFS:

1. **Web Vitals API** — call `shopify.webVitals` from `app/root.tsx` to send our own LCP / CLS / INP. Shopify uses this for the BFS perf gate (admin LCP ≤ 2.5s @ p75, etc.). Without it, Shopify's only data is its synthetic test runs.
2. **Reviews API** — after a positive interaction (e.g., merchant successfully imports their first size chart, or completes their first try-on event), call `shopify.reviews.request()` to prompt them. Shortest path to the ≥5 reviews BFS prerequisite.
3. **Scopes API** — instead of requesting every scope at install (which is what causes review pushback), request optional scopes via `shopify.scopes.request(['read_orders'])` only when the merchant enables a feature that needs them. Reduces our install scope list and the surface area Shopify checks.

### Updated to-do list (delta from the main checklist)

Items the deeper docs surfaced that weren't called out before:

- [ ] Add `<s-save-bar>` to `app.settings.tsx`
- [ ] Add `<s-app-nav>` as the embedded sidebar (replaces custom nav)
- [ ] Replace custom picker in `app.detect-size-charts.tsx` with Resource Picker API
- [ ] Replace `UploadSizeChartModal` shell with `<s-modal>` + Modal API
- [ ] Replace raw color inputs in `app.settings.tsx` with `s-color-picker`
- [ ] Replace custom file input with `s-drop-zone`
- [ ] Wire `shopify.webVitals` from `app/root.tsx`
- [ ] Call `shopify.reviews.request()` after positive milestones
- [ ] Move `read_orders` (and any non-essential scope) to runtime via `shopify.scopes.request()`
