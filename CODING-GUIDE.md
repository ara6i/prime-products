# PrimeStyleAI - Coding Guide

## Project Structure

### Page-Based Modular Architecture
- Each page/feature is a self-contained module with everything it needs
- Desktop and mobile are separated INSIDE each module — not at the root level
- Size detection must NOT live in `layout.tsx` or any root/server component
- Detection should be handled client-side without affecting SSR/server components

### Folder Structure Example
```
app/
  shared/
    components/
      ui/              ← shadcn/ui components (customized to match Figma)
      icons/           ← SVG React icon components
      header/          ← shared header component
      sidebar/         ← shared sidebar component
    hooks/             ← shared hooks (e.g. useDeviceDetect)
    lib/               ← shared utilities (cn(), etc.)
    types/             ← shared types (IconProps, NavItem, etc.)
    utils/             ← shared helpers
  try-on/
    components/
      desktop/
      mobile/
    hooks/
    types/             ← page-specific types (Step, Tab, BodyType, etc.)
    utils/
    services/
    mappers/
    page.tsx
  wardrobe/
    components/
      desktop/
      mobile/
    hooks/
    types/
    utils/
    services/
    mappers/
    page.tsx
```

Each module owns its own:
- **components/** — UI components, split into `desktop/` and `mobile/`
- **hooks/** — custom hooks specific to this page
- **utils/** — helper functions specific to this page
- **services/** — API calls and backend connection for this page
- **mappers/** — data transformation logic for this page

---

## Core Principles

### Separation of UI and Logic
- Components are ONLY for rendering — no business logic, no API calls, no data transformation
- **Components** — pure UI, receive props, render JSX, nothing else
- **Hooks** — state management, side effects, orchestrate logic for the component
- **Services** — API calls and backend communication, return raw data
- **Mappers** — transform API/raw data into the shape the UI needs
- **Utils** — pure helper functions, no side effects

### Flow
```
Service (fetch data) → Mapper (transform data) → Hook (manage state + orchestrate) → Component (render UI)
```

### Clean Code Rules
- Modular — every piece has one job
- Separated — UI never touches API, mappers never touch state
- Clean — small files, clear naming, no god-components
- No logic in JSX — if it needs an `if` or a loop with logic, extract it

---

## Backend Connection

### Services
- All API calls live in `services/` inside each page module
- Services return raw API responses — no transformation here
- One function per endpoint, clear naming (`getModels`, `uploadPhoto`, etc.)

### Mappers
- Raw API data goes through mappers before reaching hooks/components
- Mappers transform backend shape → frontend shape
- Keeps UI decoupled from API contract — if backend changes, only mapper changes

### Data Fetching Strategy
- **Server-side first** — always prefer server-side fetching (Server Components, `fetch` in RSC)
- Use Next.js built-in patterns: Server Components fetch data directly, no `useEffect` needed
- **Client-side only when necessary** — user interactions, real-time updates, mutations
- When client-side is needed, follow Next.js docs best practices (Route Handlers, Server Actions, `use()`)

### Flow
```
page.tsx (server) → service.fetchData() → mapper.transform() → pass as props to component

page.tsx (client) → hook calls service → mapper transforms → hook returns UI-ready data
```

### Rules
- Never call APIs directly from components
- Never transform data inside components or hooks — that's the mapper's job
- Server-side fetch by default, client-side is the exception not the rule
- Services are reusable — same service can be called from server or client

---

## Component Library (shadcn/ui)

### Base Components
- **shadcn/ui is the base** for all reusable UI components — never build from scratch what shadcn provides
- Components live in `shared/components/ui/`
- Always customize shadcn components to **exactly match the Figma design** — never ship default styling
- Use `cva` (class-variance-authority) for variant-based styling
- Use `cn()` from `shared/lib/utils` for conditional class merging

### Button — `shared/components/ui/button.tsx`
Every clickable action must use the shared `Button` component with the appropriate variant:
- `primary` — filled, bg-brand-blue, white text, rounded-full (Upload, Choose Model, Save as Model)
- `icon` — transparent, wraps a single icon (notification bell)
- `nav` — sidebar navigation items with icon + label, active state via `data-[active=true]`
- `ghost` — minimal, transparent background (expand chevron)

### Tabs — `shared/components/ui/tabs.tsx`
- `Tabs` / `TabsTrigger` — underline tabs with active/inactive border styling
- `SegmentedControl` — pill segments with background switch (Full Body / Close-up)
- `StepTabs` — large pill tabs with icons (Choose Model / Try On)

### Rules
- **Never use raw `<button>`** when a Button variant exists — always import from `shared/components/ui`
- **Never build tab/toggle UIs from scratch** — use the Tabs, SegmentedControl, or StepTabs primitives
- If a new pattern appears in Figma, create a new variant or component in `shared/components/ui/` first, then use it
- Model grid image cards are the only exception to the Button rule — they are interactive image thumbnails, not Buttons

---

## Icons

### Structure
- All icons live in `shared/components/icons/`
- Each icon is its own `.tsx` file, exported from `shared/components/icons/index.ts`
- Every icon component uses `IconProps` from `shared/types/`

### Rules
- **No inline SVGs anywhere in component code** — every SVG must be extracted into its own icon component
- Never define `IconProps` locally — always import from `@/app/shared/types`
- Every icon must accept `size`, `color`, and `className` props
- Use `currentColor` as the default `color` value
- Icons that need extra props must extend `IconProps` (e.g., `AIStylistIconProps extends IconProps`)
- Naming matches Figma icon names for easy cross-referencing

---

## Type Organization

### Shared Types — `shared/types/index.ts`
- Types used across multiple modules: `IconProps`, `NavItem`, `NavItemConfig`
- Import with: `import type { IconProps } from "@/app/shared/types"`

### Module Types — `<module>/types/index.ts`
- Types specific to a single page/feature: `Step`, `Tab`, `BodyType`
- Import with: `import type { Step } from "@/app/try-on/types"`

### Component Props
- Props interfaces stay co-located with their component file
- They are part of the component's contract, not shared types

### Rules
- **Never define the same type in multiple files** — single source of truth
- Use `import type` for type-only imports (enables tree-shaking)
- Never use inline type literals for props — always name the interface

---

## Modularity and Isolation

### Rules
- Every component must be **modular and isolated** — single responsibility, no god-components
- A component should be usable without knowing about the internals of other components
- If a UI pattern appears more than once, it must be a shared component in `shared/components/ui/`
- Props are the only way components communicate — no shared mutable state, no direct DOM access
- If a component file exceeds ~150 lines, consider splitting it into smaller sub-components

---

## Responsive Sizing Strategy

### All Values Must Be Viewport-Relative
- **NEVER use fixed pixel values** for any visual property — dimensions, spacing, typography, everything scales
- All values are derived from the Figma frame dimensions (typically 1920×1150 for desktop)

### Dimensions (width, height, gap)
- Convert Figma pixel values to `vw` units: `(figma_px / 1920) * 100 = vw`
- Define as CSS custom properties in `globals.css`, register in `@theme inline`
- Example: `751px` in Figma → `(751 / 1920) * 100 = 39.11vw`

### Padding & Margin
- Convert to **percentage** values relative to parent container width
- Horizontal: `(figma_px / parent_width) * 100%`
- Vertical: use `vw` when proportional scaling is needed, `%` when relative to parent
- Define as CSS custom properties, never hardcode in components

### Typography (font-size, line-height, letter-spacing)
- Font sizes MUST use `vw` units: `(figma_px / 1920) * 100 = vw`
- Define each text style as a CSS custom property in `globals.css`
- Example: `64px` in Figma → `(64 / 1920) * 100 = 3.33vw`
- Line-height: use the `em` value from Figma (e.g., `1.2em`)
- Letter-spacing: use the percentage from Figma (e.g., `15%` → `0.15em`)

### Border Radius
- Convert to `vw`: `(figma_px / 1920) * 100 = vw`
- Define as CSS custom properties

### Calculation Formula
```
vw_value = (figma_pixel_value / 1920) * 100

Examples:
  64px  → 3.33vw   (large heading)
  32px  → 1.67vw   (section heading)
  24px  → 1.25vw   (body text)
  20px  → 1.04vw   (small text)
  14px  → 0.73vw   (button text)
  15px  → 0.78vw   (border radius)
  80px  → 4.17vw   (large padding)
  96px  → 5.00vw   (large gap)
```

### Rules
- Every value goes through `globals.css` as a CSS custom property → registered in `@theme inline` → used as Tailwind class
- Components NEVER contain raw numbers — only Tailwind token classes
- When adding new tokens, group them by page in `globals.css` with clear comments
- Verify all conversions produce correct visual results via Puppeteer screenshot comparison
