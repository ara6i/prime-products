// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShopBagItem } from "../bag/shopBag.store";
import { ShopReceiptSidebar } from "./ShopReceiptSidebar";

const bag = vi.hoisted(() => ({
  items: [] as ShopBagItem[], bagCount: 0, isOpen: true, storageAvailable: true,
  setOpen: vi.fn(), changeQuantity: vi.fn(), remove: vi.fn(),
}));
vi.mock("../bag/useShopBag", () => ({ useShopBag: () => bag }));
vi.mock("next/link", () => ({ default: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next/image", () => ({
  default: ({ quality, unoptimized, alt, ...props }: ComponentProps<"img"> & { quality?: number; unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={alt ?? ""} data-quality={quality} data-original={unoptimized || undefined} />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  bag.items = ["Signal Sport Shell", "Noir Halo Blazer"].map((name, index) => ({
    key: `qa-${index}`, productId: `qa-${index}`, name, brandName: "Example brand",
    image: `/media/product-${index}.webp`, size: "S", color: "Black", currency: "USD",
    priceCents: index ? 16400 : 19800, quantity: 1,
  }));
  bag.bagCount = 2;
});
afterEach(cleanup);

describe("Shop receipt readability and interactions", () => {
  it("makes the items keyboard reachable without putting the subtotal or actions in the scroll region", () => {
    render(<ShopReceiptSidebar />);
    const region = screen.getByRole("region", { name: "Receipt items" });
    expect(region.tabIndex).toBe(0);
    expect(within(region).getByRole("list", { name: "Products in your bag" }).children).toHaveLength(2);
    expect(within(region).queryByText("SUBTOTAL")).toBeNull();
    expect(within(region).queryByRole("button", { name: "Continue shopping" })).toBeNull();
    expect(screen.getByText("$362.00")).toBeTruthy();
  });

  it("uses high-resolution thumbnails and quality 90, eagerly loading only the first two", () => {
    bag.items.push({ ...bag.items[0], key: "qa-third", name: "Third item" });
    bag.bagCount = 3;
    render(<ShopReceiptSidebar />);
    const images = within(screen.getByRole("region", { name: "Receipt items" })).getAllByRole("img");
    for (const image of images) {
      expect(image.getAttribute("width")).toBe("264");
      expect(image.getAttribute("height")).toBe("360");
      expect(image.getAttribute("data-quality")).toBe("90");
    }
    expect(images.map(image => image.getAttribute("loading"))).toEqual(["eager", "eager", "lazy"]);
  });

  it("keeps all long-bag rows available and changes only the chosen item", async () => {
    bag.items = Array.from({ length: 12 }, (_, index) => ({ ...bag.items[0], key: `qa-${index}`, name: `Item ${index + 1}` }));
    bag.bagCount = 12;
    const user = userEvent.setup();
    render(<ShopReceiptSidebar />);
    expect(screen.getByRole("list", { name: "Products in your bag" }).children).toHaveLength(12);
    await user.click(screen.getByRole("button", { name: "Increase quantity of Item 12, S" }));
    expect(bag.changeQuantity).toHaveBeenCalledExactlyOnceWith("qa-11", 1);
    await user.click(screen.getByRole("button", { name: "Remove Item 12, S from bag" }));
    expect(bag.remove).toHaveBeenCalledExactlyOnceWith("qa-11");
  });

  it("replays and closes without modifying saved products", async () => {
    const user = userEvent.setup();
    render(<ShopReceiptSidebar />);
    await user.click(screen.getByRole("button", { name: "Replay receipt" }));
    await user.click(screen.getByRole("button", { name: "Continue shopping" }));
    expect(bag.setOpen).toHaveBeenCalledWith(false);
    expect(bag.changeQuantity).not.toHaveBeenCalled();
    expect(bag.remove).not.toHaveBeenCalled();
  });

  it("preserves the empty-bag state", () => {
    bag.items = [];
    bag.bagCount = 0;
    render(<ShopReceiptSidebar />);
    expect(screen.getByText("A little room for something you love.")).toBeTruthy();
    expect(screen.queryByText("SUBTOTAL")).toBeNull();
    expect(screen.getByRole("button", { name: "Continue shopping" })).toBeTruthy();
  });
});
