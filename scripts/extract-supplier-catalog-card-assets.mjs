import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const sourcePath = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network/supplier-catalog-veo-fast-source-4k-v1.png",
);
const outputDirectory = path.resolve(
  projectRoot,
  "public/media/partner-landing/merchant-network/supplier-catalog-cards",
);

const cards = [
  {
    id: "satin-dress",
    crop: { left: 2010, top: 800, width: 540, height: 325 },
  },
  {
    id: "red-slingbacks",
    crop: { left: 2580, top: 780, width: 590, height: 340 },
  },
  {
    id: "gold-pendant",
    crop: { left: 3190, top: 760, width: 630, height: 350 },
  },
  {
    id: "tailored-jacket",
    crop: { left: 2100, top: 1130, width: 560, height: 360 },
  },
  {
    id: "cream-trousers",
    crop: { left: 2700, top: 1140, width: 520, height: 350 },
  },
  {
    id: "leather-bag",
    crop: { left: 3290, top: 1120, width: 530, height: 390 },
  },
  {
    id: "black-trousers",
    crop: { left: 2100, top: 1520, width: 560, height: 400 },
  },
  {
    id: "gold-earrings",
    crop: { left: 2600, top: 1520, width: 680, height: 400 },
  },
];

await mkdir(outputDirectory, { recursive: true });

for (const card of cards) {
  const outputPath = path.join(outputDirectory, `${card.id}.png`);
  await sharp(sourcePath)
    .extract(card.crop)
    .resize({
      width: 1000,
      height: 620,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen({ sigma: 0.45, m1: 0.35, m2: 1 })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(path.relative(projectRoot, outputPath));
}
