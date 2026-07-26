import type { PdpStudioToolDefinition } from "../types";

const ASPECT_RATIOS: Record<string, string> = {
  original: "1:1",
  square: "1:1",
  "portrait-9-16": "9:16",
  "portrait-3-4": "3:4",
  "portrait-2-3": "2:3",
  "landscape-3-2": "3:2",
  "landscape-4-3": "4:3",
  "landscape-16-9": "16:9",
};

export function mapPdpStudioToolOptions(
  tool: PdpStudioToolDefinition,
  selectedOptions: Record<string, string>,
): {
  options: Record<string, unknown>;
  useBrandKit: boolean;
} {
  const options: Record<string, unknown> = Object.fromEntries(
    Object.entries(selectedOptions).map(([label, value]) => [
      camelCase(label),
      value,
    ]),
  );
  const outputSize =
    selectedOptions["Output size"] || selectedOptions.Size || tool.defaultSize;
  const normalizedSize = outputSize
    ?.toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
  if (normalizedSize) {
    options.aspectRatio = ASPECT_RATIOS[normalizedSize] ?? "1:1";
  }
  options.outputCount = tool.outputCount ?? 1;
  return {
    options,
    useBrandKit: Object.values(selectedOptions).includes("use-brand-kit"),
  };
}

function camelCase(value: string): string {
  const words = value
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words
    .map((word, index) =>
      index === 0 ? word : `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`,
    )
    .join("");
}
