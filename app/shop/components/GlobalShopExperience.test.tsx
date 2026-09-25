// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalShopExperience } from "./GlobalShopExperience";
import { shopMenuSections } from "./shopMenu.data";
import { dailyEditProducts } from "../data/dailyEdit.data";
import { shopBrandProfiles } from "../brand/data/brandProfiles.data";

const actions = vi.hoisted(() => ({
  push: vi.fn(),
  setCartOpen: vi.fn(),
  add: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: actions.push }),
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: ComponentProps<"a"> & { prefetch?: boolean }) => {
    const anchorProps = { ...props };
    delete anchorProps.prefetch;
    return <a {...anchorProps}>{children}</a>;
  },
}));
vi.mock("next/image", () => ({
  // No image requests or Next image runtime are needed for these interaction tests.
  default: ({
    src,
    alt,
    width,
    height,
    quality,
    sizes,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    quality?: number;
    sizes?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      data-quality={quality}
    />
  ),
}));
vi.mock("../../partner-landing/influencer/components/InfluencerFooter", () => ({
  InfluencerFooter: () => null,
}));
vi.mock("../runway/components/ShopRunwayExperience", () => ({
  ShopRunwayExperience: () => null,
}));
vi.mock("../bag/useShopBag", () => ({
  useShopBag: () => ({
    bagCount: 2,
    add: actions.add,
    setOpen: actions.setCartOpen,
  }),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

it("places AI Stylist second and the SDK third without reordering later sections", () => {
  const { container } = render(<GlobalShopExperience />);
  const main = container.querySelector("main");
  const orderedSections = Array.from(main?.children ?? []).filter(
    (element) => element.tagName === "SECTION",
  );

  expect(orderedSections[0]?.getAttribute("aria-labelledby")).toBe(
    "shop-hero-title",
  );
  expect(orderedSections[1]?.id).toBe("ai-stylist-scenario");
  expect(orderedSections[2]?.id).toBe("ai-fitting");

  const laterSectionIds = orderedSections.slice(3).map((section) => section.id);
  expect(laterSectionIds).toEqual(
    expect.arrayContaining(["shop-edit", "ai-stylist", "brands"]),
  );
  expect(laterSectionIds.indexOf("shop-edit")).toBeLessThan(
    laterSectionIds.indexOf("ai-stylist"),
  );
  expect(laterSectionIds.indexOf("ai-stylist")).toBeLessThan(
    laterSectionIds.indexOf("brands"),
  );
});

it("keeps partner destinations in the header and scrolls the final supplier action to its section", async () => {
  const user = userEvent.setup();
  const scrollIntoView = vi.fn();
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
  render(<GlobalShopExperience />);
  const navigationElement = screen.getByRole("navigation", {
    name: "Shop navigation",
  });
  const navigation = within(navigationElement);
  expect(navigation.queryByRole("button", { name: "AI Stylist" })).toBeNull();
  expect(navigation.queryByRole("button", { name: "Brands" })).toBeNull();
  expect(
    navigation
      .getByRole("link", { name: "For Influencers" })
      .getAttribute("href"),
  ).toBe("/influencers");
  expect(
    navigation
      .getByRole("link", { name: "For Merchants" })
      .getAttribute("href"),
  ).toBe("/merchants");

  const supplierAction = navigation.getByRole("button", {
    name: "For Suppliers",
  });
  expect(navigationElement.lastElementChild).toBe(supplierAction);

  await user.click(supplierAction);
  expect(scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start",
  });
});

it("labels the shop as a launching-soon demo and uses Shane's latest Google Booking link", () => {
  render(<GlobalShopExperience />);

  const banner = within(
    screen.getByRole("note", { name: "Demo site launching soon" }),
  );
  expect(banner.getByText("Demo site")).toBeTruthy();
  expect(banner.getByText("Launching soon")).toBeTruthy();
  expectNewTabLink(
    screen.getByRole("link", { name: "Schedule a Demo" }),
    "https://calendar.app.google/4LeitboKs5KzemWL7",
  );
  expect(banner.queryByRole("link", { name: "Schedule a Demo" })).toBeNull();
});

it("links each original Daily Edit landing look to its own matching PDP", () => {
  render(<GlobalShopExperience />);
  const rail = within(
    screen.getByRole("navigation", { name: "Daily Edit products" }),
  );
  expect(rail.getAllByRole("link")).toHaveLength(4);
  for (const product of dailyEditProducts) {
    const link = rail.getByRole("link", { name: `View ${product.name}` });
    expectNewTabLink(link, product.href);
    expect(within(link).getByAltText(product.name).getAttribute("src")).toBe(
      product.image,
    );
    expect(
      within(link).getByText(`${product.brand} · $${product.price}`),
    ).toBeTruthy();
  }
});

describe("New arrivals product links", () => {
  it("makes all four product images and names open their matching PDP in a new tab", () => {
    render(<GlobalShopExperience />);
    const arrivals = within(
      screen.getByRole("region", { name: "New arrivals, made personal." }),
    );
    expect(arrivals.getAllByRole("article")).toHaveLength(4);
    for (const product of dailyEditProducts) {
      const imageLink = arrivals.getByRole("link", {
        name: `View ${product.name}`,
      });
      expectNewTabLink(imageLink, product.href);
      expect(
        within(imageLink).getByAltText(product.name).getAttribute("src"),
      ).toBe(product.image);
      expectNewTabLink(
        arrivals.getByRole("link", { name: product.name }),
        product.href,
      );
      expect(imageLink.querySelector("button")).toBeNull();
    }
  });

  it("keeps favorites and quick-add separate from navigation and saves the matching PDP link", async () => {
    const user = userEvent.setup();
    render(<GlobalShopExperience />);
    const arrivals = within(
      screen.getByRole("region", { name: "New arrivals, made personal." }),
    );
    const product = dailyEditProducts[0];
    await user.click(
      arrivals.getByRole("button", {
        name: `Add ${product.name} to favorites`,
      }),
    );
    expect(
      arrivals.getByRole("button", {
        name: `Remove ${product.name} from favorites`,
      }),
    ).toBeTruthy();
    expect(actions.add).not.toHaveBeenCalled();
    await user.click(
      arrivals.getByRole("button", { name: `Add ${product.name} to bag` }),
    );
    expect(actions.add).toHaveBeenCalledWith(
      expect.objectContaining({ productId: product.id, href: product.href }),
    );
    expect(actions.push).not.toHaveBeenCalled();
  });
});

it("presents the focused merchant network hero and the complete creator hero", () => {
  render(<GlobalShopExperience />);

  const merchant = within(
    screen.getByRole("region", {
      name: /Have a store\?/,
    }),
  );
  expect(
    merchant.getByRole("heading", {
      name: /Have a store\?/,
    }),
  ).toBeTruthy();
  expect(merchant.getByText(/Sell through PrimeStyleAI Shop/)).toBeTruthy();
  expect(
    merchant.getByRole("link", { name: "Learn more" }).getAttribute("href"),
  ).toBe("/merchants");
  expect(merchant.getByLabelText("PrimeStyleAI merchant network")).toBeTruthy();
  const supplierImage = merchant.getByRole("article", {
    name: "Supplier image",
  });
  expect(supplierImage.querySelector("img")?.getAttribute("src")).toContain(
    "supplier-apparel-box-v1.webp",
  );
  const sizingVideo = merchant.getByRole("article", {
    name: "AI sizing and try-on video",
  });
  expect(sizingVideo.querySelector("video")).toBeTruthy();
  expect(sizingVideo.querySelector("source")?.getAttribute("src")).toBe(
    "/media/partner-landing/merchant-network/one-photo-sizing/one-photo-sizing-european-omni-box-only-720p-v2.mp4",
  );
  const influencerImage = merchant.getByRole("article", {
    name: "Influencer image",
  });
  expect(influencerImage.querySelector("img")?.getAttribute("src")).toContain(
    "merchant-influencer-editorial-v1.png",
  );
  const merchantStorePreview = merchant.getByRole("article", {
    name: "Merchant store image",
  });
  const merchantStoreSources = Array.from(
    merchantStorePreview.querySelectorAll("img"),
    (image) => image.getAttribute("src") ?? "",
  );
  expect(
    merchantStoreSources.some((src) =>
      src.includes("example-store-hero-model.webp"),
    ),
  ).toBe(true);
  expect(
    merchantStoreSources.some((src) =>
      src.includes("example-store-mens-collection.webp"),
    ),
  ).toBe(true);
  expect(
    merchantStoreSources.some((src) =>
      src.includes("womens-collection-landscape-v2.webp"),
    ),
  ).toBe(true);
  expect(merchant.queryByRole("navigation")).toBeNull();

  const creatorSection = screen.getByRole("region", {
    name: /Are you an influencer\?/,
  });
  const creator = within(creatorSection);
  expect(creator.getByRole("button", { name: "Learn more" })).toBeTruthy();
  expect(creator.getByText(/Your influence should pay\./)).toBeTruthy();
  expect(
    creatorSection.querySelector(
      'img[src*="european-editorial-duo-wide-v2.webp"]',
    ),
  ).toBeTruthy();
  expect(creator.getByRole("heading", { name: "Choose it" })).toBeTruthy();
  expect(creator.getByRole("heading", { name: "Get paid" })).toBeTruthy();
  expect(creatorSection.querySelectorAll('img[src*="journey-"]')).toHaveLength(
    4,
  );
  expect(creator.queryByText("Creator system")).toBeNull();
  expect(creator.getByText(/XXS\s+XS\s+S\s+M\s+L\s+XL/)).toBeTruthy();
  expect(creator.getByText("$128.40")).toBeTruthy();
});

it("brings the interactive merchant SDK showcase into the Shop landing", () => {
  render(<GlobalShopExperience />);

  const sdkShowcase = within(
    screen.getByRole("region", { name: "Arc Jacket" }),
  );

  expect(sdkShowcase.getByText("Men's jacket")).toBeTruthy();
  expect(sdkShowcase.getByText("AI sizing + virtual try-on")).toBeTruthy();
  expect(sdkShowcase.getByText("See a demo!")).toBeTruthy();
  expect(sdkShowcase.getByText("Try it now!")).toBeTruthy();
  expect(sdkShowcase.queryByText(/live sdk/i)).toBeNull();
  expect(
    sdkShowcase.getByText(
      /get your recommended size and see the Arc Jacket on you/i,
    ),
  ).toBeTruthy();
  expect(sdkShowcase.getByLabelText("Select Cobalt")).toBeTruthy();
  expect(sdkShowcase.getByRole("button", { name: "Size guide" })).toBeTruthy();
  expect(
    sdkShowcase.getByRole("button", { name: "Find my size & try it on" }),
  ).toBeTruthy();
  expect(
    sdkShowcase.queryByRole("button", { name: "Add to bag — $148" }),
  ).toBeNull();
});

it("presents one full supplier-focused network section", () => {
  render(<GlobalShopExperience />);

  const supplierSection = screen.getByRole("region", {
    name: /Could your collection reach further\?/,
  });
  const supplier = within(supplierSection);

  expect(
    supplier.getByText(
      /Reach verified merchants, creator-led campaigns, and global shoppers through one connected supplier system/i,
    ),
  ).toBeTruthy();
  expect(
    supplier
      .getByRole("link", { name: /Grow as a supplier/ })
      .getAttribute("href"),
  ).toBe("/suppliers");
  const handoffImage = supplier.getByAltText(
    /European supplier handing a garment box to a European merchant while a European influencer films the exchange/i,
  );
  expect(handoffImage.getAttribute("src")).toContain(
    "supplier-merchant-influencer-cutout-v1.png",
  );
  expect(supplier.getByText("More stockists")).toBeTruthy();
  expect(supplier.getByText("Creator demand")).toBeTruthy();
  expect(supplier.getByText("Global distribution")).toBeTruthy();
  expect(supplier.getByText("Built for suppliers")).toBeTruthy();
  expect(supplier.getByText("One catalog. Full visibility.")).toBeTruthy();
  expect(screen.queryByText(/Are you a supplier/i)).toBeNull();
  expect(
    screen.queryByText("Publish the collection merchants need."),
  ).toBeNull();
});

it("opens every featured brand and both brand stories in filtered Women collections", async () => {
  const user = userEvent.setup();
  render(<GlobalShopExperience />);
  const brands = within(document.getElementById("brands") as HTMLElement);

  for (const brand of shopBrandProfiles) {
    await user.click(
      brands.getByRole("button", { name: `Shop ${brand.name}` }),
    );
    expect(actions.push).toHaveBeenLastCalledWith(
      `/shop/category/women?brand=${brand.id}`,
    );
  }

  const stories = brands.getAllByRole("article");
  await user.click(
    within(stories[0]).getByRole("button", { name: "Explore brand" }),
  );
  expect(actions.push).toHaveBeenLastCalledWith(
    "/shop/category/women?brand=judy-blue",
  );
  await user.click(
    within(stories[1]).getByRole("button", { name: "Explore brand" }),
  );
  expect(actions.push).toHaveBeenLastCalledWith(
    "/shop/category/women?brand=zenana",
  );
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
    const logo = within(
      menu.getByRole("img", { name: "PrimeStyleAI — Shopping Network" }),
    );
    const mark = logo.getByAltText("");
    expect(mark.getAttribute("src")).toBe(
      "/media/partner-landing/primestyleai-new-mark.png",
    );
    expect(mark.getAttribute("width")).toBe("1254");
    expect(mark.getAttribute("height")).toBe("1254");
    expect(mark.getAttribute("data-quality")).toBe("90");
    expect(mark.getAttribute("sizes")).toBe("(max-width: 760px) 120px, 230px");
    expect(logo.getByText("PrimeStyleAI")).toBeTruthy();
    expect(logo.getByText("Shopping Network")).toBeTruthy();
    const platforms = within(
      menu.getByRole("tablist", { name: "PrimeStyleAI platforms" }),
    );
    for (const label of [
      "Shop",
      "Influencers",
      "Merchants",
      "Suppliers",
      "PDP Studio",
      "MyAIFitting",
    ]) {
      expect(platforms.getByRole("tab", { name: label })).toBeTruthy();
    }
    expect(
      platforms
        .getByRole("tab", { name: "Shop" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    const shop = within(menu.getByRole("tabpanel", { name: "Shop" }));
    expect(
      shop
        .getByRole("link", { name: "Product page · PDP" })
        .getAttribute("href"),
    ).toBe("/shop/product/denim-light-wide-leg");
    expect(shop.queryByRole("link", { name: "Denim" })).toBeNull();
    expect(shop.getByRole("link", { name: "Women" }).getAttribute("href")).toBe(
      "/shop/category/women",
    );
    expect(
      shop.getByRole("link", { name: "Judy Blue" }).getAttribute("href"),
    ).toBe("/shop/category/women?brand=judy-blue");
    expect(
      shop.getByRole("link", { name: "Outfit canvas" }).getAttribute("href"),
    ).toBe("/shop/dressing-room");
    expect(menu.queryByRole("link", { name: "Merchant dashboard" })).toBeNull();
  });

  it.each(shopMenuSections)(
    "switches to $label without navigating, closing, or mutating the bag",
    async (section) => {
      const { user, menu } = await openMenu();
      await user.click(menu.getByRole("tab", { name: section.label }));
      expect(menu.getAllByRole("tabpanel")).toHaveLength(1);
      expect(
        menu
          .getByRole("tab", { name: section.label })
          .getAttribute("aria-selected"),
      ).toBe("true");
      const panel = within(menu.getByRole("tabpanel", { name: section.label }));
      for (const group of section.groups) {
        const links = within(
          panel.getByRole("navigation", {
            name: `${section.label} ${group.label}`,
          }),
        );
        for (const link of group.links) {
          expectNewTabLink(
            links.getByRole("link", { name: link.label }),
            link.href,
          );
        }
      }
      const features = within(
        panel.getByRole("navigation", {
          name: `${section.label} featured destinations`,
        }),
      );
      expect(features.getAllByRole("link")).toHaveLength(
        section.features.length,
      );
      for (const feature of section.features) {
        const card = features.getByRole("link", { name: feature.label });
        expectNewTabLink(card, feature.href);
        expect(card.querySelector("img")?.getAttribute("src")).toBe(
          feature.image,
        );
      }
      expect(actions.push).not.toHaveBeenCalled();
      expect(actions.add).not.toHaveBeenCalled();
      expect(actions.setCartOpen).not.toHaveBeenCalled();
      if (section.id !== "shop") {
        expect(menu.queryByRole("link", { name: "Outfit canvas" })).toBeNull();
      }
    },
  );

  it("supports arrow keys, Home, and End for platform selection", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "Shop" }));
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(
        menu
          .getByRole("tab", { name: "Influencers" })
          .getAttribute("aria-selected"),
      ).toBe("true"),
    );
    expect(document.activeElement).toBe(
      menu.getByRole("tab", { name: "Influencers" }),
    );
    await user.keyboard("{End}");
    await waitFor(() =>
      expect(menu.getByRole("tabpanel", { name: "MyAIFitting" })).toBeTruthy(),
    );
    await user.keyboard("{Home}");
    await waitFor(() =>
      expect(menu.getByRole("tabpanel", { name: "Shop" })).toBeTruthy(),
    );
    expect(actions.push).not.toHaveBeenCalled();
  });

  it("can switch through every section and return to Shop without leaving stale links", async () => {
    const { user, menu } = await openMenu();
    for (const label of [
      "Merchants",
      "Suppliers",
      "PDP Studio",
      "MyAIFitting",
      "Influencers",
      "Shop",
    ]) {
      await user.click(menu.getByRole("tab", { name: label }));
      expect(menu.getAllByRole("tabpanel")).toHaveLength(1);
      expect(menu.getByRole("tabpanel", { name: label })).toBeTruthy();
    }
    expect(menu.queryByRole("link", { name: "Merchant dashboard" })).toBeNull();
    expect(menu.queryByRole("link", { name: "Supplier dashboard" })).toBeNull();
    expect(
      menu.queryByRole("link", { name: "Influencer dashboard" }),
    ).toBeNull();
    expect(
      menu.queryByRole("link", { name: "PDP Studio dashboard" }),
    ).toBeNull();
    expect(menu.getByRole("link", { name: "Outfit canvas" })).toBeTruthy();
    expect(actions.push).not.toHaveBeenCalled();
  });

  it("opens studio links in new tabs without dismissing the selected studio menu", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "PDP Studio" }));
    const studio = within(menu.getByRole("tabpanel", { name: "PDP Studio" }));
    expect(
      studio
        .getByRole("link", { name: "PDP Studio dashboard" })
        .getAttribute("href"),
    ).toBe("/pdp-studio");
    expect(actions.push).not.toHaveBeenCalled();
    const workspace = within(
      studio.getByRole("navigation", { name: "PDP Studio Workspace" }),
    );
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
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Open menu" }),
      ),
    );
  });

  it("closes with Escape without changing the bag", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "Suppliers" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(actions.add).not.toHaveBeenCalled();
    expect(actions.setCartOpen).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Shopping bag with 2 items" }),
    ).toBeTruthy();
  });

  it("hands focus to Search after the menu closes", async () => {
    const { user, menu } = await openMenu();
    await user.click(menu.getByRole("tab", { name: "Merchants" }));
    await user.click(menu.getByRole("button", { name: "Search" }));
    const search = await screen.findByRole("textbox", {
      name: "Search the global shop",
    });
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
    const click = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
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
    expect(
      screen.getByRole("dialog", { name: "PrimeStyleAI site menu" }),
    ).toBeTruthy();
  });

  it("keeps filtered brand link activation in the new-tab flow", async () => {
    const { user, menu } = await openMenu();
    const brand = menu.getByRole("link", { name: "Judy Blue" });
    expectNewTabLink(brand, "/shop/category/women?brand=judy-blue");
    brand.focus();
    await user.keyboard("{Enter}");
    expect(actions.push).not.toHaveBeenCalled();
    expect(menu.getByRole("tabpanel", { name: "Shop" })).toBeTruthy();
  });
});
