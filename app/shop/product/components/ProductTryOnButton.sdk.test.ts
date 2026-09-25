import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("shop-only SDK release isolation", () => {
  it("pins shop preview separately from the existing base SDK", () => {
    const { dependencies } = JSON.parse(read("package.json"));
    expect(dependencies["@primestyleai/tryon-shop"]).toBe(
      "file:vendor/primestyleai-tryon-5.10.245-preview.9-arc-jacket-v24.tgz",
    );
    expect(dependencies["@primestyleai/tryon"]).toBe("5.10.243");
    const installed = JSON.parse(
      read("node_modules/@primestyleai/tryon-shop/package.json"),
    );
    expect(installed.name).toBe("@primestyleai/tryon");
    expect(installed.version).toBe("5.10.245-preview.9");
  });

  it("ships the photo-first guided demo choreography", () => {
    const bundle = read(
      "node_modules/@primestyleai/tryon-shop/dist/react/index.js",
    );
    expect(bundle).toContain("photo-source");
    expect(bundle).toContain("photo-drag");
    expect(bundle).toContain("photo-drop");
    expect(bundle).toContain("ps-bp-guided-photo-source");
    expect(bundle).toContain("ps-bp-guided-photo-source-enter");
    expect(bundle).toContain("ps-bp-guided-cursor-photo");
    expect(bundle).toContain("bra-region");
    expect(bundle).toContain("bra-band");
    expect(bundle).toContain("bra-cup");
    expect(bundle).toContain("data-guided-demo-locked");
    expect(bundle).toContain('closest(".ps-bp-next-btn")');
    expect(bundle).toContain('return e && i === "photo" && r;');
    expect(bundle).toContain("const SA = Mr(), JA = g,");
  });

  it("ships the staged outfit orbit and body-landmark try-on transitions", () => {
    const bundle = read(
      "node_modules/@primestyleai/tryon-shop/dist/react/index.js",
    );
    expect(bundle).toContain("ps-bp-style-orbit");
    expect(bundle).toContain("ps-bp-style-orbit-product-5");
    expect(bundle).toContain("Building your complete look");
    expect(bundle).toContain("ps-msc-pose-overlay");
    expect(bundle).toContain("Detecting body pose");
    expect(bundle).toContain(
      "nr(Xo(a.photoBase64), { maxLongEdge: 1600 })",
    );
    expect(bundle).not.toContain("Qo(pw)");
    expect(bundle).not.toContain("leftShoulder: { x: 0.39, y: 0.245 }");
  });

  it("ships the readable sizing workspace styles in the installed artifact", () => {
    const bundle = read(
      "node_modules/@primestyleai/tryon-shop/dist/react/index.js",
    );
    expect(bundle.includes("Readable sizing workspace")).toBe(true);
    expect(
      bundle.includes(".ps-tryon-section-card .ps-tryon-sr-card-v2-img"),
    ).toBe(true);
    expect(
      bundle.includes(".ps-bp-photo-screen-men .ps-bp-photo-details-panel"),
    ).toBe(true);
    expect(bundle.includes("background: #2f3330 !important")).toBe(true);
    expect(bundle.includes("border-bottom: 1px solid #c9cdca !important")).toBe(
      true,
    );
    expect(bundle.includes("min-width: 44px !important")).toBe(true);
    expect(bundle.includes("Final phone ergonomics pass")).toBe(true);
    expect(bundle.includes("grid-template-columns: 44px minmax(0, 1fr) 44px")).toBe(
      true,
    );
    const multiSection = read(
      "node_modules/@primestyleai/tryon-shop/dist/react/views/MultiSectionMobile.d.ts",
    );
    expect(multiSection).not.toContain("outfitRecommendationNode");
  });

  it("loads the shop alias on the client without changing the shared resolver", () => {
    const source = read("app/shop/product/components/ProductTryOnButton.tsx");
    expect(source).toContain('import("@primestyleai/tryon-shop/react")');
    expect(source).toContain("ssr: false");
    expect(source).toContain("mapProductSizeGuide(product)");
    expect(source).toContain("sizeGuideData={sizeGuideData}");
    expect(source).not.toContain('"@primestyleai/tryon/react"');
    expect(read("next.config.ts")).not.toContain("@primestyleai/tryon-shop");
  });

  it("routes both Shop PDP variants through the pinned Shop SDK", () => {
    expect(read("app/shop/product/[productId]/page.tsx")).toContain(
      "<ProductDetailExperience",
    );
    expect(
      read(
        "app/shop/ai-stylist/product/[productId]/StylistProductDetailClient.tsx",
      ),
    ).toContain("<ProductDetailExperience");
    expect(
      read("app/shop/product/components/ProductPurchasePanel.tsx"),
    ).toContain('from "./ProductTryOnButton"');

    const files = readdirSync(path.join(root, "app/shop"), {
      recursive: true,
    }) as string[];
    for (const file of files.filter(
      (file) => /\.[jt]sx?$/.test(file) && !file.endsWith(".test.ts"),
    )) {
      expect(read(`app/shop/${file}`)).not.toContain(
        'from "@primestyleai/tryon/react"',
      );
    }
  });

  it("keeps the demo tree free of the shop SDK alias", () => {
    const files = readdirSync(path.join(root, "app/demo"), {
      recursive: true,
    }) as string[];
    for (const file of files.filter((file) => /\.[jt]sx?$/.test(file))) {
      expect(read(`app/demo/${file}`)).not.toContain(
        "@primestyleai/tryon-shop",
      );
    }
    expect(read("app/demo/components/ProductShowcase.tsx")).toContain(
      'from "@primestyleai/tryon/react"',
    );
  });

  it("keeps the mobile Build with AI action in the product flow", () => {
    const css = read("app/shop/product/components/productDetail.module.css");
    expect(css).toMatch(
      /\.tryOnSdkRoot\s*\{[^}]*position:\s*static;[^}]*width:\s*100%;/,
    );
    expect(css).not.toMatch(
      /\.tryOnSdkRoot\s*\{[^}]*position:\s*fixed;[^}]*inset-block-end:\s*0;/,
    );
  });
});
