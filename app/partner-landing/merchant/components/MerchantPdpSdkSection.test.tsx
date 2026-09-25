// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MerchantPdpSdkSection } from "./MerchantPdpSdkSection";

const sdk = vi.hoisted(() => ({
  props: null as null | Record<string, unknown>,
}));

vi.mock("@primestyleai/tryon-shop/react", () => ({
  PrimeStyleTryon: (props: Record<string, unknown>) => {
    sdk.props = props;
    return <button type="button">{String(props.buttonText)}</button>;
  },
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

afterEach(() => {
  cleanup();
  sdk.props = null;
});

describe("Arc Jacket SDK wiring", () => {
  it("introduces the fitting experience above the product layout", async () => {
    render(<MerchantPdpSdkSection productUrl="/shop#ai-fitting" />);

    expect(
      screen.getByRole("heading", {
        name: "Try it. Size it. Style the whole look.",
      }),
    ).toBeTruthy();
    expect(screen.getByText("See a demo!")).toBeTruthy();
    expect(
      screen.getByLabelText("See the Arc Jacket AI fitting demo below"),
    ).toBeTruthy();
    expect(
      await screen.findByRole("button", { name: "Find my size & try it on" }),
    ).toBeTruthy();
  });

  it("keeps colour selection in the product controls without the old footer", async () => {
    render(<MerchantPdpSdkSection productUrl="/shop#ai-fitting" />);

    await waitFor(() => expect(sdk.props).not.toBeNull());

    expect(screen.getByText("Cobalt")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /previous colour/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /next colour/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /add to bag/i })).toBeNull();
    expect(screen.queryByText("Added to bag")).toBeNull();
    expect(screen.queryByText("01 / 05")).toBeNull();
    expect(sdk.props).not.toHaveProperty("addToBagLabel");
    expect(sdk.props).not.toHaveProperty("onAddToBag");
  });

  it.each([
    ["Cobalt", "cobalt"],
    ["Coral", "coral"],
    ["Butter", "butter"],
    ["Mint", "mint"],
    ["Lilac", "lilac"],
  ])(
    "sends only the selected %s garment to the Shop SDK",
    async (name, slug) => {
      const user = userEvent.setup();
      render(<MerchantPdpSdkSection productUrl="/shop#ai-fitting" />);

      await user.click(screen.getByRole("button", { name: `Select ${name}` }));

      const image = `/media/partner-landing/merchant-network/studio-jacket-${slug}.png`;
      await waitFor(() =>
        expect(sdk.props).toEqual(
          expect.objectContaining({
            productId: `merchant-arc-jacket-${slug}`,
            productImage: image,
            productImages: [image],
            garmentReferenceImage: image,
            garmentDetailImage: image,
            productTitle: `Arc Jacket — ${name}`,
            productUrl: "/shop#ai-fitting",
          }),
        ),
      );
    },
  );

  it("configures the Arc Jacket as menswear with five replaceable options per category", async () => {
    render(<MerchantPdpSdkSection productUrl="/shop#ai-fitting" />);

    await waitFor(() => expect(sdk.props).not.toBeNull());

    expect(sdk.props).toEqual(
      expect.objectContaining({
        productCategory: "Men's jackets",
        productGender: "male",
        outfitBuilderSource: "ai-stylist",
        guidedDemoAutoplay: true,
        usePresetProfileOnly: true,
        showHeaderControls: false,
        presetProfile: expect.objectContaining({
          id: "arc-jacket-demo-model",
          gender: "male",
          photoUrl: "/media/global-shop/arc-jacket-demo-v2/model-source.png",
          height: 180,
          weight: 78,
          heightUnit: "cm",
          weightUnit: "kg",
        }),
      }),
    );

    const looks = sdk.props?.instantOutfitLooks as Array<{
      id: string;
      label?: string;
      items: Array<{ slot: string; image: string }>;
    }>;

    expect(looks).toHaveLength(5);
    expect(looks.map((look) => look.label)).toEqual([
      "Concrete Layer",
      "Night Transit",
      "Ice Signal",
      "Shadow Hardware",
      "Studio Track",
    ]);
    expect(
      looks.every(
        (look) =>
          look.items.map((item) => item.slot).join(",") ===
          "top,bottom,shoe,accessory",
      ),
    ).toBe(true);
    expect(looks.flatMap((look) => look.items)).toHaveLength(20);
    expect(
      looks.every((look) =>
        look.items.some(
          (item) =>
            item.slot === "accessory" && item.image.includes("sunglasses"),
        ),
      ),
    ).toBe(true);
    expect(
      looks
        .flatMap((look) => look.items)
        .every((item) =>
          item.image.startsWith(
            "/media/global-shop/arc-jacket-demo-v2/outfits/",
          ),
        ),
    ).toBe(true);

    const results = sdk.props?.instantOutfitResults as Array<{
      lookId: string;
      image: string;
      recommendedSize: string;
    }>;
    expect(results).toHaveLength(5);
    expect(results.every((result) => result.recommendedSize === "M")).toBe(
      true,
    );
    expect(
      results.every((result) =>
        result.image.startsWith(
          "/media/global-shop/arc-jacket-demo-v2/results/cobalt/",
        ),
      ),
    ).toBe(true);
    expect(results.map((result) => result.lookId)).toEqual(
      looks.map((look) => look.id),
    );
  });

  it.each([
    ["Cobalt", "cobalt"],
    ["Coral", "coral"],
    ["Butter", "butter"],
    ["Mint", "mint"],
    ["Lilac", "lilac"],
  ])("uses the raw upload photo with prepared %s outfit results", async (name, slug) => {
    const user = userEvent.setup();
    render(<MerchantPdpSdkSection productUrl="/shop#ai-fitting" />);

    await user.click(screen.getByRole("button", { name: `Select ${name}` }));

    await waitFor(() =>
      expect(sdk.props?.presetProfile).toEqual(
        expect.objectContaining({
          photoUrl: "/media/global-shop/arc-jacket-demo-v2/model-source.png",
        }),
      ),
    );

    const results = sdk.props?.instantOutfitResults as Array<{ image: string }>;
    expect(results).toHaveLength(5);
    expect(
      results.every((result) =>
        result.image.startsWith(
          `/media/global-shop/arc-jacket-demo-v2/results/${slug}/`,
        ),
      ),
    ).toBe(true);
  });
});
