import { readdirSync, renameSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(
  process.cwd(),
  "public/media/global-shop/arc-jacket-demo-v1/outfits",
);

const files = readdirSync(root, { recursive: true })
  .filter((file) => file.endsWith(".png"))
  .filter((file) => !file.includes("charcoal-pleated-trousers"));

for (const relativePath of files) {
  const source = path.join(root, relativePath);
  const metadata = await sharp(source).metadata();
  if (!metadata.hasAlpha) continue;

  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const greenExcess = green - Math.max(red, blue);
    if (greenExcess <= 2) continue;

    if (greenExcess > 8 && green > 18) {
      const removal = Math.min(1, (greenExcess - 8) / 28);
      data[index + 3] = Math.round(data[index + 3] * (1 - removal));
    }
    data[index + 1] = Math.max(red, blue);
  }

  const cleaned = `${source}.clean.png`;
  await sharp(data, { raw: info }).png().toFile(cleaned);
  renameSync(cleaned, source);
  console.log(`Cleaned ${relativePath}`);
}
