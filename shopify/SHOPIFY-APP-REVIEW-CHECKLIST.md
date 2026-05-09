# PrimeStyle Virtual Try-On — Shopify App Store review readiness

Source docs reviewed (May 2026):
- https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements
- https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices
- https://shopify.dev/docs/apps/launch/built-for-shopify/requirements
- https://shopify.dev/docs/apps/launch/privacy-requirements
- https://shopify.dev/docs/apps/launch/protected-customer-data
- Theme-app-extension asset-size & performance docs

App under review: **PrimeStyle Virtual Try-On**
- Repo: `~/Projects/PrimeStyleAI-shopify/`
- Live: https://shopify.primestyleai.com
- Client ID: `2073d9be81894c70f241ff561f40cb62`
- Architecture: embedded admin (RR7 + Polaris) + theme app extension that bundles the `@primestyleai/tryon` SDK (~1.4 MB gzipped) into `extensions/primestyle-tryon/assets/`

Status legend:
- ✅ Pass — confirmed
- ⚠️ Needs verification — must check before submit
- ❌ Fail — must fix before submit
- 🚧 Partial — works but should improve
- ➖ N/A — doesn't apply to this app

---

## SECTION 1 — Policy

### 1.1 Build and operate within Shopify's platform

| # | Requirement | Status | Action |
|---|---|---|---|
| 1.1.1 | Use session tokens for auth; must work in Chrome incognito with 3rd-party cookies blocked | ⚠️ | Test embedded admin in incognito with strict cookie blocking. Must use App Bridge session tokens, NEVER local storage or 3rd-party cookies. Run end-to-end install + use flow in this mode. |
| 1.1.2 | Use Shopify checkout — no bypass | ✅ | VTO renders garment on user; never touches checkout. |
| 1.1.3 | No theme downloads | ➖ | Not a theme app. |
| 1.1.4 | Truthful info only — no fake reviews / numbers | ⚠️ | Audit App Store listing copy. NO data claims (e.g. "increases conversions by X%"), NO testimonials, NO "best/first/only" phrases. |
| 1.1.5 | Unique app, not duplicate | ✅ | Single VTO app, not duplicated under another name. |
| 1.1.6 | Single-merchant storefronts (not marketplace) | ✅ | VTO is per-merchant, not a marketplace. |
| 1.1.7 | Payment Gateway → Payments API | ➖ | Not a payment app. |
| 1.1.8 | POS only via Shopify POS | ➖ | No POS integration. |
| 1.1.9 | Explicit buyer consent before charges | ➖ | No buyer charges. |
| 1.1.10 | Cheapest shipping default | ➖ | No shipping interference. |
| 1.1.11 | Browser extensions optional only | ➖ | No browser extension. |
| 1.1.12 | Web-based (not desktop-app dependent) | ✅ | Pure web. |
| 1.1.13 | Authorized product info only | ✅ | No product duplication. |
| 1.1.14 | No agency / freelancer connections | ✅ | Pure SaaS. |
| 1.1.15 | Refunds via original payment processor | ➖ | App doesn't process refunds. |
| 1.1.16 | No capital lending | ➖ | Not financial. |

### 1.2 Billing — must use Managed Pricing OR Billing API

| # | Requirement | Status | Action |
|---|---|---|---|
| 1.2.1 | Use Managed Pricing or Billing API | ⚠️ | **VERIFY**: confirm `app.billing.tsx` uses `BillingInterval` via Shopify's GraphQL `appSubscriptionCreate` or Managed Pricing. NO Stripe / direct credit-card fields anywhere. |
| 1.2.2 | Billing accepts decline + reinstall correctly | ⚠️ | Test: install → decline charge → reinstall → confirm charge requested again on reinstall. |
| 1.2.3 | Allow plan changes without contacting support / reinstall | ⚠️ | Confirm `app.billing.tsx` lets merchant upgrade + downgrade in-app. Charge history must reflect changes correctly. |

---

## SECTION 2 — Functionality

### 2.1 Reliable & user-friendly

| # | Requirement | Status | Action |
|---|---|---|---|
| 2.1.1 | No critical bugs / 4xx-5xx pages blocking review | ⚠️ | Click every admin route. Trigger every user flow. No 404 / 500 / 300 redirects to dead ends. |
| 2.1.2 | No minor bugs / display issues blocking review | ⚠️ | Polaris components rendered correctly on every page; no overflow / clipping. |
| 2.1.3 | App has UI accessible regardless of launch path | ✅ | Embedded UI with App Bridge. |
| 2.1.4 | Synchronize data accurately | ⚠️ | Verify webhook handlers (orders/create, orders/paid, refunds/create) reliably write to backend's TryOnEvent collection without dropouts. Run a test order → check it appears in `app.analytics.tsx` within seconds. |

### 2.2 APIs and platform tools

| # | Requirement | Status | Action |
|---|---|---|---|
| 2.2.1 | Use Shopify APIs | ✅ | Uses Admin API. |
| 2.2.2 | Provide consistent embedded experience | ⚠️ | Confirm all features are reachable from inside Shopify admin; nothing requires opening shopify.primestyleai.com directly. |
| 2.2.3 | **Use latest App Bridge** | ❌ | **MANDATORY since March 13, 2024**: `<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js">` must be the **first script tag** in `<head>` of every document. Audit `app/root.tsx` (RR7 root) and confirm load order. |
| 2.2.4 | **GraphQL Admin API only for new public apps** | ❌ | **MANDATORY since April 1, 2025** for new public apps. ANY REST call (`/admin/api/.../products.json`, `/admin/api/.../shop.json`, etc.) disqualifies submission. **Action**: grep `PrimeStyleAI-shopify/` and `primeStyleAI-backend/src/modules/shopify*` for `.json"` and convert to GraphQL. |
| 2.2.5 | Admin extensions feature-complete | ⚠️ | If using admin actions / blocks / link extensions: each must be novel + functional. Detect-page admin link (if added) must work. |
| 2.2.6 | No promotion / review prompts in admin extensions | ✅ | Confirm no "Rate us" / "Upgrade!" banners inside admin actions/blocks. |
| 2.2.7 | Max modal only on merchant interaction | ➖ / ⚠️ | If using max modal anywhere, ensure it only opens on click — never from nav menu. |

### 2.3 Installation

| # | Requirement | Status | Action |
|---|---|---|---|
| 2.3.1 | Install initiated from Shopify-owned surface only | ✅ | Standard OAuth via Partner Dashboard / App Store. |
| 2.3.2 | OAuth immediately on install — no UI before grant | ✅ | RR7 Shopify auth template handles this. Verify nothing renders before `authenticate.admin()` resolves. |
| 2.3.3 | Redirect to app UI after install | ✅ | RR7 `loader` redirects to `/app`. |
| 2.3.4 | OAuth required on REINSTALL | ⚠️ | Test: install → uninstall → reinstall → must hit OAuth grant page again. |

---

## SECTION 3 — Security

### 3.1 TLS/SSL

| # | Requirement | Status | Action |
|---|---|---|---|
| 3.1.1 | Valid TLS cert, no errors | ✅ | Let's Encrypt on `shopify.primestyleai.com`. Verify renewal cron is healthy on droplet. |

### 3.2 Access scopes — minimal + justified

Audit `shopify.app.toml` `[access_scopes]` block. List every scope and prepare a justification for review:

| Scope | Justification (paste during submit) |
|---|---|
| `read_products` | Need to read product titles + images to render the VTO widget on PDP. |
| `read_orders` | Track conversion attribution: which orders contained items the buyer virtually tried on. |
| `read_themes` | Required by theme app extensions framework (Shopify mandates this). |
| `write_themes` | Theme app extension auto-injects via Shopify's framework — Shopify itself requires write_themes for theme app extensions. |
| ANY OTHER | DROP IT — unused scopes get rejected. |

| # | Requirement | Status | Action |
|---|---|---|---|
| 3.2.1 | Justify `read_all_orders` | ⚠️ | If we request `read_all_orders` (older than 60 days), we must prove need. We probably DON'T need it — analytics webhooks fire on creation, not historical. **Drop this scope** unless we explicitly need historical orders. |
| 3.2.2 | `write_payment_mandate` | ➖ | Not requested. |
| 3.2.3 | `write_checkout_extensions_apis` | ➖ | Not requested. |
| 3.2.4 | `read_advanced_dom_pixel_events` | ➖ | Not requested. |
| 3.2.5 | `read_checkout_extensions_chat` | ➖ | Not requested. |

---

## SECTION 4 — App Store Listing

### 4.1 Brand consistency

| # | Requirement | Status | Action |
|---|---|---|---|
| 4.1.1 | App name consistent: TOML ↔ Dev Dashboard ↔ App Store form | ⚠️ | Cross-check `shopify.app.toml > name` and Partner Dashboard > Settings > App name and the App Submission form. All should be `PrimeStyle Virtual Try-On` (or matching variant). |
| 4.1.2 | App icon identical Dev Dashboard ↔ listing | ⚠️ | Upload SAME 1200×1200 JPEG/PNG to both. No text, no Shopify trademarks, no pricing, padding around the logo. |

### 4.2 Pricing

| # | Requirement | Status | Action |
|---|---|---|---|
| 4.2.1 | All pricing complete + accurate | ⚠️ | List every plan: free trial length, monthly $, yearly $, charge details. |
| 4.2.2 | NO pricing in icons / images | ⚠️ | Audit every screenshot + the icon — no "$X/mo" overlay. |
| 4.2.3 | Pricing only in the Pricing details section | ⚠️ | Don't put pricing in App details / introduction / feature list. |

### 4.3 Listing accuracy

| # | Requirement | Status | Action |
|---|---|---|---|
| 4.3.1 | Indicate Online Store sales channel REQUIRED | ⚠️ | Tick "Merchant must have online store" under Sales channel requirements (we depend on the storefront for VTO). |
| 4.3.2 | Languages list = languages the UI actually supports | ⚠️ | If admin UI is English only, list ONLY English. Don't claim 20+ languages just because Gemini handles them. |
| 4.3.3 | NO stats/data claims in copy ("first", "best", "only", "X% boost") | ⚠️ | Re-read every paragraph. Strip claims like "industry-leading", "highest accuracy", any %s. |
| 4.3.4 | NO stats/data claims in images | ⚠️ | Audit each screenshot caption + overlay. |
| 4.3.5 | Accurate categories + tags | ⚠️ | Pick from Shopify's catalog list. Likely: **Store design > Product images** OR **Marketing & conversion > Product page experiences**. Review the official category list before picking. |
| 4.3.6 | NO reviews/testimonials in images | ⚠️ | No "★★★★★ — Acme Co." overlays. |
| 4.3.7 | NO reviews/testimonials in copy | ⚠️ | Same applied to text. |
| 4.3.8 | Geographic / API requirements stated | ⚠️ | If feature is region-limited, declare it. |

### 4.4 Assets and descriptions

| # | Requirement | Status | Action |
|---|---|---|---|
| 4.4.1 | App card subtitle: concise, no keywords-stuffed, no PII, no data | ⚠️ | Write 1 short line communicating value — e.g. "Virtual try-on for fashion stores: shoppers see clothing on themselves before buying." |
| 4.4.2 | App details: clear functional explanation | ⚠️ | 500 chars max. Functional, not marketing. |
| 4.4.3 | NO Shopify trademarks in graphics | ⚠️ | No green Shopify bag / "S" / Sidekick purple anywhere in icon, banner, screenshots. |
| 4.4.4 | Clear, focused images — no desktop chrome / browser windows | ⚠️ | Crop browser bars out of every screenshot. Show app UI on white. |
| 4.4.5 | All images unique — no duplicates | ⚠️ | 3-6 desktop screenshots, each showing a DIFFERENT feature/state. |

### 4.5 Submission

| # | Requirement | Status | Action |
|---|---|---|---|
| 4.5.1 | If sales channel → submit as sales channel | ➖ | Not a sales channel. |
| 4.5.2 | Otherwise → submit as regular app, no sales-channel config | ✅ | Regular app. |
| 4.5.3 | **Demo screencast required** — English or English subtitles, step-by-step | ❌ | **MUST RECORD**: install flow → block-add to theme → buyer photo upload → sizing → try-on → admin sees event in analytics. |
| 4.5.4 | **Test credentials** with full feature access | ❌ | **MUST PROVIDE**: dev store URL + admin login + already installed app + a test product configured for VTO. Keep credentials live throughout review. |
| 4.5.5 | Functional credentials granting full feature access | ❌ | Above must let reviewer test EVERY feature. |
| 4.5.6 | **Emergency developer contact in Partner Dashboard** | ❌ | Set in Partner account settings → Emergency contact. Phone + email a human will respond to within 24h. |

---

## SECTION 5 — Online Store category (THIS IS US)

### 5.1 Online store

| # | Requirement | Status | Action |
|---|---|---|---|
| 5.1.1 | Use theme app extensions for theme modification | ✅ | `extensions/primestyle-tryon/` is `type = "theme"`. |
| 5.1.2 | Block displays without errors in Theme Editor + storefront | ⚠️ | Test on Dawn + multiple OS 2.0 themes. No console errors, no layout shifts. |
| 5.1.3 | **Detailed onboarding instructions + DEEP LINK** | ❌ | **MUST IMPLEMENT**: in `app._index.tsx` add a setup step that says "Add the Try-On block to your theme" with a **deep link** like:<br>`https://{shop}.myshopify.com/admin/themes/current/editor?context=apps&template=product&activateAppId={UUID}/{handle}`<br>The UUID + handle come from the deployed theme extension. Reference: shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#deep-linking |
| 5.1.4 | App Name Branding criteria | ✅ | VTO qualifies under "customers directly interact with branded elements as a key aspect of buying experience". Footer/credit MUST stay within 24×24 attribution if displayed outside the interactive widget. |
| 5.1.5 | **Send collected data back to merchant's Shopify admin** | ⚠️ | We collect try-on events on the storefront → POST to backend → must show them in `app.analytics.tsx`. Verify the analytics page actually renders: events, products, conversion. If only on `shopify.primestyleai.com` outside admin, fix. |

---

## CRITICAL: Theme App Extension performance

(From the asset-size & performance docs, not in App Store requirements but enforced via Lighthouse review.)

| Item | Threshold | Current | Status | Action |
|---|---|---|---|---|
| `assets/*.js` size (gzipped) | ≤ 10 KB suggested | ~1.4 MB | ❌ | **HIGHEST RISK**. Implement "import on interaction": ship a tiny stub (<10 KB) that lazy-imports the heavy SDK only when user clicks "Try On". |
| `assets/*.css` size (gzipped) | ≤ 100 KB suggested | TBD | ⚠️ | Check `primestyle-tryon.css`. If >100 KB, split critical-vs-deferred. |
| Lighthouse perf score impact (Home + PDP + Collection weighted) | ≤ -10 points | TBD | ⚠️ | Run Lighthouse before vs after install on a Dawn dev store. Average across 3 runs per page. Aim for -3 or better. |

**Action:** add a `tryon-loader.js` (≤ 10 KB) that's the only asset declared in the block schema. On click, it dynamically imports the full SDK from `{{ "primestyle-tryon.js" | asset_url }}`.

---

## SECTION 6 — Privacy

### Privacy Policy

| Item | Status | Action |
|---|---|---|
| Public privacy policy URL | ❌ | **MUST CREATE**. Live URL like `primestyleai.com/legal/privacy` linked from App Store listing. |
| Discloses: data collected via Shopify API | ❌ | Add: shop name, product titles, order events. |
| Discloses: data collected from buyers' device | ❌ | Add: photo upload (transient — not persisted), body measurements (anonymized, tied to ps-sdk session id), MediaPipe landmarks. |
| Discloses: how data is used | ❌ | Add: photo → Gemini try-on render (transient); measurements → size recommendation; events → merchant analytics. |
| Discloses: data retention period | ❌ | Specify: photo bytes never persisted, sizing profiles 12 months, analytics events 24 months. |
| EU/EEA disclosures | ❌ | If we process for EU buyers, list legal basis (legitimate interest + buyer consent for photo). |
| How to contact you | ❌ | Add an email + physical address (some jurisdictions require). |

### Mandatory webhooks (GDPR)

| Webhook | Status | Action |
|---|---|---|
| `customers/data_request` | ✅ | Implemented in `webhooks.customers.data_request.tsx`. Verify the response gathers everything we have on the customer (none currently — we don't store buyer customer data, so respond with "no data held"). |
| `customers/redact` | ✅ | Implemented. Confirm it deletes any buyer rows tied to the customer id. |
| `shop/redact` | ✅ | Implemented. Confirm it deletes ALL shop rows + cancels subscriptions on uninstall delay. |

### Data Protection Agreement / DPO

| Item | Status | Action |
|---|---|---|
| Have a written DPA with sub-processors (Cloudinary, Google Gemini, MongoDB Atlas) | ❌ | Sign each provider's standard DPA. Keep copies. |
| Determine if a DPO/Privacy Officer is required (GDPR / Singapore PDPA) | ⚠️ | Likely YES if we process EU buyer data. Designate someone. |
| Standard Contractual Clauses for EU → US data transfer | ❌ | Cloudinary / Google have SCCs in their DPAs. Confirm signed. |

---

## SECTION 7 — Protected Customer Data

App level audit:

| What we store about a buyer | Field | PCD Level | Action |
|---|---|---|---|
| Buyer photo for try-on | image bytes | **Level 2** if persisted; we DON'T persist (transient base64 → Gemini → discarded) | Verify backend NEVER writes photo bytes to disk / mongo / Cloudinary. Add a code comment + unit test. |
| Body measurements (chest, waist, etc.) | numeric only | Level 1 | We store in `Profile` collection. No PII fields directly. ✅ |
| `sessionId` (anonymous SDK-assigned cookie) | string | Level 1 | OK — not PII. |
| `productId` + `productTitle` viewed | string | Level 0 | Not customer data. |
| Order data via webhook (`orders/create`, `orders/paid`, `refunds/create`) | includes customer name / email / address | **Level 2** — name + email + address fields | **❌ MUST APPLY for protected customer data access** before submission. |

**Required actions:**

1. **Apply for Protected Customer Data access** in Partner Dashboard → Apps → API access requests → Protected customer data access → "Request access".
2. Select **Level 2** (because order webhooks include name, email, addresses).
3. Justify each protected field:
   - `name`: not needed → request **only the order id + line items + financial fields**, NOT name. If we don't need names, don't request them.
   - `email`: ditto — only request if used for analytics drill-down.
   - `phone`, `address`: NOT needed.
4. Update webhook handlers to NOT read `customer.email` / `customer.firstName` etc. unless approved.
5. Implement Level 1 + 2 requirements:
   - **L1.1** Process minimum data — confirm nothing extra captured ✅ if above is followed
   - **L1.2** Inform merchants what's processed — add to app onboarding + privacy policy
   - **L1.3** Limit to stated purposes ✅
   - **L1.4** Honor customer consent — if buyer rejects cookies, fall back gracefully
   - **L1.5** Honor opt-outs (CCPA "Do Not Sell")
   - **L1.6** Allow opt-out of automated decisions (sizing recommendation IS automated — add a "request manual sizing" pathway or note in privacy policy)
   - **L1.7** Make DPAs with merchants — terms of service
   - **L1.8** Retention periods documented + enforced
   - **L1.9** Encrypt data at rest + in transit ✅ (TLS, Atlas encryption-at-rest enabled)
   - **L2.1** Encrypt backups — Atlas does this; verify
   - **L2.2** Test/prod separation — confirm dev stores hit dev backend, not prod
   - **L2.3** Data loss prevention strategy — write one (one page is fine)
   - **L2.4** Limit staff access — Atlas IAM, revoke unused users
   - **L2.5** Strong staff passwords — enforced via Atlas / Google Workspace policy
   - **L2.6** Access log — enable Atlas audit logs
   - **L2.7** Security incident response policy — write one (one page)

---

## BUILT FOR SHOPIFY (optional but huge promo benefit)

After basic submission passes, target these for Built for Shopify status.

### 1. Prerequisites

| # | Requirement | Status | Action |
|---|---|---|---|
| 1.2.1 | ≥ 50 net installs from active paid-plan shops | ⚠️ | Time + marketing. |
| 1.2.2 | ≥ 5 reviews | ⚠️ | Ask satisfied merchants. |
| 1.2.3 | Minimum recent app rating | ⚠️ | Ship quality fixes; respond to bad reviews. |

### 2. Performance

| # | Requirement | Status | Action |
|---|---|---|---|
| 2.1.1 | Admin LCP ≤ 2.5s @ p75 | ⚠️ | Test admin dashboard with 100+ page loads. Use Web Vitals dashboard in Partner Dashboard. |
| 2.1.2 | Admin CLS ≤ 0.1 @ p75 | ⚠️ | Check for layout shifts on `app._index.tsx`. |
| 2.1.3 | Admin INP ≤ 200ms @ p75 | ⚠️ | Long tasks → defer. |
| 2.2.1 | Storefront Lighthouse impact ≤ -10 pts | ⚠️ | Lazy-load fix above resolves. |
| 2.3.1 | Checkout impact (carrier rates ≤ 500ms p95, ≤ 0.1% failure) | ➖ | We don't have carrier rates. |

### 3. Integration

| # | Requirement | Status | Action |
|---|---|---|---|
| 3.1.1 | Embedded with App Bridge LATEST | ❌ | See 2.2.3. |
| 3.1.2 | Primary workflows inside admin | ⚠️ | Confirm sizing analytics, product config, billing all live in embedded app. No need to leave to `shopify.primestyleai.com`. |
| 3.1.3 | Seamless sign-up via Shopify creds (no extra login) | ✅ | OAuth handles it. |
| 3.1.4 | Simplified monitoring/reporting on home page | ⚠️ | `app._index.tsx` should show: total try-ons this week, most-tried products, conversion rate. |
| 3.1.5 | Third-party connection settings inside Shopify | ➖ | No 3rd-party connections. |
| 3.2.1 | Clean uninstall via theme app extension | ✅ | Theme app extension cleans up automatically on uninstall. |
| 3.2.2 | NO Asset API edits to theme files | ✅ | Theme extension doesn't write to theme files. |

### 4. Design (4.1 Familiar / 4.2 Helpful / 4.3 User-friendly)

Manual review needed against each. Highlights to verify:

| # | Item | Action |
|---|---|---|
| 4.1.1 | UI looks like Shopify admin (Polaris) | Audit pages: cards, button styles, fonts, spacing. WCAG 2.1 AA contrast. |
| 4.1.2 | Mobile-friendly | Test admin on phone width; nothing horizontally scrolls. |
| 4.1.3 | Concise app name (no truncation in nav) | "PrimeStyle Virtual Try-On" might truncate — measure pinned width. Consider "PrimeStyle Try-On". |
| 4.1.4 | Use App Bridge `s-app-nav` for in-app navigation | Verify, not custom sidebar. |
| 4.1.5 | Use Contextual Save Bar for forms | Settings page must use CSB, not own save buttons. |
| 4.1.6 | Modals use `s-modal` with proper slots | Audit any modals. |
| 4.2.1 | Clear English, no spelling errors in headings/buttons | Proofread every copy. |
| 4.2.2 | Helpful onboarding | The `app._index.tsx` already has 4-up feature cards. Add a clear setup checklist with deep link to add block. |
| 4.2.3 | Helpful homepage with status + metrics | Show: block enabled? + recent try-on count + revenue impact. |
| 4.2.4 | Errors red, contextual, persistent | No toasts that auto-dismiss errors. |
| 4.2.5 | Primary action visually dominant | Confirm everywhere. |
| 4.2.6 | Live previews for visual customization | Settings: preview how the block looks on the storefront. |
| 4.3.1 | No false claims / promises | Same as listing. |
| 4.3.2 | No countdown timers / pressure / "5-star review for upgrade" | Audit. |
| 4.3.3 | No popovers on load / unrelated animations | None. |
| 4.3.4 | No multiple banners / paragraph dumps | Concise. |
| 4.3.5 | Don't impersonate Shopify (icon, magic-purple gradient) | Audit icon. |
| 4.3.6 | Promotional content dismissible + stays dismissed | If we have any "go pro" banner, dismiss must persist. |
| 4.3.7 | Premium features visually disabled if locked behind plan | Visually grey-out gated features. |

---

## CONCRETE PRE-SUBMISSION TODO LIST

### MUST DO (blocking submission)

1. ⬜ **Lazy-load SDK bundle** — split `primestyle-tryon.js` into a tiny stub + dynamic import on user interaction.
2. ⬜ **App Bridge latest, loaded as first script tag** in `app/root.tsx`.
3. ⬜ **GraphQL Admin API only** — grep + remove all `.json` REST calls from `PrimeStyleAI-shopify` and `primeStyleAI-backend/src/modules/shopify*`.
4. ⬜ **Privacy policy** — write + publish at `primestyleai.com/legal/privacy`.
5. ⬜ **Terms of service** — write + publish.
6. ⬜ **Apply for Protected Customer Data Level 2** in Partner Dashboard. Justify only fields actually needed.
7. ⬜ **Drop `read_all_orders`** scope from `shopify.app.toml` if not strictly needed.
8. ⬜ **Drop any unused scopes** from `shopify.app.toml`.
9. ⬜ **In-app deep-link onboarding** — `app._index.tsx` setup card → "Add Try-On block" → deep link to theme editor.
10. ⬜ **Demo screencast** — record install + use + admin analytics. Upload to Partner Dashboard.
11. ⬜ **Test credentials** — set up dev store + admin login → save in Partner Dashboard submission form.
12. ⬜ **Emergency developer contact** — set in Partner Dashboard.
13. ⬜ **App icon** — 1200×1200 PNG, no text/Shopify marks/pricing. Match Dev Dashboard ↔ listing.
14. ⬜ **Listing copy** — strip all stats / "best/first/only" / testimonials. Truthful + functional.
15. ⬜ **Tags + categories** — pick from Shopify's official list.
16. ⬜ **Pricing in Pricing details only** — nowhere else in listing.
17. ⬜ **Languages list** = languages admin UI actually supports.
18. ⬜ **GDPR webhooks tested** — fire test request → confirm 200 + correct behavior for all 3.
19. ⬜ **App reinstall flow tested** — install → uninstall → reinstall → OAuth required again.
20. ⬜ **Incognito + 3rd-party cookies blocked test** — entire flow works.
21. ⬜ **Lighthouse delta on Dawn dev store** — install our block, measure, must be ≤ -10 points (or much better with lazy-load).

### STRONGLY RECOMMENDED (avoid Built for Shopify rejection later)

22. ⬜ **Onboarding checklist** in `app._index.tsx` with progress indicator.
23. ⬜ **Analytics dashboard** showing recent try-on counts, top products, conversion attribution.
24. ⬜ **Settings page** with live preview of storefront block.
25. ⬜ **Polaris audit** — every page passes Polaris design review.
26. ⬜ **Mobile responsive test** — admin works on phone width (Shopify mobile app).
27. ⬜ **Web Vitals targets** — admin pages LCP/CLS/INP within budgets.
28. ⬜ **DPA signed** with Cloudinary, Google Cloud / Vertex, MongoDB Atlas.
29. ⬜ **Security incident response policy** + **Data loss prevention strategy** docs (1 page each).
30. ⬜ **Atlas access logs enabled**.
31. ⬜ **Sub-processor list** published on the privacy page.
32. ⬜ **Shop redact handler** confirmed deletes ALL shop data (sessions, profiles, events, etc.).

---

## RISK SUMMARY

| Risk | Severity | Mitigation |
|---|---|---|
| 1.4 MB JS bundle in theme app extension | **HIGH** — Lighthouse penalty, possible rejection | Lazy-load via `import on interaction` |
| `read_all_orders` scope unjustified | HIGH — automatic rejection if requested without proven need | Drop or justify |
| REST Admin API calls remaining anywhere | HIGH — auto-rejection for new public apps | Migrate to GraphQL |
| App Bridge not loaded first | HIGH — fails 2.2.3 | Reorder in `<head>` |
| Missing privacy policy | HIGH — auto-rejection | Publish |
| Protected customer data access not requested | HIGH — auto-rejection if we touch order webhooks with name/email | Apply Level 2 |
| Demo screencast missing | HIGH — auto-rejection | Record |
| App name branding outside interactive widget | MEDIUM | Standard 24×24 attribution where required |
| Listing copy with marketing claims / stats | MEDIUM — rejection on review | Strip claims |
| Mobile-friendliness gaps | LOW — won't block but flag for BFS | Polish later |

---

## OPEN QUESTIONS TO RESOLVE BEFORE SUBMISSION

- [ ] Confirm exact list of Shopify scopes currently in `shopify.app.toml`.
- [ ] Confirm whether ANY REST `.json` endpoints are called in `PrimeStyleAI-shopify` or backend's `shopify-admin` / `shopify` modules.
- [ ] Confirm App Bridge version + script load order in `app/root.tsx`.
- [ ] Decide: do we need `read_all_orders` (historical orders) for analytics?
- [ ] Decide: which protected customer fields do we ACTUALLY need (probably none — drop `email` / `name` from webhooks).
- [ ] Decide: app's primary tag — Store design or Marketing & conversion.
- [ ] Decide: pricing tiers + free trial length.
- [ ] Lock in icon design.

---

*Generated 2026-05-07 from a full read-through of the App Store requirements, Best Practices, Built for Shopify, Privacy, and Protected Customer Data docs. Re-verify against shopify.dev for any changes before submission.*
