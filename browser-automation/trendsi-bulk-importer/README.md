# PrimeStyleAI Trendsi 4-Worker Importer

Local Chrome extension that uses the signed-in Trendsi session and submits products to `PrimeStyleAI` as Shopify **Drafts**. It consumes no Codex or OpenAI tokens while running.

## Worker layout

V5 launches four independent tabs:

- 2 Women workers
- 2 Men workers

Each catalog is split into two disjoint page sequences. Workers process odd and even pages independently.

Women and Men default to page **1**, so their workers begin at pages **1 and 2**, then advance by two.

Every catalog URL forces the Trendsi inventory filter to **More than 50**. Pet, Kids, Home, and Beauty are not included. The Jewelry worker targets only the **Fashion Jewelry** subcategory, not the surrounding Beauty category.

## Install or upgrade in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. If the extension is already loaded, click its **Reload** button.
4. Otherwise click **Load unpacked** and select:

   `/Users/arashsn/Projects/PrimeStyleAI/prime-products/browser-automation/trendsi-bulk-importer`

5. Sign into Trendsi in the same Chrome profile.
6. Open `https://www.trendsi.com/collections`.

The coordinator panel appears in the lower-right corner.

## Start the four workers

1. Confirm **Women start page** is `1` for a complete catalog rescan.
2. Keep the default worker delay at `7000` ms.
3. Click **Create 4 workers**.
4. Chrome opens four background tabs. Actions are staggered by three seconds so workers do not submit simultaneously.
5. Keep Chrome open and the Trendsi account signed in.

Click any worker row in the coordinator to focus its tab. **Pause all** stops workers after their current browser action. **Resume all** reopens any missing worker tabs and restarts them with a small stagger.

Use **Rescan 4 workers** to revisit all pages. Existing Shopify-icon products are deselected, so the rescan submits only missing products.

## How progress is isolated

- Each worker has its own `chrome.storage.local` record.
- Each worker owns one odd/even page sequence, so two workers never intentionally process the same catalog page.
- Before submission, every card showing Trendsi's Shopify icon is deselected. A page that is already fully in Shopify is skipped automatically.
- The worker identity is stored in both its URL and `window.name`, allowing recovery after a redirect.
- Each accepted page records its Trendsi product IDs, selected count, and submission time.
- A global throttle record makes all workers back off together when Trendsi reports a rate, SKU, or daily limit.
- Selection failures retry after 5/10/20/40 seconds. Other transient errors use exponential backoff.

## Important limitations

- “Accepted” means Trendsi displayed **Adding To Store**. It is not proof that Shopify created every selected product.
- Trendsi can skip already-added, duplicate, changed, or unavailable products.
- Four tabs still put pressure on Trendsi and Shopify. V5 staggers launches and shares rate-limit backoff, but it cannot bypass a true account restriction or Shopify resource limit.
- Catalog contents can move while imports run. Reconcile supplier product IDs and variant SKUs in Shopify before enrichment.
- Never load a second copy of the extension in the same Chrome profile.
- Products remain Draft until the size-chart gate and enrichment pipeline admit them to the AI Stylist catalog.
