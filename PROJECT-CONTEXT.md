# PrimeStyleAI Unified Project Context

Last updated: 2026-05-25
Owner workspace: `/home/ara6i/Projects`
Local Mac workspace: `/Users/arashsn/Projects/PrimeStyleAI`

This file merges the key Claude memory/docs for SDK, backend, Shopify app, droplet deployment, and production URLs.

## 1) Core Repos and Roles

- `prime-products` (`/home/ara6i/Projects/prime-products`)
  - Local Mac path: `/Users/arashsn/Projects/PrimeStyleAI/prime-products`
  - Next.js app (customer-facing site at `https://primestyleai.com`)
  - PM2 process: `prime-products`
- `primeStyleAI-backend` (`/home/ara6i/Projects/primeStyleAI-backend`)
  - Local Mac path: `/Users/arashsn/Projects/PrimeStyleAI/primeStyleAI-backend`
  - Express 5 + MongoDB monolith backend (live proxy at `https://api.primestyleai.com`)
  - PM2 process: `primestyle-backend`
- `PrimeStyleAI-shopify` (`/home/ara6i/Projects/PrimeStyleAI-shopify`)
  - Local Mac path: `/Users/arashsn/Projects/PrimeStyleAI/PrimeStyleAI-shopify`
  - Shopify embedded admin app + theme app extension
  - Live URL: `https://shopify.primestyleai.com`
  - PM2 process: `primestyle-shopify`
- `primestyleai-tryon-sdk` (`/home/ara6i/Projects/primestyleai-tryon-sdk`)
  - Local Mac path: `/Users/arashsn/Projects/PrimeStyleAI/primestyleai-tryon-sdk`
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

Live note (verified on 2026-05-25):
- `backend.primestyleai.com` did not resolve publicly at verification time.
- `api.primestyleai.com/health` responded `HTTP 200`.

## 3) Source of Truth and Deploy Workflow

Current branch policy (set 2026-05-25):
- `staging` is the normal local development and test-server branch.
- Test frontend deploys from `origin/staging` to `/var/www/test-fe-9a7k.primestyleai.com`.
- Test backend deploys from `origin/staging` to `/var/www/test-be-9a7k.primestyleai.com`.
- Production frontend deploys from `origin/main` to `/var/www/prime-products`.
- Production backend currently runs the same code tree as backend `origin/staging`, but keeps production env/database.
- Do not push directly to `main` unless the owner explicitly asks for direct main push.
- For production promotion, create/show a PR or equivalent staging-to-main diff first, get explicit approval, then merge/deploy production.
- After production promotion, return local frontend checkout to `staging` for future development.

Important test-login note:
- The test frontend password gate is nginx `auth_basic` on `test-fe-9a7k.primestyleai.com`.
- It is not app source code and should not be copied into production nginx.
- Production `primestyleai.com` must not return a `WWW-Authenticate` header.

Current frontend state (verified 2026-05-25):
- `prime-products` `main` and `staging` have identical file trees.
- `main` commit: `54076f5` (`Update frontend to SDK 5.10.176`).
- `staging` commit: `c923d17` (`Update frontend to SDK 5.10.176`).
- Both depend on exact npm package `@primestyleai/tryon` version `5.10.176`.
- Production and test frontend servers both have installed SDK `5.10.176`.

Current backend state (verified 2026-05-25):
- Production backend and test backend code are intentionally identical at commit `63ac297` (`Fix test VTO worker image fetches`).
- Production backend path: `/var/www/backend.primestyleai.com`.
- Test backend path: `/var/www/test-be-9a7k.primestyleai.com`.
- Production backend keeps production `.env` and real MongoDB database `primestyleai`.
- Test backend keeps test `.env` and MongoDB database `primestyleai_test`.
- Never copy test `.env` into production.

### 3.1) Manual Deploy Flow (Droplet + PM2)

Basic manual flow:
1. `ssh root@167.99.252.27`
2. `pm2 list`
3. `cd <service-directory>`
4. `git fetch origin`
5. Reset only to the approved branch:
   - Test frontend: `git reset --hard origin/staging`
   - Production frontend: `git reset --hard origin/main`
   - Test backend: `git reset --hard origin/staging`
   - Production backend: only after explicit approval, preserving production `.env`
6. `git clean -fd -e .env -e .env.local` when an exact repo tree is needed but env files must be preserved
7. `npm install`
8. `npm run build` (if needed)
9. `pm2 restart <app-name> --update-env`

Do not use `git pull` blindly on production if the repo is dirty or the branch target is unclear.

Known command example for `prime-products` production after approval:

```bash
ssh root@167.99.252.27 'cd /var/www/prime-products && git fetch origin && git reset --hard origin/main && git clean -fd -e .env -e .env.local && npm install && npm run build && pm2 restart prime-products --update-env'
```

Known command example for `prime-products` test:

```bash
ssh root@167.99.252.27 'cd /var/www/test-fe-9a7k.primestyleai.com && git fetch origin && git reset --hard origin/staging && git clean -fd -e .env -e .env.local && npm install && npm run build && pm2 restart prime-products-test --update-env'
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

Version state as of 2026-05-25:
- SDK repo `main` and GitHub are synced at `5.10.176`, commit `8d8ba04`.
- npm registry `latest` is `@primestyleai/tryon@5.10.176`.
- `prime-products` `main` and `staging` depend on exact npm version `5.10.176`.
- Test and production frontend servers both have installed SDK `5.10.176`.
- `5.10.176` removes the mobile multi-section fit percentage badge (`% FIT MATCH`) from the SDK result screen.
- npm publish requires a granular npm token with package write access and bypass-2FA enabled; never store npm tokens in the repo or server env unless explicitly configuring CI.
- Local `.tgz` installs are acceptable only for temporary SDK iteration. Before committing or deploying `prime-products`, dependency should be switched back to the published npm package version.

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

SDK local iteration:
- Preferred committed/deployed dependency is the published npm version, currently exact `@primestyleai/tryon@5.10.176`.
- Temporary local SDK iteration can use `npm pack` + `npm install <tgz> --no-save` into `prime-products`.
- Before committing or deploying `prime-products`, replace any `file:../primestyleai-tryon-sdk/*.tgz` dependency with the published npm package version.
- Avoid `npm link` due to Turbopack resolution issues with exports/symlink path.

Mac local run snapshot (verified 2026-05-23):
- `prime-products` runs with `npm run dev` at `http://localhost:3000`.
- `primeStyleAI-backend` runs with `npm run dev` at `http://localhost:4000`; health is `http://localhost:4000/api/health`.
- Local frontend env used for local backend wiring:
  - `NEXT_PUBLIC_API_URL=http://localhost:4000`
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
  - `NEXT_PUBLIC_PRIMESTYLE_API_URL=http://localhost:4000`
- Local backend env used when no `.env` exists:
  - `PORT=4000`
  - `MONGO_URI=mongodb://127.0.0.1:27017/primestyleai`
  - `CORS_ORIGIN=http://localhost:3000`
  - `FRONTEND_URL=http://localhost:3000`
- Homebrew is installed at `/opt/homebrew/bin/brew`; `/Users/arashsn/.zprofile` and `/Users/arashsn/.zshrc` load `eval "$(/opt/homebrew/bin/brew shellenv zsh)"` for zsh login and interactive shells, and `/Users/arashsn/.zshenv` prepends `/opt/homebrew/bin` as a fallback for all zsh shells. Docker and system `mongod` were not installed at local verification time. MongoDB Community 8.0.4 was downloaded as the official macOS ARM64 `.tgz` and extracted to `/Users/arashsn/Projects/PrimeStyleAI/.local/mongodb`; its data/log directories are `/Users/arashsn/Projects/PrimeStyleAI/.local/mongodb-data` and `/Users/arashsn/Projects/PrimeStyleAI/.local/mongodb-log`.
- Codex CLI is installed via Homebrew cask `codex` at `/opt/homebrew/bin/codex` (`codex-cli 0.133.0`). Homebrew also installed `ripgrep` at `/opt/homebrew/bin/rg` (`ripgrep 15.1.0`).

Local branch guardrail:
- Keep the local `prime-products` checkout on `staging` for ongoing work unless explicitly preparing/reviewing a production PR.
- Do not leave the local frontend workspace on `main` after production deployment work.
- For SDK changes, publish a new npm version first, then update `prime-products` `staging`; promote to `main` only after owner approval.

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

# SDK registry version
npm view @primestyleai/tryon version dist-tags --json

# Verify production has no nginx basic-auth and test still has it
curl -sS -I https://primestyleai.com | grep -i '^WWW-Authenticate' || true
curl -sS -I https://test-fe-9a7k.primestyleai.com/demo/products | grep -i '^WWW-Authenticate' || true
```

## 10) Live Droplet Server Inventory (SSH Verified 2026-05-25)

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
- `primestyle-test-lab-worker` -> cwd `/var/www/test-be-9a7k.primestyleai.com`, script `dist/workers/test-lab-sdk-mirror.worker.js`

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
- `test-fe-9a7k.primestyleai.com` has nginx `auth_basic` enabled; production `primestyleai.com` does not.

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
