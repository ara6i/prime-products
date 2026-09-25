// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductShopHeader } from "./ProductShopHeader";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

afterEach(() => cleanup());

describe("ProductShopHeader", () => {
  it("uses the landing brand and handbag without PDP navigation or account actions", async () => {
    const onOpenBag = vi.fn();
    const user = userEvent.setup();
    render(<ProductShopHeader bagCount={2} onOpenBag={onOpenBag} />);

    const home = screen.getByRole("link", {
      name: "PrimeStyleAI shop home",
    });
    expect(home.getAttribute("href")).toBe("/shop");
    expect(screen.getByAltText("PrimeStyleAI").getAttribute("src")).toBe(
      "/media/partner-landing/primestyleai-commerce-gateway-mark.png",
    );
    expect(screen.getByText("Global shop")).toBeTruthy();
    expect(screen.queryByText("Global delivery")).toBeNull();
    expect(
      screen.queryByText("Free network shipping on orders over $150"),
    ).toBeNull();
    expect(screen.queryByText("USD · EN")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Search the shop" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Your account" })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Shopping bag with 2 items" }),
    );
    expect(onOpenBag).toHaveBeenCalledOnce();
  });
});
