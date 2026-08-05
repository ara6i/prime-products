export function ShopifyProductWorkspaceLoading() {
  return (
    <main
      data-pdp-studio
      aria-busy="true"
      aria-label="Loading Shopify product"
      className="flex h-[100dvh] min-h-[36rem] overflow-hidden bg-[var(--color-pdp-paper)] font-[family-name:var(--font-pdp-body)] text-[var(--color-pdp-ink)] [color-scheme:light]"
    >
      <aside className="hidden w-[5.75rem] shrink-0 border-r border-[var(--color-pdp-rule)] bg-white p-3 lg:block">
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-[var(--color-pdp-accent)] text-sm font-semibold text-white">P</span>
        <div className="mt-8 grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="mx-auto block h-12 w-11 animate-pulse rounded-[0.8rem] bg-[var(--color-pdp-surface-soft)]" />
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center gap-3 border-b border-[var(--color-pdp-rule)] bg-white px-4">
          <span className="size-9 animate-pulse rounded-[0.65rem] bg-[var(--color-pdp-surface-soft)]" />
          <span className="h-4 w-44 animate-pulse rounded-full bg-[var(--color-pdp-surface-soft)]" />
        </header>
        <div className="h-11 shrink-0 animate-pulse border-b border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-accent-soft)]" />
        <div className="grid min-h-0 flex-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="hidden border-r border-[var(--color-pdp-rule)] bg-white p-4 lg:block">
            <span className="block h-5 w-24 animate-pulse rounded-full bg-[var(--color-pdp-surface-soft)]" />
            <span className="mt-3 block h-3 w-48 animate-pulse rounded-full bg-[var(--color-pdp-surface-soft)]" />
            <div className="mt-8 grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className="block h-[4.8rem] animate-pulse rounded-[0.85rem] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)]" />
              ))}
            </div>
          </aside>
          <div className="grid min-h-0 place-items-center p-6">
            <div className="text-center">
              <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-[var(--color-pdp-accent)] border-r-transparent" />
              <p className="mt-3 text-[0.75rem] text-[var(--color-pdp-muted)]">Loading Shopify product…</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
