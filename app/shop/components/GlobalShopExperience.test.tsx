// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalShopExperience } from "./GlobalShopExperience";
import { shopMenuSections } from "./shopMenu.data";
import { dailyEditProducts } from "../data/dailyEdit.data";

const actions = vi.hoisted(() => ({ push: vi.fn(), setCartOpen: vi.fn(), add: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: actions.push }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => {
    const anchorProps = { ...props };
    delete anchorProps.prefetch;
    return <a {...anchorProps}>{children}</a>;
  },
}));
vi.mock("next/image", () => ({
  // No image requests or Next image runtime are needed for these interaction tests.
  default: ({ src, alt, width, height, quality, sizes }: {
    src: string; alt: string; width?: number; height?: number; quality?: number; sizes?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} sizes={sizes} data-quality={quality} />
  ),
}));
vi.mock("../../partner-landing/influencer/components/InfluencerFooter", () => ({ InfluencerFooter: () => null }));
vi.mock("../runway/components/ShopRunwayExperience", () => ({ ShopRunwayExperience: () => null }));
vi.mock("../bag/useShopBag", () => ({
  useShopBag: () => ({ bagCount: 2, add: actions.add, setOpen: actions.setCartOpen }),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

it("links each original Daily Edit landing look to its own matching PDP", () => {
  render(<GlobalShopExperience />);
  const rail = within(screen.getByRole("navigation", { name: "Daily Edit products" }));
  expect(rail.getAllByRole("link")).toHaveLength(4);
  for (const product of dailyEditProducts) {
    const link = rail.getByRole("link", { name: `View ${product.name}` });
    expectNewTabLink(link, product.href);
    expect(within(link).getByAltText(product.name).getAttribute("src")).toBe(product.image);
    expect(within(link).getByText(`${product.brand} · $${product.price}`)).toBeTruthy();
  }
});

describe("New arrivals product links", () => {
  it("makes all four product images and names open their matching PDP in a new tab", () => {
    render(<GlobalShopExperience />);
    const arrivals = within(screen.getByRole("region", { name: "New arrivals, made personal." }));
    expect(arrivals.getAllByRole("article")).toHaveLength(4);
    for (const product of dailyEditProducts) {
      const imageLink = arrivals.getByRole("link", { name: `View ${product.name}` });
      expectNewTabLink(imageLink, product.href);
      expect(within(imageLink).getByAltText(product.name).getAttribute("src")).toBe(product.image);
      expectNewTabLink(arrivals.getByRole("link", { name: product.name }), product.href);
      expect(imageLink.querySelector("button")).toBeNull();
    }
  });

  it("keeps favorites and quick-add separate from navigation and saves the matching PDP link", async () => {
    const user = userEvent.setup();
    render(<GlobalShopExperience />);
    const arrivals = within(screen.getByRole("region", { name: "New arrivals, made personal." }));
    const product = dailyEditProducts[0];
    await user.click(arrivals.getByRole("button", { name: `Add ${product.name} to favorites` }));
    expect(arrivals.getByRole("button", { name: `Remove ${product.name} from favorites` })).toBeTruthy();
    expect(actions.add).not.toHaveBeenCalled();
    await user.click(arrivals.getByRole("button", { name: `Add ${product.name} to bag` }));
    expect(actions.add).toHaveBeenCalledWith(expect.objectContaining({ productId: product.id, href: product.href }));
    expect(actions.push).not.toHaveBeenCalled();
  });
});

async function openMenu() {
  const user = userEvent.setup();
  render(<GlobalShopExperience />);
  await user.click(screen.getByRole("button", { name: "Open menu" }));
  const menu = screen.getByRole("dialog", { name: "PrimeStyleAI site menu" });
  return { user, menu: within(menu) };
}

function expectNewTabLink(link: HTMLElement, href: string) {
  expect(link.getAttribute("href")).toBe(href);
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  expect(link.getAttribute("title")).toBe("Opens in a new tab");
}

describe("Shop branded menu", () => {
  it("keeps the high-resolution original mark and opens on the Shop section", async () => {
    const { menu } = await openMenu();
    const logo = within(menu.getByRole("img", { name: "PrimeStyleAI — Shopping Network" }));
    const mark = logo.getByAltText("");
    expect(mark.getAttribute("src")).toBe("/media/partner-landing/primestyleai-new-mark.png");
    expect(mark.getAttribute("width")).toBe("1254");
    expect(mark.getAttribute("height")).toBe("1254");
    expect(mark.getAttribute("data-quality")).toBe("90");
    expect(mark.getAttribute("sizes")).toBe("(max-width: 760px) 120px, 230px");
    expect(logo.getByText("PrimeStyleAI")).toBeTruthy();
    expect(logo.getByText("Shopping Network")).toBeTruthy();
    const platforms = within(menu.getByRole("tablist", { name: "PrimeStyleAI platforms" }));
    for (const label of ["Shop", "Influencers", "Merchants", "Suppliers", "PDP Studio", "MyAIFitting"]) {
      expect(platforms.getByRole("tab", { name: label })).toBeTruthy();
    }
    expect(platforms.getByRole("tab", { name: "Shop" }).getAttribute("aria-selected")).toBe("true");
    const shop = within(menu.getByRole("tabpanel", { name: "Shop" }));
    expect(shop.getByRole("link", { name: "Product page · PDP" }).getAttribute("href")).toBe("/shop/product/denim-light-wide-leg");
    expect(shop.getByRole("link", { name: "Denim" }).getAttribute("href")).toBe("/shop/category/denim");
    expect(shop.getByRole("link", { name: "Outfit canvas" }).getAttribute("href")).toBe("/shop/dressing-room");
    expect(menu.queryByRole("link", { name: "Merchant dashboard" })).toBeNull();
  });

  it.each(shopMenuSections)("switches to $label without navigating, closing, or mutating the bag", async (section) => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: section.label }));
    expect(menu.getAllByRole("tabpanel")).toHaveLength(1);
    expect(menu.getByRole("tab", { name: section.label }).getAttribute("aria-selected")).toBe("true");
    const panel = within(menu.getByRole("tabpanel", { name: section.label }));
    for (const group of section.groups) {
      const links = within(panel.getByRole("navigation", { name: `${section.label} ${group.label}` }));
      for (const link of group.links) {
        expectNewTabLink(links.getByRole("link", { name: link.label }), link.href);
      }
    }
    const features = within(panel.getByRole("navigation", { name: `${section.label} featured destinations` }));
    expect(features.getAllByRole("link")).toHaveLength(section.features.length);
    for (const feature of section.features) {
      const card = features.getByRole("link", { name: feature.label });
      expectNewTabLink(card, feature.href);
      expect(card.querySelector("img")?.getAttribute("src")).toBe(feature.image);
    }
    expect(actions.push).not.toHaveBeenCalled();
    expect(actions.add).not.toHaveBeenCalled();
    expect(actions.setCartOpen).not.toHaveBeenCalled();
    if (section.id !== "shop") {
      expect(menu.queryByRole("link", { name: "Outfit canvas" })).toBeNull();
    }
  });

  it("supports arrow keys, Home, and End for platform selection", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "Shop" }));
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(menu.getByRole("tab", { name: "Influencers" }).getAttribute("aria-selected")).toBe("true"));
    expect(document.activeElement).toBe(menu.getByRole("tab", { name: "Influencers" }));
    await user.keyboard("{End}");
    await waitFor(() => expect(menu.getByRole("tabpanel", { name: "MyAIFitting" })).toBeTruthy());
    await user.keyboard("{Home}");
    await waitFor(() => expect(menu.getByRole("tabpanel", { name: "Shop" })).toBeTruthy());
    expect(actions.push).not.toHaveBeenCalled();
  });

  it("can switch through every section and return to Shop without leaving stale links", async () => {
    const { user, menu } = await openMenu();
    for (const label of ["Merchants", "Suppliers", "PDP Studio", "MyAIFitting", "Influencers", "Shop"]) {
      await user.click(menu.getByRole("tab", { name: label }));
      expect(menu.getAllByRole("tabpanel")).toHaveLength(1);
      expect(menu.getByRole("tabpanel", { name: label })).toBeTruthy();
    }
    expect(menu.queryByRole("link", { name: "Merchant dashboard" })).toBeNull();
    expect(menu.queryByRole("link", { name: "Supplier dashboard" })).toBeNull();
    expect(menu.queryByRole("link", { name: "Influencer dashboard" })).toBeNull();
    expect(menu.queryByRole("link", { name: "PDP Studio dashboard" })).toBeNull();
    expect(menu.getByRole("link", { name: "Outfit canvas" })).toBeTruthy();
    expect(actions.push).not.toHaveBeenCalled();
  });

  it("opens studio links in new tabs without dismissing the selected studio menu", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "PDP Studio" }));
    const studio = within(menu.getByRole("tabpanel", { name: "PDP Studio" }));
    expect(studio.getByRole("link", { name: "PDP Studio dashboard" }).getAttribute("href"))
      .toBe("/pdp-studio");
    expect(actions.push).not.toHaveBeenCalled();
    const workspace = within(studio.getByRole("navigation", { name: "PDP Studio Workspace" }));
    const designs = workspace.getByRole("link", { name: "Designs" });
    expectNewTabLink(designs, "/pdp-studio/designs");
    await user.click(designs);
    expect(actions.push).not.toHaveBeenCalled();
    expect(menu.getByRole("tabpanel", { name: "PDP Studio" })).toBeTruthy();
  });

  it("closes with the close button and restores focus to the menu trigger", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("button", { name: "Close menu" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open menu" })));
  });

  it("closes with Escape without changing the bag", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "Suppliers" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(actions.add).not.toHaveBeenCalled();
    expect(actions.setCartOpen).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Shopping bag with 2 items" })).toBeTruthy();
  });

  it("hands focus to Search after the menu closes", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "Merchants" }));
    await user.click(menu.getByRole("button", { name: "Search" }));
    const search = await screen.findByRole("textbox", { name: "Search the global shop" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(search);
  });

  it("opens the existing bag once after the menu closes", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "Influencers" }));
    await user.click(menu.getByRole("button", { name: /Bag/ }));
    await waitFor(() => expect(actions.setCartOpen).toHaveBeenCalledWith(true));
    expect(actions.setCartOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("allows native new-tab activation and leaves the current shop URL and menu intact", async () => {
    const { user, menu } = await openMenu();
    const originalUrl = window.location.href;
    await user.click(menu.getByRole("tab", { name: "Merchants" }));
    const dashboard = menu.getByRole("link", { name: "Merchant dashboard" });
    expectNewTabLink(dashboard, "/merchants/dashboard");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    dashboard.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(window.location.href).toBe(originalUrl);
    expect(actions.push).not.toHaveBeenCalled();
    expect(menu.getByRole("tabpanel", { name: "Merchants" })).toBeTruthy();
    await user.click(menu.getByRole("link", { name: "Merchant landing" }));
    expect(window.location.href).toBe(originalUrl);
    expect(actions.push).not.toHaveBeenCalled();
    expect(actions.add).not.toHaveBeenCalled();
    expect(actions.setCartOpen).not.toHaveBeenCalled();
  });

  it("also opens the menu home and login page in new tabs", async () => {
    const { user, menu } = await openMenu();
    const home = menu.getByRole("link", { name: "PrimeStyleAI shop home" });
    const login = menu.getByRole("link", { name: "Log in" });
    expectNewTabLink(home, "/shop");
    expectNewTabLink(login, "/customer/login");
    await user.click(home);
    await user.click(login);
    expect(actions.push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "PrimeStyleAI site menu" })).toBeTruthy();
  });

  it("keeps keyboard link activation in the new-tab flow", async () => {
    const { user, menu } = await openMenu();
    const denim = menu.getByRole("link", { name: "Denim" });
    expectNewTabLink(denim, "/shop/category/denim");
    denim.focus();
    await user.keyboard("{Enter}");
    expect(actions.push).not.toHaveBeenCalled();
    expect(menu.getByRole("tabpanel", { name: "Shop" })).toBeTruthy();
  });
});
