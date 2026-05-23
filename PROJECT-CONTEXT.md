# PrimeStyleAI Unified Project Context

Last updated: 2026-05-22
Owner workspace: `/home/ara6i/Projects`

This file merges the key Claude memory/docs for SDK, backend, Shopify app, droplet deployment, and production URLs.

## 1) Core Repos and Roles

- `prime-products` (`/home/ara6i/Projects/prime-products`)
  - Next.js app (customer-facing site at `https://primestyleai.com`)
  - PM2 process: `prime-products`
- `primeStyleAI-backend` (`/home/ara6i/Projects/primeStyleAI-backend`)
  - Express 5 + MongoDB monolith backend (live proxy at `https://api.primestyleai.com`)
  - PM2 process: `primestyle-backend`
- `PrimeStyleAI-shopify` (`/home/ara6i/Projects/PrimeStyleAI-shopify`)
  - Shopify embedded admin app + theme app extension
  - Live URL: `https://shopify.primestyleai.com`
  - PM2 process: `primestyle-shopify`
- `primestyleai-tryon-sdk` (`/home/ara6i/Projects/primestyleai-tryon-sdk`)
  - Source for `@primestyleai/tryon` npm package

## 2) Production and Infrastructure

- Droplet host: `167.99.252.27`
- SSH user: `root`
- Access: SSH key auth configured

Main domains:
- `https://primestyleai.com` -> `prime-products` (nginx -> `localhost:3001`)
- `https://api.primestyleai.com` -> backend API (`localhost:4000`)
- `https://shopify.primestyleai.com` -> Shopify app

Important: do not confuse repo name `prime-products` with production domain (`primestyleai.com`).

Live note (verified on 2026-05-13):
- `backend.primestyleai.com` did not resolve publicly at verification time.
- `api.primestyleai.com/health` responded `HTTP 200`.

## 3) Standard Deploy Flow (Droplet + PM2)

Basic manual flow:
1. `ssh root@167.99.252.27`
2. `pm2 list`
3. `cd <service-directory>`
4. `git pull`
5. `npm install`
6. `npm run build` (if needed)
7. `pm2 restart <app-name>`

Known command example for `prime-products`:

```bash
ssh root@167.99.252.27 'cd /var/www/prime-products && git pull && npm install && npm run build && pm2 restart prime-products'
```

## 4) Backend Architecture (`primeStyleAI-backend`)

Stack:
- Express 5
- MongoDB + Mongoose
- Socket.IO + SSE + cron in same Node process
- Resend used for email

Architecture direction (enforced for new work):
- Module-per-feature under `src/modules/<feature>/`
- Layering: Route -> Controller -> Service -> Model
- Validation with zod middleware
- Routes mounted via `src/routes/index.ts` under `/api/*`
- Prefer `.lean()` for reads
- Explicit model indexes
- Atomic updates for counters
- Controller try/catch with structured error response
- No `any` in new code

Auth middlewares include:
- `requireAuth`, `requireAdmin`, `requireAdminOrSession`, `requireAdminToken`, `requireDeveloperAuth`, `apiKeyAuth`

Notable module set includes:
- `shopify`, `shopify-admin`, `developer` (`/v1/*` public SDK API), `sizing`, `vto`, `contact`, `health`, and others.

Special raw-body webhook handling:
- `/api/webhooks/paddle`
- `/api/webhooks/lemonsqueezy`

Assets:
- `/assets/body-shapes/*.png` served cross-origin for SDK storefront consumption.

## 5) Shopify App Architecture (`PrimeStyleAI-shopify`)

This is the listed Shopify app: "PrimeStyle Virtual Try-On".

Key parts:
- Embedded admin app: React Router 7 + Polaris
- Theme extension at `extensions/primestyle-tryon/`
- App proxy path on merchant storefront: `/apps/primestyle/*` -> `https://shopify.primestyleai.com/api/proxy/*`

SDK shipping mechanism:
- `scripts/sync-sdk.mjs` copies SDK JS/CSS from `node_modules/@primestyleai/tryon` into extension assets before dev/build/deploy.

Operational note:
- Tier 3 analytics webhooks go directly to backend (current live host appears to be `api.primestyleai.com`; older docs mention `backend.primestyleai.com`), not through Shopify app routes.

## 6) SDK Architecture (`@primestyleai/tryon`)

Repo:
- `/home/ara6i/Projects/primestyleai-tryon-sdk`

Version state as of 2026-05-22:
- SDK repo local/staging version is `5.10.174` at commit `46384e4`.
- npm registry `latest` is still `5.10.173` because publishing `5.10.174` was blocked by npm 2FA.
- `prime-products` currently depends on `@primestyleai/tryon` as `^5.10.173`.

Primary flow:
- Parallel sizing + try-on for apparel path
- `POST /api/v1/sizing/recommend`
- `POST /api/v1/tryon`
- First try-on can run before sizing fit context returns
- Retry/regenerate path uses original user photo bytes

Face/head products route separately:
- `POST /api/v1/sizing/face-recommend`

Other endpoints:
- `POST /api/v1/sizing/estimate`
- `POST /api/v1/sizing/sizeguide`
- `GET /api/v1/tryon/status/:jobId`
- `GET /api/v1/tryon/stream?key=...`

Local cache behavior:
- Per-product recommendation cache in localStorage can mask backend changes.
- For backend sizing verification, clear `primestyle_profiles` or switch profile.

### 6.1) Current SDK Product-Type Context: Shoes and Accessories

This is important for future SDK, Shopify, backend, and test-lab work: shoes and accessories are not just apparel with different copy. The SDK now classifies them into separate measurement and VTO paths.

Classification:
- Product type detection lives in `src/react/utils/product-fit.ts`.
- Accepted fit types include `apparel`, `shoe`, `bag`, `hat`, `sunglasses`, `necklace`, `bracelet`, `ring`, `belt`, `watch`, `accessory`, and `unknown`.
- Detection uses explicit `productFitType` first, then falls back to `productCategory`, `productSubcategory`, `productType`, tags, title, and description keywords.

Measurement routing:
- `shoe` maps to measurement type `foot`.
- `hat` maps to measurement type `head`.
- `sunglasses` maps to measurement type `face`.
- Bags, belts, jewelry, watches, and generic accessories map to `body-basic`.
- Apparel and unknown products map to the normal `body` flow.

VTO category routing:
- `foot` sends `/tryon` category `shoe`.
- `face` sends `/tryon` category `sunglasses`.
- `head` sends `/tryon` category `hat`.
- `body-basic` sends the matching accessory category when known (`bag`, `belt`, `necklace`, `bracelet`, `ring`, `watch`, `accessory`).
- Normal apparel sends category `apparel`.

Sizing routes:
- Apparel and shoe sizing still use `/api/v1/sizing/recommend`.
- Eyewear and headwear use the isolated `/api/v1/sizing/face-recommend` route.
- Shoe charts use foot length in centimeters as the stable measurement anchor, regardless of the shopper locale.
- Eyewear uses millimeters by default.
- Headwear uses centimeters by default.

Shoe UX and sizing behavior:
- Shoe mode uses a brand-and-size reference flow instead of asking the shopper to manually measure their foot first.
- Current brand reference list includes Nike, Adidas, New Balance, Puma, Reebok, Converse, Vans, ASICS, Jordan, and Skechers.
- The SDK converts the selected familiar shoe brand/size into `footLengthCm` plus US/UK/EU helper values.
- Shoe result UI shows only the relevant shopper-facing scale, e.g. `M 9.5` or `W 11`, instead of confusing combined labels.
- Shoe result detail filters the measurement table down to foot length and hides apparel match-percentage semantics.
- Shoe try-on is allowed when sizing succeeds, and the backend receives the `shoe` VTO category prompt.

Accessory UX and sizing behavior:
- One-size/accessory products can return `guideOnly` or `oneSize`.
- `guideOnly` means there is no meaningful recommended size; the SDK should show the product size guide details and still allow visual try-on.
- Mobile accessory result cards must keep a visible footer CTA, otherwise hats/sunglasses/accessories can get stuck with no path to VTO.
- Face/head accessories use adapted photo guidance: eyewear asks for a clear front-facing face photo with no glasses; headwear asks for a head-and-shoulders photo with space above the head.

Try-on prompt context:
- `TryOnContext` forwards product title, type, tags, description, material, and silhouette context to the backend.
- `editFromPrevious` exists so regeneration can preserve accessories already painted by a previous try-on result, such as socks, ties, pocket squares, cufflinks, and shoes.
- Fit info is body-frame specific and should only be built for apparel. Accessories skip fit-info even if some sizing details exist.

Important guardrail:
- Do not collapse shoe/accessory handling back into the apparel path when changing test lab, SDK, Shopify, or backend code.
- The test lab must mirror these category routes if it claims to mirror the real SDK journey.

## 7) Local Development Workflow Notes

Documented local workflow in `LOCAL-DEV.md`:
- Local SDK iteration via `npm pack` + `npm install <tgz> --no-save` into `prime-products`
- Avoid `npm link` due to Turbopack resolution issues with exports/symlink path

Important status caveat:
- One memory doc says SDK distribution is fully npm-only and tgz override flow is no longer standard.
- Another doc (`LOCAL-DEV.md`) documents active tgz local override workflow.
- Treat this as environment-dependent; verify current desired mode before changing dependency flow.

## 8) Backend Operations Snapshot (Droplet Diagnostic Context)

From prior backend diagnostics (`node diagnose-connections.js` on droplet):
- MongoDB connected and healthy
- Pool shown at 30/100 with low active usage
- Moderate possible connection leak warning was flagged (excess total connections vs expected active/SSE mix)

If repeated:
1. Check SSE connection lifecycle in frontend and backend.
2. Monitor PM2 logs for pool events.
3. Validate atlas connection trend (steady vs continuously rising).

## 9) Quick Verify Commands

```bash
# Droplet processes
ssh root@167.99.252.27 'pm2 list'

# Prime products live health quick check
curl -I https://primestyleai.com

# Backend health quick check
curl -I https://api.primestyleai.com/health
```

## 10) Live Droplet Server Inventory (SSH Verified 2026-05-13)

Verification command baseline:
- `ssh root@167.99.252.27`
- Hostname returned: `PrimeStyleAI`

PM2 processes online:
- `myaifitting-frontend` -> cwd `/var/www/myaifitting-frontend`, npm start
- `prime-preview` -> cwd `/var/www/preview.myaifitting.com`, npm start
- `prime-products` -> cwd `/var/www/prime-products`, npm start
- `prime-products-test` -> cwd `/var/www/test-fe-9a7k.primestyleai.com`, npm start `-- -p 3004`
- `primestyle-backend` -> cwd `/var/www/backend.primestyleai.com`, script `dist/server.js` (cluster)
- `primestyle-backend-test` -> cwd `/var/www/test-be-9a7k.primestyleai.com`, script `dist/server.js`
- `primestyle-shopify` -> cwd `/var/www/shopify.primestyleai.com`, React Router serve CLI

Listening ports (from `ss -tulpn`):
- `80`, `443` (nginx)
- `22` (SSH)
- `3000` (`myaifitting-frontend`)
- `3001` (`prime-products`)
- `3002` (`primestyle-shopify`)
- `3003` (`prime-preview`)
- `3004` (`prime-products-test`)
- `4000` (`primestyle-backend`)
- `4001` (`primestyle-backend-test`)

Nginx routing snapshots:
- `primestyleai.com` -> `localhost:3001`
- `shopify.primestyleai.com` -> `127.0.0.1:3002`
- `api.primestyleai.com` -> backend endpoints on `127.0.0.1:4000`
- `test-fe-9a7k.primestyleai.com` -> `localhost:3004` and `/api/*` -> `127.0.0.1:4001`
- `test-be-9a7k.primestyleai.com` -> backend endpoints on `127.0.0.1:4001`

`/var/www` directories currently include:
- `backend.primestyleai.com`
- `myaifitting-frontend`
- `preview.myaifitting.com`
- `prime-products`
- `shopify.primestyleai.com`
- `test-be-9a7k.primestyleai.com`
- `test-fe-9a7k.primestyleai.com`

## 11) Source Files Merged Into This Context

- `/home/ara6i/.claude/projects/-home-ara6i-Projects-PrimeStyleAI-shopify/memory/project_deployment.md`
- `/home/ara6i/Projects/LOCAL-DEV.md`
- `/home/ara6i/Projects/primeStyleAI-backend/metrics/node-run-myaifitting-droplet.md`
- `/home/ara6i/.claude/projects/-home-ara6i-Projects-prime-products/memory/project_backend_architecture.md`
- `/home/ara6i/.claude/projects/-home-ara6i-Projects-prime-products/memory/project_shopify_app.md`
- `/home/ara6i/.claude/projects/-home-ara6i-Projects-prime-products/memory/project_production_urls.md`
- `/home/ara6i/.claude/projects/-home-ara6i-Projects-prime-products/memory/project_sdk_architecture.md`
