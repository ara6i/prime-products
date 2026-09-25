// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WearV6PhotoLab } from "./WearV6PhotoLab";

vi.mock("../sizing-lab/lib/poseDetector", () => ({ detectPoseAndMask: vi.fn() }));
vi.mock("./FreshGeometryResult", () => ({ FreshGeometryResult: ({ prediction }: { prediction: { profile: { heightCm: number; weightKg: number } } }) => <output data-testid="aiad-test-result">{prediction.profile.heightCm}/{prediction.profile.weightKg}</output> }));
vi.mock("./AiadPhotoWorkbench", () => ({ AiadPhotoWorkbench: ({ prediction }: { prediction: { profile: { heightCm: number; weightKg: number } } }) => <output data-testid="aiad-test-result">{prediction.profile.heightCm}/{prediction.profile.weightKg}</output> }));
vi.mock("./WearV6Workbench", () => ({ WearV6Workbench: () => null }));
vi.mock("./HeldoutOnnxTrainingVisual", () => ({ HeldoutOnnxTrainingVisual: () => null }));
vi.mock("./FreshSealed448Lab", () => ({ FreshSealed448Lab: () => null }));
vi.mock("./V8Benchmark448Lab", () => ({ V8Benchmark448Lab: () => null }));
vi.mock("./AiadBenchmark448Lab", () => ({ AiadBenchmark448Lab: () => null }));

const imageLoads: Array<{ source: string; finish: () => void }> = [];
const inputs: Array<Record<string, unknown>> = [];
const rows = [
  { setId: "shahnaz-2", label: "Shahnaz 2 test", frontImageUrl: "data:image/png;base64,QQ==", heightCm: 159, weightKg: 84.7, gender: "female", waistCm: 99, hipsCm: 113 },
  { setId: "delaram", label: "Delaram test", frontImageUrl: "data:image/png;base64,Qg==", heightCm: 168, weightKg: 70.8, gender: "female", waistCm: 79, hipsCm: 102 },
];

beforeEach(() => {
  imageLoads.length = 0; inputs.length = 0;
  vi.stubGlobal("Image", class {
    naturalWidth = 1200; naturalHeight = 1600;
    onload: (() => void) | null = null;
    set src(source: string) { imageLoads.push({ source, finish: () => this.onload?.() }); }
  });
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    let value: unknown = { ok: false, models: [] };
    if (url.endsWith("/dataset")) value = { rows };
    if (url.endsWith("/aiad")) {
      value = { ok: true, modelVersion: "aiad-test", referenceSegmenterAvailable: true };
      if (options?.method === "POST") {
        const body = JSON.parse(String(options.body)); inputs.push(body);
        value = { ok: true, model: { version: "aiad-test", sha256: "fixture", sealedTestSubjectsUsed: 0, sdkReady: false }, profile: body, rows: [], inputContract: { notUsedByOnnx: ["old V6/V7 predictions"] } };
      }
    }
    return { ok: true, json: async () => value };
  }));
  vi.stubGlobal("URL", class extends URL { static createObjectURL() { return "blob:test-upload"; } static revokeObjectURL() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function readyInitialPhoto() {
  await waitFor(() => expect(imageLoads).toHaveLength(1));
  await act(async () => imageLoads[0]!.finish());
  await waitFor(() => expect((screen.getByRole("button", { name: "Run Aiad ONNX on this photo" }) as HTMLButtonElement).disabled).toBe(false));
}

describe("Aiad normal-photo selection", () => {
  it("starts uncorrected and requires a new camera choice after changing photos", async () => {
    render(<WearV6PhotoLab initialTab="aiad-photo" />);
    await readyInitialPhoto();
    const camera = screen.getByRole("combobox", { name: "Aiad camera mode" }) as HTMLSelectElement;
    expect(camera.value).toBe("raw");
    fireEvent.change(camera, { target: { value: "apple-depth" } });
    expect(camera.value).toBe("apple-depth");
    fireEvent.change(screen.getAllByRole("combobox")[0]!, { target: { value: "delaram" } });
    expect(camera.value).toBe("raw");
    await act(async () => imageLoads[1]!.finish());
    fireEvent.click(screen.getByRole("button", { name: "Run Aiad ONNX on this photo" }));
    await waitFor(() => expect(screen.getByTestId("aiad-test-result").textContent).toBe("168/70.8"));
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls.some(url => /apple-vision-pose3d|depth-pro-cache|apple-fused-body-scale/.test(url))).toBe(false);
  });

  it("disables Run during photo loading and sends the new profile, never tape checks", async () => {
    render(<WearV6PhotoLab initialTab="aiad-photo" />);
    await readyInitialPhoto();
    fireEvent.change(screen.getAllByRole("combobox")[0]!, { target: { value: "delaram" } });
    expect((screen.getByRole("button", { name: "Run Aiad ONNX on this photo" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => imageLoads[1]!.finish());
    fireEvent.click(screen.getByRole("button", { name: "Run Aiad ONNX on this photo" }));
    await waitFor(() => expect(screen.getByTestId("aiad-test-result").textContent).toBe("168/70.8"));
    expect(inputs).toEqual([{ imageDataUrl: rows[1]!.frontImageUrl, heightCm: 168, weightKg: 70.8, gender: "female" }]);
  });

  it("ignores an older image-load completion after a newer photo was selected", async () => {
    render(<WearV6PhotoLab initialTab="aiad-photo" />);
    await waitFor(() => expect(imageLoads).toHaveLength(1));
    fireEvent.change(screen.getAllByRole("combobox")[0]!, { target: { value: "delaram" } });
    await act(async () => imageLoads[1]!.finish());
    await act(async () => imageLoads[0]!.finish());
    expect((screen.getByRole("spinbutton", { name: "Height · required cm" }) as HTMLInputElement).value).toBe("168");
    expect(screen.getByAltText("Delaram test").getAttribute("src")).toBe(rows[1]!.frontImageUrl);
  });

  it("keeps uploads on the Aiad tab instead of switching to the legacy model", async () => {
    const view = render(<WearV6PhotoLab initialTab="aiad-photo" />);
    await readyInitialPhoto();
    const upload = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(upload, { target: { files: [new File(["fixture"], "front.png", { type: "image/png" })] } });
    await act(async () => imageLoads[1]!.finish());
    expect(screen.getByRole("heading", { name: "Aiad Photo + Line Test" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Run Aiad ONNX on this photo" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("spinbutton", { name: "Natural waist cm" }) as HTMLInputElement).value).toBe("");
  });
});
