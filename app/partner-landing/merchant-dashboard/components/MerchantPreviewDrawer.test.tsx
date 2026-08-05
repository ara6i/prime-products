// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MerchantPreviewDrawer, type MerchantPreviewDrawerContent } from "./MerchantPreviewDrawer";

const content: MerchantPreviewDrawerContent = {
  title: "Review this demo action",
  description: "Nothing leaves the browser.",
  steps: [
    { title: "Review", detail: "Inspect the consequence." },
    { title: "Return", detail: "Close without saving." },
  ],
};

afterEach(() => cleanup());

describe("MerchantPreviewDrawer", () => {
  it("opens as a labelled modal and closes with Escape", async () => {
    const onClose = vi.fn();
    render(<MerchantPreviewDrawer content={content} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: content.title })).toBeTruthy();
    expect(screen.getByText(/no changes will be saved/i)).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps focus and returns focus after the drawer unmounts", async () => {
    const user = userEvent.setup();
    const trigger = document.createElement("button");
    trigger.textContent = "Open preview";
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<MerchantPreviewDrawer content={content} onClose={() => undefined} />);
    const close = await screen.findByRole("button", { name: "Close action preview" });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement).toBe(close);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /return to dashboard/i }));
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /return to dashboard/i }));

    rerender(<MerchantPreviewDrawer content={null} onClose={() => undefined} />);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("closes a demo action without network or persistence writes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<MerchantPreviewDrawer content={content} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /return to dashboard/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
  });
});
