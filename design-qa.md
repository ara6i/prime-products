# PDP Studio Home Design QA

## Evidence

- PhotoRoom reference: `/Users/arashsn/Downloads/Screenshot - 2026-07-25T161947.658.png`
- Final desktop: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-photoroom-final-2026-07-25.png`
- Final source comparison: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-photoroom-final-comparison-2026-07-25.png`
- Final mobile: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-photoroom-mobile-final-2026-07-25.png`
- Signed-in carousel and no-footer proof: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-carousel-no-footer-2026-07-25.png`
- Live PhotoRoom tool captures: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/photoroom-live-capture-2026-07-25`
- Final local tool modal: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-qa-2026-07-25/local-product-staging-final.png`
- Tool modal comparison: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-qa-2026-07-25/product-staging-comparison.png`
- Desktop viewport: `1663 x 827`
- Mobile viewport: `390 x 844`
- The signed-out auth gate and Next.js developer portal were removed only from QA captures. Source auth behavior was not changed.

## Source parity

- Sidebar, top bar, banner, quick-tool rows, section rhythm, horizontal workflow rail, partial fourth card, and first preset row match the PhotoRoom desktop geometry.
- Typography is now compact and medium-weight instead of bold-heavy.
- Sidebar navigation uses dedicated regular-weight Phosphor icons and matches the source grouping and order.
- PrimeStyleAI's white/cobalt palette replaces PhotoRoom's dark palette without changing the composition.

## Asset quality

- All four active workflow photographs were generated through the user's signed-in ChatGPT image session, then exported and inspected at `1672 x 941`.
- Background removal: forest-green suede sneakers on a subtle checkerboard.
- AI backgrounds: black embroidered handbag in a warm natural interior.
- Batch: one olive cap shown in six consistent catalog views.
- Retouch: neutral skincare still life with credible packaging and natural light.
- No people, blue product set, text, logo, watermark, low-resolution image, or unrelated visual remains.
- The upgrade banner no longer crops the wide workflow-card images into tiny circles. It now uses dedicated `1254 x 1254` product photographs at high rendering quality.
- The generic Classics, Studio, and Essentials swatches were replaced with 12 outcome-led presets across Sell-ready, Studio scenes, and Lifestyle scenes.
- All 12 preset thumbnails were generated through the user's signed-in ChatGPT image session and visually inspected together for subject consistency, scene relevance, sharpness, malformed geometry, text, logos, and watermarks.
- Product Staging, Product Beautifier, and Flat Lay use dedicated before/after illustrations generated through the user's signed-in ChatGPT session.
- Ghost Mannequin now uses a separate `1200 x 800` hanger-to-invisible-mannequin comparison with the same ivory blazer, neutral styling, and no people, text, logos, or watermarks.

## Interaction and responsiveness

- Command search opens and closes correctly.
- Upgrade banner dismisses correctly and returns on reload.
- Get started is a horizontal snap carousel with working previous and next controls.
- Next moved the carousel from `scrollLeft: 0` to `scrollLeft: 380`; Previous returned it to `0`.
- Start from a photo and Background Remover open the PhotoRoom-matched image library with working tabs and local image selection state.
- Product Staging, Ghost Mannequin, Product Beautifier, and Flat Lay open the shared PhotoRoom-matched AI tool modal.
- Tool switching, quality, output size, brand style, prompt input, upload readiness, and disabled/enabled generation states are implemented through shared typed state.
- PDP Studio renders no `<footer>` element.
- At `390 x 844`, PDP Studio matches PhotoRoom's small-window guard instead of rendering a clipped editor.
- `/pdp-studio/clothing-photoshoot` was not modified.

## Verification

- TypeScript: passed
- Scoped ESLint: passed; CSS is not covered by the ESLint configuration
- `git diff --check`: passed
- Previous desktop source comparison: passed
- Previous mobile visual check: passed
- Latest preset and banner asset inspection: passed
- Latest signed-in rendered-page capture: passed
- Carousel interaction check: passed
- Tool modal live-source comparison: passed
- Image library, Shopify tab, tool switcher, quality, size, and brand-style interaction checks: passed
- Generated tool asset inspection: passed
- Footer removal check: passed

## AI Tools and See all QA

### Evidence

- Source page: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/photoroom-ai-tools-1102x773-final.png`
- Local page: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/local-ai-tools-1102x773-final.png`
- Same-input page comparison: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/ai-tools-compact-side-by-side-final.png`
- Source chooser: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/photoroom-see-all-1102x773-final.png`
- Local chooser: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/local-see-all-1102x773-final.png`
- Same-input chooser comparison: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/see-all-compact-side-by-side-final.png`
- Corrected Ghost Mannequin dialog: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/local-ghost-mannequin-dialog-final-v2.png`
- Viewport: `1102 x 773`
- State: signed-in PhotoRoom AI Tools reference versus local signed-in PDP Studio.

### Comparison result

- Sidebar width, navigation grouping, title position, three-column 80px tool cards, section spacing, and card typography match the reference geometry.
- PrimeStyleAI's white/cobalt palette replaces the source dark palette without changing the layout.
- Shopify Products uses the recognizable Shopify bag glyph instead of the generic storefront icon.
- AI Fashion Models and Ghost Mannequin use distinct, relevant assets generated through the signed-in ChatGPT browser session.
- See all opens the same full-width, four-column chooser interaction and Home See all tools navigates to AI Tools.
- No browser console errors were found.
- `/pdp-studio/clothing-photoshoot` was not modified.

### Fix history

- Replaced the oversized descriptive cards and filter panel with compact source-matched tool cards.
- Removed the duplicate AI Tools heading and route-inappropriate template search.
- Fixed the chooser's initial narrow-dialog breakpoint and sidebar z-index overlap.
- Replaced the cached two-ghost illustration with a new filename and verified the corrected hanger-to-ghost image in the rendered dialog.
- Removed unrelated blue AI artwork from tool cards and kept icon fallbacks where no relevant product image exists.

## AI Tools launcher parity correction

### Evidence

- Source visual truth: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/home-ghost-dialog-parity-target.png`
- Implementation screenshot: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/ai-tools-ghost-dialog-parity-implementation.png`
- Same-input comparison: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-ai-tools-qa-2026-07-25/home-vs-ai-tools-ghost-dialog-parity.png`
- Viewport and screenshot dimensions: `1269 x 714` CSS pixels and `1269 x 714` image pixels at density `1`.
- State: Ghost Mannequin opened from Home versus Ghost Mannequin opened from AI Tools.
- Focused comparison was not needed because the dominant dialog, controls, copy, asset, and surrounding overlay are all readable in the same-input comparison.

### Findings and history

- Earlier P1: overlapping AI Tools entries navigated to older generic tool routes instead of opening the current Home dialogs.
- Fix: added one shared inline-tool launcher definition, one shared dialog host, and button activation support for direct cards and the See all chooser.
- Post-fix evidence: Home and AI Tools render the same Ghost Mannequin dialog with matching typography, spacing, colors, image quality, controls, copy, and overlay.
- Direct interaction checks passed for Ghost Mannequin, Product Staging, Product Beautifier, Flat Lay, and Background Remover.
- See all chooser to Ghost Mannequin passed without changing the AI Tools route.
- Home launch behavior still passed after the shared-component refactor.
- Browser console errors: none.
- TypeScript and scoped ESLint: passed.
- No actionable P0, P1, or P2 differences remain.

## AI Tools full-catalog and sidebar refresh

### Current evidence

- Live PhotoRoom AI Tools source: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-qa-2026-07-25/source-ai-tools-top-desktop.png`
- Live PhotoRoom tool dialog: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-qa-2026-07-25/source-video-generator-state.png`
- Live PhotoRoom tool switcher: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-qa-2026-07-25/source-switch-ai-tool-dialog.png`
- Generated source sheets: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-qa-2026-07-25/generated-tool-sheet-1.png`, `generated-tool-sheet-2.png`, and `generated-tool-sheet-3.png`
- Final 27-asset inspection sheet: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-qa-2026-07-25/final-ai-tool-assets-contact-sheet.png`
- Current local layout and asset capture: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-qa-2026-07-25/local-ai-tools-auth-blocked.png`
- Upgrade banner source: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-qa-2026-07-25/generated-upgrade-banner.png`

### Result

- All 26 catalog tools have a dedicated high-resolution WebP thumbnail; Batch has a separate matching asset.
- The three generated source sheets and the final cropped contact sheet were visually checked for relevance, edge quality, malformed product geometry, readable accidental text, logos, watermarks, and inconsistent styling.
- The AI Tools page retains the PhotoRoom information architecture: recently used, Create images with AI, All tools, compact three-column cards, image thumbnails on the right, and a source-matched See all chooser.
- Every tool except AI Fashion Models opens the shared current tool surface. AI Fashion Models remains the only direct link to `/pdp-studio/clothing-photoshoot`.
- Sidebar grouping and behavior match the captured source: Home, AI Tools, Batch, Activity, collapsible Content, Shopify Products, Designs, Brand Kit, Templates, then Usage, Visual Agents & API, Preferences, Upgrade, and floating Help.
- The upgrade banner now uses a dedicated `2167 x 725` product still life generated through the signed-in ChatGPT browser session, replacing the small circular crops.
- Current authenticated interaction recapture was blocked by the expired local PDP Studio session. The current signed-out capture still verifies the complete layout and final assets behind the auth gate; the prior signed-in interaction captures above cover the same shared chooser, tool-dialog, sidebar, and overlay components.
- TypeScript, scoped ESLint, production build, and `git diff --check` passed.
- Catalog contract check passed: `26` tools, `0` missing assets, `0` incorrect inline launchers, and AI Fashion Models still points to the untouched clothing-photoshoot route.

## Full sidebar destination parity follow-up

### Current evidence

- Live PhotoRoom Batch: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-shell-qa-2026-07-25/source-batch-current.png`
- Live PhotoRoom destination captures: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-shell-qa-2026-07-25/source-activity.png`, `source-usage.png`, `source-visual-agents-api.png`, `source-preferences.png`, `source-upgrade.png`, `source-shopify-products-loaded.png`, `source-designs.png`, `source-brand-kit.png`, and `source-templates.png`
- Generated Batch illustration: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/public/images/pdp-studio/batch-upload.webp`
- Local auth-blocked render: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-studio-shell-qa-2026-07-25/local-batch-auth-blocked-final.jpg`

### Implemented

- Workspace switcher now uses the source-style anchored menu with the current Space, Create a Space, Manage Space, mobile login, Profile, and Sign out entries.
- Batch now matches the source structure: upgrade banner, large dashed import surface, dedicated three-angle product asset, working local image selection, and horizontal Essentials and Studio preset rows.
- Activity, Usage, Visual Agents and API, Preferences, Upgrade, and Help now reproduce the captured source content and overlay geometry in PrimeStyleAI's white/cobalt theme.
- Shopify Products, Designs, Templates, and Brand Kit now reproduce the source information architecture and empty states.
- Preferences is an overlay action from the sidebar, matching the source behavior, while the existing direct route remains available.
- `/pdp-studio/clothing-photoshoot` was not modified.
- No backend code or environment file was changed.
- No Google or Omni video generation was used because the captured PhotoRoom Batch and sidebar destinations contain no video.

### Verification

- Scoped ESLint: passed
- TypeScript: passed
- Production build: passed
- Generated Batch asset inspection: passed
- Current authenticated interaction and same-state screenshot comparison: blocked by the expired local PDP Studio session and mandatory auth gate

## Activity and Preferences parity correction

- Activity was removed from the sidebar, navigation catalog, overlay types, icon map, and workspace sheets per the latest direction.
- Preferences now uses the captured near-full-window modal geometry with a `17.5rem` settings rail and independently scrolling content.
- The shared dialog's responsive `sm:max-w-[26.667vw]` constraint is explicitly overridden, and the Preferences content/overlay use z-indexes `601`/`600` so the modal cannot render beneath the PDP Studio header.
- Preferences Settings now reproduces the vertical export-format radio group, file-name toggle, Editing section, automatic-regeneration toggle, Content control section, and large circular close control.
- PrimeStyleAI's white/cobalt theme is retained while the PhotoRoom information architecture and spacing are matched.
- Scoped ESLint, TypeScript, production build, and `git diff --check`: passed after the latest correction.
- Current same-state local screenshot comparison remains blocked by the mandatory signed-out auth gate.

## AI tool modal source/result asset correction

- User-provided failing modal capture: `/Users/arashsn/Downloads/Screenshot - 2026-07-26T004215.665.png`
- ChatGPT-browser generated source sets: `/Users/arashsn/Downloads/ChatGPT Image Jul 26, 2026, 12_32_42 AM.png`, `/Users/arashsn/Downloads/ChatGPT Image Jul 26, 2026, 12_35_22 AM.png`, and `/Users/arashsn/Downloads/ChatGPT Image Jul 26, 2026, 12_45_40 AM.png`
- Final 27-asset inspection sheet: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/pdp-ai-tools-contact-sheet-after-2026-07-26.jpg`
- The shared tool-card and tool-dialog asset registry now points to the cache-safe `/images/pdp-studio/ai-tools-v2/` set, so cards and modal examples use the same corrected visuals.
- Every tool asset now depicts its actual operation. Transform tools use before/after or source/result compositions; generation tools use source-to-output or consistent multi-angle compositions.
- Corrected examples include Ghost Mannequin, Background Remover, Recolor, Ironing, Product Fixer, Image Enhancer, AI Backgrounds, AI Expand, AI Shadows, AI Fashion Models, Product Staging, Product Beautifier, Edit with AI, Create any image, Flat Lay, Product Photography, Product Packaging, Studio Shot, Video Generator, AI Images, AI Shot List, Resize, Retouch, Instagram Story, Logo, Text, and Batch.
- Asset relevance, product continuity, varied color usage, crop, sharpness, accidental text, and obvious generation artifacts were visually reviewed in the combined inspection sheet.
- Scoped ESLint, TypeScript, production build, and `git diff --check`: passed.
- Same-state modal recapture remains blocked because the controlled localhost browser session is signed out and shows the mandatory authentication gate.

## AI tool modal scale and quality correction

- User-provided failing scale capture: `/Users/arashsn/Downloads/Screenshot - 2026-07-26T004915.384.png`
- Browser-served 1024px asset proof: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/tmp/product-fixer-1024-browser-proof.png`
- The shared empty-state preview changed from a `35rem` 3:2 frame with a square image constrained by `object-contain` to a square frame sized up to `34rem`/`64vh`, eliminating the large internal side margins.
- The shared canvas padding changed from `3rem` to `2rem`, and the description gap changed from `2rem` to `1.25rem`, giving the visual more usable area.
- All 27 browser-generated assets were re-encoded at `1024 x 1024`, quality `96`, sharp YUV, and maximum WebP encoding effort.
- Next Image recompression is disabled for the shared modal examples, so the high-quality project-owned WebP is served directly.
- The selected-upload preview uses the same enlarged shared frame.
- Scoped ESLint, TypeScript, production build, and `git diff --check`: passed.
- Full same-state modal comparison remains blocked by the mandatory authentication gate in the controlled local browser session.

final result: blocked

## Global AI tool quality-selector correction

- User-provided failing state: `/Users/arashsn/Downloads/Screenshot - 2026-07-26T223007.412.png`
- Corrected implementation capture: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-global-quality/corrected-quality-selector.png`
- Same-input before/after comparison: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-studio-global-quality/before-after-quality-selector.png`
- Verified state: Product Staging opened from Home with the shared Quality selector expanded at `1269 x 714`.
- Root cause: the shared quality-option buttons inherited a horizontal flex direction, forcing the title, tier, resolution, and feature list into one overlapping row.
- Global fix: the single shared `QualityPanel` now stacks each option vertically, constrains child widths, wraps feature copy, preserves tier badges, and exposes the selected option through `aria-pressed`.
- Scope: every PDP Studio AI tool using `PdpStudioAiToolDialog` inherits this correction; no per-tool layout override was added.
- Visual result: all three quality cards are readable with no overlap, clipping, or unintended horizontal overflow.
- Scoped ESLint, TypeScript, and `git diff --check`: passed.

final result: passed

## AI Backgrounds dedicated editor

### Evidence

- PhotoRoom editor reference: `/tmp/photoroom-ai-backgrounds-audit-2026-07-28/01-ai-backgrounds-editor.png`
- PrimeStyleAI implementation: `/tmp/pdp-ai-backgrounds-implementation-final.png`
- Side-by-side comparison: `/tmp/pdp-ai-backgrounds-comparison-desktop.png`
- Reference capture: `910 x 769`; implementation capture: `1269 x 720`
- Comparison normalizes both captures into equal `910 x 769` panels. A true identical-viewport source recapture was not available in the current browser session.

### Findings and fixes

- P0: none found.
- P1 fixed: the canvas width and `max-height` previously fought the selected aspect ratio, producing a wide frame with internal white gutters. The canvas now derives its width from both available container width and height, preserving every supported aspect ratio.
- P1 fixed: refreshing a completed job briefly opened the source picker. Job recovery now starts behind a dedicated “Restoring your editor…” state and opens the persisted result when the authenticated request completes.
- P2 fixed: “drop it here” was visible copy without a drop handler. PNG, JPEG, and WebP drag-and-drop now select the file through the same typed source path as the file input.
- P2 verified: the model selector and three-tier quality popover remain anchored inside the viewport with no overlap or clipped copy.
- P2 verified: Insert adds a real library image layer, Add text creates an editable text layer, Resize preserves product proportions, Download exported the full `1800 x 1800` composed canvas, and Share invoked the browser share path.
- Structural parity: top editing toolbar, centered product canvas, bottom edit prompt, right AI Backgrounds rail, model menu, create CTA, search, two-column visual preset catalog, custom modes, loading state, and real job states match the captured PhotoRoom information architecture in PrimeStyleAI's white/cobalt tokens.

### Functional verification

- Real jobs passed: preset, reference image, assisted, manual, and follow-up edit.
- Refresh/resume passed for the persisted `job` query.
- Provider cancellation is wired and issued successfully; the tested local job had already entered final result saving, so best-effort cancellation did not prevent its completed output.
- Frontend focused tests: `13` passed.
- Frontend TypeScript: passed.
- Backend focused contract/prompt tests: `33` passed.
- Backend build: passed.
- Starter preset catalog: `43` unique high-quality WebP assets generated in the signed-in ChatGPT browser, optimized to `1024 x 1024`, and visually inspected.
- The complete future catalog remains registered as `160` slots / `152` unique prompts, but the UI exposes only integrated thumbnails. New assets can be added later without changing the editor flow.
- The full asset pass was intentionally stopped at the user's request. No alternate image provider was used.
- Partial asset validation passed for all `43` integrated files; strict full-catalog validation remains available for the later expansion pass.

final result: passed for the current UI and functionality scope; full preset-asset expansion is intentionally deferred

## Retouch and Background Removal UI-only editors

### Evidence and normalization

- Retouch source truth: `/tmp/photoroom-retouch-audit-2026-07-28/01-retouch-start.png`
- Background Removal source truth: `/tmp/photoroom-background-removal-audit-2026-07-28/01-editor-remove-background-on.png`
- Edit Cutout source truth: `/tmp/photoroom-cutout-reference-current-1269.png`
- Retouch implementation: `/tmp/pdp-photo-editor-retouch-implementation-final.png`
- Background Removal implementation: `/tmp/pdp-photo-editor-background-main-final-05.png`
- Edit Cutout implementation: `/tmp/pdp-photo-editor-cutout-implementation-final-02.png`
- Full-view comparisons: `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-photo-editor-qa-2026-07-28/retouch-side-by-side.png`, `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-photo-editor-qa-2026-07-28/background-removal-shell-side-by-side.png`, and `/Users/arashsn/Projects/PrimeStyleAI/prime-products/outputs/pdp-photo-editor-qa-2026-07-28/cutout-side-by-side.png`
- Source and implementation captures are `910 x 769` at a `910 x 769` CSS viewport and device scale factor `1`.
- The in-app browser repeated the top surface below its live `714px` viewport in the CDP implementation captures. Both sides were therefore normalized to the same top `910 x 714` content region for the combined comparisons. A normal `1269 x 714` implementation capture was also inspected before the matched pass.
- States compared: Magic Retouch open; Background Removal editor with Remove Background on; Edit Cutout with Manual and Restore selected.
- The full-view comparisons keep all typography and controls readable, so no additional focused crop was needed. The Cutout comparison itself is the focused control-region proof.

### Comparison history and fixes

- P1 fixed: Retouch and Edit Cutout initially constrained the product canvas to `80%`, making both reference images visibly smaller than PhotoRoom. Retouch now uses the source-equivalent `88%` width and Cutout fills its `501px` canvas track.
- P1 fixed: the initial Cutout modal was `878 x 736`, while the source was approximately `864 x 720`. The final modal uses the matched `54rem x 45rem` geometry and `58% / 42%` split.
- P2 fixed: clicked Erase/Restore controls displayed a rectangular focus ring. Focus visibility now stays on the circular mode target with the matching semantic color.
- P2 fixed: the Background Removal shell lacked the source editor prompt, grouped effect controls, toggles, layer actions, and selected-object frame. These are now represented in the UI-only editor.
- P2 fixed: the selection rotation affordance was clipped by the image frame. The frame now allows editor controls to remain visible outside the canvas edge.
- Post-fix evidence: all three final side-by-side comparisons listed above.

### Required fidelity surfaces

- Fonts and typography: Inter/system typography, regular small-control weights, source-like title scale, line height, and hierarchy are preserved. No bold-heavy PDP Studio typography leaked into the editor.
- Spacing and layout rhythm: toolbar height, `360px` inspector rail, canvas placement, modal proportions, tabs, brush slider, suggestion cards, and action buttons match the captured source structure. Residual vertical differences are under `10px`.
- Colors and tokens: the requested PrimeStyleAI white/cobalt theme is used for the main editor. The dark Retouch and Cutout surfaces retain the source contrast and use cobalt only for selected/generation actions; erase and restore remain red and green.
- Image quality and asset fidelity: the existing project-owned `1024 x 1024` WebP tool assets are used without recompression. No PhotoRoom imagery was copied, hotlinked, or regenerated.
- Copy and content: all captured tool names and helper controls are present. `PDP Studio` replaces PhotoRoom branding, and the Restore helper correctly says “restore pixels” instead of reproducing the source's inconsistent “erase pixels” copy.

### Verification

- Primary interactions tested in the browser: open Retouch, open Edit Cutout, Guided/Manual, Erase/Restore, suggestion selection, Remove Background toggle, Confirm, Cancel, and the local brush surface.
- Console errors: `0` on Retouch, Edit Cutout, and the Background Removal shell.
- Focused component tests: `3` passed.
- Scoped ESLint: passed.
- TypeScript: passed.
- `git diff --check`: passed.
- Network contract: the focused tests prove these UI-only editors make no `fetch` request.
- No backend, worker, AI provider, generated asset, push, or deployment was included.

final result: passed
