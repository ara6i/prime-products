// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductGallery } from "../../product/components/ProductGallery";
import { mapProductDetail } from "../../product/mappers/productDetail.mapper";
import { brandCatalogData } from "../data/brandCatalog.data";
import { mapBrandCatalogToEditorial } from "../mappers/brandEditorial.mapper";
import { BrandEditorialLanding } from "./BrandEditorialLanding";
import { BrandProductCard } from "./BrandProductCard";

vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a> }));
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} />
) }));
afterEach(cleanup);

describe.each(brandCatalogData)("$name photography links", (catalog) => {
  it("makes every catalog image a link to its matching PDP", () => {
    const { container } = render(<>{catalog.products.map((product) => <BrandProductCard key={product.id} product={product} />)}</>);
    for (const product of catalog.products) {
      const card = container.querySelector<HTMLElement>(`[data-product-id="${product.id}"]`)!;
      const link = within(card).getByRole("link", { name: `View ${product.name}` });
      expect(link.getAttribute("href")).toBe(`/shop/product/${product.id}`);
      expect(link.querySelector("img")?.getAttribute("src")).toBe(product.image);
    }
    expect(screen.getAllByText("AI-generated preview")).toHaveLength(8);
  });

  it("shows each just-dropped product's own image inside its PDP link", () => {
    const { container } = render(<BrandEditorialLanding viewModel={mapBrandCatalogToEditorial(catalog)} activeCategories={[]} onCategorySelect={vi.fn()} />);
    const section = container.querySelector(`[aria-label="${catalog.name} just dropped collection"]`)!;
    const links = section.querySelectorAll("a");
    expect(links).toHaveLength(4);
    catalog.products.slice(0, 4).forEach((product, index) => {
      expect(links[index].getAttribute("href")).toBe(`/shop/product/${product.id}`);
      expect(links[index].querySelector("img")?.getAttribute("src")).toBe(product.image);
    });
    expect(section.textContent).toContain("AI-generated preview");
  });
});

describe.each([false, true])("Brand PDP gallery (mobile: %s)", (mobile) => {
  it("switches between the generated preview and original supplier photo", async () => {
    const product = mapProductDetail({ kind: "brand", catalog: brandCatalogData[0], productIndex: 0 });
    function GalleryHarness() {
      const [index, setIndex] = useState(0);
      return <ProductGallery items={product.gallery} activeIndex={index} onSelect={setIndex} mobile={mobile} />;
    }
    const user = userEvent.setup();
    render(<GalleryHarness />);
    expect(screen.getByText("AI-generated catalog preview")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Show product view 2" }));
    expect(screen.getByAltText(product.gallery[1].alt).getAttribute("src")).toBe(product.gallery[1].src);
    expect(screen.getByText("Original supplier photo")).toBeTruthy();
    expect(screen.getByText("2 / 2")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Show product view 1" }));
    expect(screen.getByAltText(product.gallery[0].alt).getAttribute("src")).toBe(product.gallery[0].src);
    expect(screen.getByText("AI-generated catalog preview")).toBeTruthy();
  });
});
