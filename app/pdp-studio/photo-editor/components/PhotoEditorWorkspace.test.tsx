import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoEditorWorkspace } from "./PhotoEditorWorkspace";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    <span role={alt ? "img" : undefined} aria-label={alt || undefined} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

describe("PhotoEditorWorkspace", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => ({
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        set strokeStyle(_value: string | CanvasGradient | CanvasPattern) {},
        set fillStyle(_value: string | CanvasGradient | CanvasPattern) {},
        set lineCap(_value: CanvasLineCap) {},
        set lineJoin(_value: CanvasLineJoin) {},
        set lineWidth(_value: number) {},
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens Magic Retouch immediately and keeps the work local", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();

    render(<PhotoEditorWorkspace tool="retouch" />);

    expect(
      screen.getByRole("heading", { name: "Magic Retouch" }),
    ).not.toBeNull();
    expect(
      (screen.getByRole("slider", { name: "Brush size" }) as HTMLInputElement)
        .value,
    ).toBe("44");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("heading", { name: "Magic Retouch" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Retouch" }));
    expect(
      screen.getByRole("heading", { name: "Magic Retouch" }),
    ).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the PhotoRoom-style guided and manual cutout controls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();

    render(<PhotoEditorWorkspace tool="background-remover" />);

    expect(
      screen.queryByRole("heading", { name: "Edit Cutout" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Edit Cutout" }));

    expect(
      screen.getByRole("heading", { name: "Edit Cutout" }),
    ).not.toBeNull();
    expect(
      screen.getByText(
        "Objects are automatically detected to make your life easier!",
      ),
    ).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /manual/i }));
    expect(
      screen.getByText("Use the mouse to erase pixels manually."),
    ).not.toBeNull();
    expect(screen.getByRole("slider", { name: "Brush size" })).not.toBeNull();

    const restore = screen.getByRole("button", { name: "Restore" });
    await user.click(restore);
    expect(restore.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByText("Use the mouse to restore pixels manually."),
    ).not.toBeNull();

    expect(
      screen.getByRole("button", { name: "No cutout" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Original cutout" }),
    ).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("toggles background removal without opening a network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();

    render(<PhotoEditorWorkspace tool="background-remover" />);
    const toggle = screen.getByRole("switch", { name: "Remove background" });

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(
      screen.queryByRole("button", { name: "Edit Cutout" }),
    ).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
