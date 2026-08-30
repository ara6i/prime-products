// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createShopBagStore, SHOP_BAG_STORAGE_KEY } from "../../bag/shopBag.store";
import { dailyEditProductDetails } from "../data/dailyEditProductDetails.data";
import { useProductDetail } from "../hooks/useProductDetail";
import type { ProductDetailViewModel } from "../types/productDetail.types";
import { ProductDetailDesktop } from "./desktop/ProductDetailDesktop";
import { ProductDetailMobile } from "./mobile/ProductDetailMobile";
import { SizeGuideDialog } from "./SizeGuideDialog";

const fixture = vi.hoisted(() => ({ store: null as ReturnType<typeof createShopBagStore> | null }));
let storage: Pick<Storage, "getItem" | "setItem">;

vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a> }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));
vi.mock("../../bag/useShopBag", () => ({
  useShopBag: () => {
    const store = fixture.store!;
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
    return { ...snapshot, bagCount: snapshot.items.reduce((total, item) => total + item.quantity, 0), add: store.add, setOpen: store.setOpen };
  },
}));

function ProductHarness({ product, mobile = false }: { product: ProductDetailViewModel; mobile?: boolean }) {
  const state = useProductDetail(product);
  return <>
    {mobile ? <ProductDetailMobile product={product} state={state} /> : <ProductDetailDesktop product={product} state={state} />}
    <SizeGuideDialog product={product} open={state.sizeGuideOpen} onOpenChange={state.setSizeGuideOpen} />
  </>;
}

beforeEach(() => {
  const values = new Map<string, string>();
  storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  fixture.store = createShopBagStore(() => storage);
});
afterEach(() => cleanup());

describe.each([false, true])("Daily Edit PDP interactions (mobile: %s)", (mobile) => {
  it.each(dailyEditProductDetails)("browses all views, selects sizes and shows the mock chart for $name", async (product) => {
    const user = userEvent.setup();
    render(<ProductHarness product={product} mobile={mobile} />);
    expect(screen.getByRole("heading", { level: 1, name: product.name })).toBeTruthy();
    expect(screen.getByText(/Concept product · AI-generated gallery/)).toBeTruthy();
    expect(screen.queryByLabelText("Shopping benefits")).toBeNull();
    for (let index = 0; index < product.gallery.length; index++) {
      await user.click(screen.getByRole("button", { name: `Show product view ${index + 1}` }));
      expect(screen.getByAltText(product.gallery[index].alt).getAttribute("src")).toBe(product.gallery[index].src);
      expect(screen.getByText(`${index + 1} / 4`)).toBeTruthy();
    }

    await user.click(screen.getByRole("button", { name: "XL" }));
    expect(screen.getByRole("button", { name: "XL" }).getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: `Add to bag · ${product.priceLabel}` }));
    expect(fixture.store!.getSnapshot().items[0]).toMatchObject({ productId: product.id, name: product.name, size: "XL", image: product.gallery[0].src, href: product.canonicalHref, priceCents: product.priceCents, quantity: 1 });
    expect(fixture.store!.getSnapshot().isOpen).toBe(true);

    await user.click(screen.getByRole("button", { name: "Size guide" }));
    const dialog = within(screen.getByRole("dialog", { name: "Mock size guide" }));
    expect(dialog.getByText(/Illustrative mock data, not supplier sizing/)).toBeTruthy();
    const table = within(dialog.getByRole("table"));
    expect(table.getAllByRole("row")).toHaveLength(7);
    expect(table.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(product.sizeGuide!.headers);
    for (const size of product.sizes) expect(table.getByRole("rowheader", { name: size })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

it("keeps all four products and different sizes when moving between PDPs and restoring the bag", async () => {
  const user = userEvent.setup();
  const view = render(<ProductHarness key={dailyEditProductDetails[0].id} product={dailyEditProductDetails[0]} />);
  for (const product of dailyEditProductDetails) {
    view.rerender(<ProductHarness key={product.id} product={product} />);
    await user.click(screen.getByRole("button", { name: "M" }));
    await user.click(screen.getByRole("button", { name: `Add to bag · ${product.priceLabel}` }));
  }
  const first = dailyEditProductDetails[0];
  view.rerender(<ProductHarness key={first.id} product={first} />);
  await user.click(screen.getByRole("button", { name: "XL" }));
  await user.click(screen.getByRole("button", { name: `Add to bag · ${first.priceLabel}` }));
  expect(fixture.store!.getSnapshot().items).toHaveLength(5);
  const saved = storage.getItem(SHOP_BAG_STORAGE_KEY);
  act(() => fixture.store!.setOpen(false));
  expect(storage.getItem(SHOP_BAG_STORAGE_KEY)).toBe(saved);
  const restored = createShopBagStore(() => storage);
  restored.syncFromStorage();
  expect(restored.getSnapshot().items).toEqual(fixture.store!.getSnapshot().items);
});
