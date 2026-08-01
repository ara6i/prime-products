import { access, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  AI_BACKGROUND_PRESETS,
  AI_BACKGROUND_UNIQUE_ASSETS,
} from "../app/pdp-studio/ai-backgrounds/data/aiBackgroundPresets";
import { AI_BACKGROUND_ASSET_MANIFEST } from "../app/pdp-studio/ai-backgrounds/data/aiBackgroundAssetManifest";

const EXPECTED_SLOTS = 160;
const EXPECTED_UNIQUE_ASSETS = 152;
const STRICT = process.argv.includes("--strict");
const ASSET_DIRECTORY = path.resolve(
  process.cwd(),
  "public/images/pdp-studio/background-presets",
);

async function main(): Promise<void> {
  const errors: string[] = [];
  if (AI_BACKGROUND_PRESETS.length !== EXPECTED_SLOTS) {
    errors.push(
      `Expected ${EXPECTED_SLOTS} preset slots, found ${AI_BACKGROUND_PRESETS.length}.`,
    );
  }
  if (AI_BACKGROUND_UNIQUE_ASSETS.length !== EXPECTED_UNIQUE_ASSETS) {
    errors.push(
      `Expected ${EXPECTED_UNIQUE_ASSETS} unique assets, found ${AI_BACKGROUND_UNIQUE_ASSETS.length}.`,
    );
  }
  if (AI_BACKGROUND_ASSET_MANIFEST.length !== EXPECTED_UNIQUE_ASSETS) {
    errors.push(
      `Manifest has ${AI_BACKGROUND_ASSET_MANIFEST.length} rows instead of ${EXPECTED_UNIQUE_ASSETS}.`,
    );
  }

  const filenames = new Set<string>();
  const entriesToValidate = STRICT
    ? AI_BACKGROUND_ASSET_MANIFEST
    : AI_BACKGROUND_ASSET_MANIFEST.filter(
        (entry) => entry.integration === "integrated",
      );
  if (!STRICT && entriesToValidate.length < 3) {
    errors.push(
      `Expected at least 3 integrated starter assets, found ${entriesToValidate.length}.`,
    );
  }

  for (const entry of entriesToValidate) {
    if (filenames.has(entry.filename)) {
      errors.push(`Duplicate filename: ${entry.filename}`);
      continue;
    }
    filenames.add(entry.filename);
    if (!entry.prompt.trim()) errors.push(`Missing prompt: ${entry.filename}`);
    const filePath = path.join(ASSET_DIRECTORY, entry.filename);
    try {
      await access(filePath);
      const [metadata, fileStat] = await Promise.all([
        sharp(filePath).metadata(),
        stat(filePath),
      ]);
      if (
        (metadata.width ?? 0) < entry.minimumWidth ||
        (metadata.height ?? 0) < entry.minimumHeight
      ) {
        errors.push(
          `${entry.filename} is ${metadata.width ?? 0}×${metadata.height ?? 0}; minimum is ${entry.minimumWidth}×${entry.minimumHeight}.`,
        );
      }
      if (fileStat.size < 24_000) {
        errors.push(`${entry.filename} is suspiciously small (${fileStat.size} bytes).`);
      }
    } catch {
      errors.push(`Missing or unreadable asset: ${entry.filename}`);
    }
  }

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(
    STRICT
      ? `Validated ${AI_BACKGROUND_PRESETS.length} slots and all ${AI_BACKGROUND_UNIQUE_ASSETS.length} original background assets.`
      : `Validated ${entriesToValidate.length} integrated starter assets; the ${AI_BACKGROUND_PRESETS.length}-slot future catalog remains registered.`,
  );
}

void main();
