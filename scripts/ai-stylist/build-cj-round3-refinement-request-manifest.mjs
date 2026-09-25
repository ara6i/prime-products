#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const decisionsPath = path.join(
  reportRoot,
  "cj-manual-round3/refinement-input-decisions.json",
);
const outputDir = path.join(reportRoot, "cj-manual-round3/refinement-request-manifest");
const outputPath = path.join(outputDir, "request-manifest.json");

const prompts = {
  "2505011511051624200":
    "Create one source-faithful ecommerce catalog image of the exact BEIGE-APRICOT TROUSER shown in the supplied same-product worn views. Remove the model and scene, then show one empty garment from a straight front view with the complete waistband and both complete cuffed hems visible. Preserve the high rise, side-adjuster construction, double forward pleats, zip fly, clean center creases, controlled straight leg, restrained turn-up cuffs, warm beige-apricot color and subtle woven surface. Keep the source proportions exactly; do not make the leg wider, baggier, skinnier, more tapered, longer or shorter. Do not invent a belt, elastic waist, drawstring, cargo pocket, logo or different fabric. Center exactly one trouser on pure white with no person, shirt, skin, hands, shoes, socks, furniture, floor, text, border, inset or collage.",
  "2411220605581601700":
    "Create one source-faithful ecommerce catalog image of the exact WARM-WHITE ECRU TROUSER shown in the supplied same-product views. Remove the model and room, then show one empty garment from a straight front view with the full waistband and both complete hems visible. Preserve the high waist, metal side adjusters, double forward pleats, zip fly, center creases, controlled straight-to-gentle-taper leg and neat turn-up cuffs. Preserve the warm ecru color rather than changing it to optic white or beige. Keep the exact source silhouette; do not widen, balloon, puddle, slim, crop or redesign it. Do not add a belt, elastic waist, drawstring, cargo pockets, branding or decorative hardware. Return exactly one complete trouser centered on pure white with no body, shirt, hands, skin, socks, shoes, room, furniture, floor, text, panel or collage.",
  "2501050331241615900":
    "Create one source-faithful ecommerce catalog image of the exact DEEP GARNET-BURGUNDY LONG-SLEEVE KNIT POLO shown in the supplied same-product views. Remove the model and background, then show one empty front-facing garment with the complete collar, shoulders, sleeves, cuffs, torso and hem visible. Preserve the soft fine-knit texture, flat pointed collar, clean three-button placket, natural shoulder, controlled regular-fit body, tidy sleeves, ribbed cuffs, ribbed straight hem and exact purplish-red garnet color. Do not make it skin-tight, oversized, cropped, black, navy, bright red or shiny. Do not add a logo, neck label, pocket, zipper, pattern, extra buttons or layered shirt. Return exactly one complete polo centered on pure white with no person, head, hands, trousers, watch, text, border, inset or collage.",
  "2505230551031610500":
    "Create one source-faithful ecommerce catalog image of the exact WARM WINTER-CREAM TROUSER shown in the supplied same-product views. Remove the model and room, then show one empty garment from a straight front view with the full waistband and both complete hems visible. Preserve the higher waist, side-tab and button details, double forward pleats, zip fly, center creases, controlled thigh ease, full straight leg, restrained hem width and exact apricot-cream color. Preserve the source polyester construction honestly; do not imply wool texture. Do not widen it into a baggy trouser, narrow it into a skinny trouser, add pooling, crop it, recolor it or invent a belt, elastic waist, drawstring, cargo pocket or logo. Return exactly one complete trouser centered on pure white with no person, shirt, hands, skin, shoes, socks, floor, wall, text, border or collage.",
  "2411231226141608400":
    "Create one source-faithful ecommerce catalog image of the exact WARM ECRU-BEIGE CORDUROY TROUSER shown in the supplied same-product views. Remove the model and room, then show one empty garment from a straight front view with the complete waistband and both complete cuffed hems visible. Preserve the visible vertical corduroy ribs, high waist, side-tab waistband, two forward pleats, zip fly, controlled cropped straight-to-gentle-taper leg, clean turn-up cuffs and warm ecru-beige color. Keep the exact source proportions; do not make it ballooned, puddled, wide-leg, skinny, longer or shorter. Do not invent an elastic waist, drawstring, cargo pocket, belt, logo or different fabric. Return exactly one complete trouser centered on pure white with no body, top, hands, watch, socks, shoes, chair, floor, text, border, inset or collage.",
  "2503090742561613600":
    "Create one source-faithful ecommerce catalog image of the exact NEW YEAR RED LONG-SLEEVE KNIT POLO SWEATER shown in the supplied same-product views. Remove the wooden hanger, white collared under-shirt, watch, wallet, shadows and background, then show one empty front-facing garment with the complete collar, shoulders, sleeves, cuffs, torso and hem visible. Preserve the vivid festive-red color, soft fine-knit surface, flat pointed collar, clean three-button placket, natural shoulder, controlled regular body, tidy sleeves, ribbed cuffs and straight ribbed hem. Do not claim or simulate an unproved wool fiber, and do not make it skin-tight, oversized, cropped, black, burgundy, orange, shiny or textured like fleece. Do not add a neck label, logo, pocket, zipper, pattern, extra buttons or layered shirt. Return exactly one complete polo centered on pure white with no hanger, shirt, person, hand, watch, wallet, trousers, room, text, border, inset or collage.",
  "2406151325001600000":
    "Create one source-faithful ecommerce catalog image of the exact BROWN COWHIDE-SUEDE PENNY LOAFER shown in the supplied same-product views. Show one complete matching pair at a clean three-quarter front angle. Preserve the matte tobacco-brown suede finish, softly rounded moc toe, apron seam, penny strap with narrow slot, restrained contrast stitching, low stacked heel, slim warm-tan welt and rubber sole, and the exact source proportions. Keep it a smart-casual loafer; do not turn it into a sneaker, glossy dress shoe, pointed loafer, platform, chunky work shoe or driver. Do not recolor it black, tan, orange or burgundy, and do not add branding, tassels, metal hardware or decorative panels. Return exactly one complete pair centered on pure white with no shoe trees, feet, socks, trousers, furniture, floor, text, border, inset or collage.",
  "2504061001411614200":
    "Create one source-faithful ecommerce catalog image of the exact MUTED SAGE-KHAKI WAXED-CANVAS WEEKENDER shown in the supplied same-product views. Show one complete bag in a clean three-quarter front view. Preserve the softly structured rectangular body, desaturated sage-khaki waxed-canvas color, brown leather-look twin handles and reinforcing bands, dark top zipper, side rings, detachable shoulder strap hardware, side zip compartment, stitching, folds and realistic material texture. Keep the material claim honest: do not turn the canvas body or brown trim into glossy luxury leather. Do not recolor it tan, gray, black or saturated army green; do not add branding, monograms, metal plaques, extra pockets or fake-luxury hardware. Return exactly one complete bag centered on pure white with no person, clothing, luggage contents, shoe, room, floor, text, border, inset or collage.",
  "1383428002322452480":
    "Create one source-faithful ecommerce catalog image of the exact RUST-ORANGE AND SLATE-BLUE COLOR-BLOCK CORDUROY SHACKET shown in the supplied product-only views. Remove the wooden hanger, white under-shirt, cast shadow and background, then show one empty front-facing garment with the complete collar, shoulders, sleeves, cuffs, placket, pocket and curved hem visible. Preserve the asymmetrical color-block construction exactly: rust-orange wearer-right body and sleeve, slate-blue wearer-left body and sleeve, rust-orange chest pocket, white four-hole buttons, fine vertical corduroy wale, regular shoulder and controlled regular body. Do not mirror the colors, recolor either panel, make it oversized, cropped, skinny, longer, shorter or turn it into a bomber. Do not add or remove pockets, logos, zippers, lining, drawstrings or decorative trim. Return exactly one complete shacket centered on pure white with no hanger, T-shirt, person, hand, trousers, room, text, border, inset or collage.",
  "1433745735815401472":
    "Create one source-faithful ecommerce catalog image of the exact ARMY-GREEN SHORT UTILITY FIELD JACKET shown in the supplied selected-variant source. Remove the wearer, phone, jewelry, black under-shirt, trousers, store and background, then show one empty front-facing jacket with the complete collar, shoulders, sleeves, cuffs, snap placket, four front utility pockets, sleeve pocket and straight hem visible. Preserve the muted army-green cotton-look surface, regular-relaxed short body, natural shoulder, black snaps, pocket flap shapes, seam placement and the small black rectangular lower-front textile patch without inventing readable brand text. Do not make it oversized, long, cropped, skinny, military-tactical, glossy or padded. Do not recolor it black or khaki and do not borrow any construction from the unrelated track jackets present on the supplier page. Return exactly one complete jacket centered on pure white with no person, skin, phone, chain, shirt, trousers, shop, rack, text, border, inset or collage.",
};

const sourceLabels = {
  "2505011511051624200": [
    "Primary full worn front: use for exact warm beige-apricot color, waistband, pleats, leg width and cuffs; exclude the wearer and room.",
    "Backup same-product worn view: use only to confirm construction and color family; exclude the wearer and room.",
  ],
  "2411220605581601700": [
    "Primary complete warm-ecru front: use for waistband, side adjusters, pleats, controlled leg and cuff construction; exclude the wearer and room.",
    "Backup same-product view: use only to confirm color and silhouette; exclude the wearer and room.",
    "Backup same-product view: use only to confirm color and construction; exclude the wearer and room.",
  ],
  "2501050331241615900": [
    "Primary complete worn front: use for exact garnet color, collar, placket, sleeve, cuff, body and hem; exclude the wearer and trousers.",
    "Backup same-product worn view: use only to confirm silhouette and knit behavior; exclude the wearer and scene.",
    "Backup folded product view: use only to confirm collar and knit detail; exclude labels and unrelated garments.",
  ],
  "2505230551031610500": [
    "Primary complete winter-cream worn front: use for waistband, pleats, full straight leg, hem and color; exclude the wearer and room.",
    "Backup same-product view: use only to confirm construction and selected color; exclude the wearer and room.",
    "Backup same-product detail: use only to confirm waistband and pleat construction; exclude the wearer and other garments.",
  ],
  "2411231226141608400": [
    "Primary complete beige corduroy worn front: use for rib texture, waistband, pleats, leg and cuffs; exclude the wearer and room.",
    "Backup same-product worn front: use only to confirm full silhouette and construction; exclude the wearer and room.",
    "Backup same-product detail: use only to confirm waistband and corduroy rib texture; exclude the wearer and scene.",
  ],
  "2503090742561613600": [
    "Primary complete New Year Red product view: use for the exact color, collar, placket, controlled body, sleeves, cuffs and hem; remove the hanger, white shirt, watch, wallet and background.",
    "Exact selected-color close-up: use only to preserve the collar, three buttons, cuff ribbing and knit surface; remove the white shirt and background.",
  ],
  "2406151325001600000": [
    "Primary isolated selected Brown pair: use for exact tobacco-brown suede finish, round moc toe, penny strap, stitching, welt, heel and sole.",
    "Backup same-product Brown proof: use only to confirm the complete construction, side profile and worn scale; exclude the shoe trees, feet, socks and scene.",
  ],
  "2504061001411614200": [
    "Primary isolated Army Green supplier variant: use for exact visible color, front shape, handles, trim, zipper and folds.",
    "Backup same-product Army Green views: use only to confirm structure and selected color.",
    "Backup same-product hardware view: use only to confirm handle, ring and strap construction.",
  ],
  "1383428002322452480": [
    "Primary product-only front: use for exact color-block layout, complete silhouette, pocket, buttons, cuffs and curved hem; remove the hanger and white under-shirt.",
    "Same-variant close-up: use only to preserve the fine corduroy wale, white buttons and rust/slate color boundary.",
  ],
  "1433745735815401472": [
    "Only approved selected-variant source: use for the exact army-green color, short regular-relaxed body, snap placket, four utility pockets, sleeve pocket, cuffs and hem; remove the wearer, phone and shop.",
  ],
};

const refinementPriority = {
  "2505011511051624200": {
    group: "A",
    priority: 1,
    rationale:
      "This trouser already passes beside S189's accepted sunset-orange shirt as a two-piece Summer Date garment core; the unique shoe and add-ons remain open.",
  },
  "2501050331241615900": {
    group: "A",
    priority: 1,
    rationale:
      "This garnet polo and the winter-cream trouser already pass together as S177's two-piece Winter Formal garment core; four unique supporting roles remain open.",
  },
  "2505230551031610500": {
    group: "A",
    priority: 1,
    rationale:
      "This winter-cream trouser and the garnet polo already pass together as S177's two-piece Winter Formal garment core; four unique supporting roles remain open.",
  },
  "2411220605581601700": {
    group: "B",
    priority: 2,
    rationale:
      "This is an individual S201 bottom pass only; the dusty-rose top, unique shoe and remaining add-ons are not yet visually resolved.",
  },
  "2411231226141608400": {
    group: "A",
    priority: 1,
    rationale:
      "This beige corduroy trouser, the New Year Red knit polo and the Brown cowhide-suede loafer pass together as S213's festive Winter Party three-piece source core; outerwear, bag and accessory remain open.",
  },
  "2503090742561613600": {
    group: "A",
    priority: 1,
    rationale:
      "This New Year Red knit polo, the beige corduroy trouser and the Brown cowhide-suede loafer pass together as S213's festive Winter Party three-piece source core; outerwear, bag and accessory remain open.",
  },
  "2406151325001600000": {
    group: "A",
    priority: 1,
    rationale:
      "This Brown cowhide-suede loafer completes S213's source-level three-piece core with the New Year Red knit polo and beige corduroy trouser; outerwear, bag and accessory remain open.",
  },
  "2504061001411614200": {
    group: "B",
    priority: 2,
    rationale:
      "This is an individual S257 bag pass only; it must be judged beside the final unique garments and shoe before outfit approval.",
  },
  "1383428002322452480": {
    group: "C",
    priority: 3,
    rationale:
      "This brighter Fall outerwear identity passes source QA but remains unassigned until a complete six-role scenario board proves the palette and proportions.",
  },
  "1433745735815401472": {
    group: "C",
    priority: 3,
    rationale:
      "This modern utility outerwear identity passes source QA but remains unassigned until a complete casual or travel board proves the season, budget and palette.",
  },
};

const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
if (decisions.products.length !== 9) {
  throw new Error(`Expected 9 refinement-ready products, found ${decisions.products.length}`);
}

const mimeTypeFor = (sourcePath) => {
  const extension = path.extname(sourcePath).toLowerCase();
  if (extension === ".webp") return "image/webp";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  throw new Error(`Unsupported source image type: ${sourcePath}`);
};

let estimatedInlineBytes = 0;
const requests = [];
for (const [index, product] of decisions.products.entries()) {
  if (!prompts[product.productId]) {
    throw new Error(`Missing identity-specific prompt for ${product.productId}`);
  }
  const relativeSources = [product.bestRefinementInput, ...product.backupInputs];
  const labels = sourceLabels[product.productId];
  if (!labels || labels.length !== relativeSources.length) {
    throw new Error(`Source-label mismatch for ${product.productId}`);
  }
  const sources = [];
  for (const [sourceIndex, relativePath] of relativeSources.entries()) {
    const absolutePath = path.join(reportRoot, relativePath);
    const bytes = (await stat(absolutePath)).size;
    const sha256 = createHash("sha256")
      .update(await readFile(absolutePath))
      .digest("hex");
    estimatedInlineBytes += bytes;
    sources.push({
      localPath: path.relative(repoRoot, absolutePath),
      mimeType: mimeTypeFor(relativePath),
      bytes,
      sha256,
      label: labels[sourceIndex],
    });
  }
  requests.push({
    index: index + 1,
    queueId: product.queueId,
    scenarioId: product.scenarioId,
    productId: product.productId,
    identity: product.identity,
    sku: product.selectedSku,
    title: product.title,
    garmentType: product.category,
    color: product.selectedColor,
    refinementGroup: refinementPriority[product.productId].group,
    refinementPriority: refinementPriority[product.productId].priority,
    refinementRationale: refinementPriority[product.productId].rationale,
    prompt: prompts[product.productId],
    sources,
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  status: "prepared-local-not-authorized-not-submitted",
  provider: "Google Gemini",
  model: "gemini-3-pro-image-preview",
  authorizationRequiredBeforeSubmission: true,
  requestCount: requests.length,
  distinctProductIdentities: new Set(requests.map((request) => request.identity)).size,
  priorityGroupCounts: Object.fromEntries(
    ["A", "B", "C"].map((group) => [
      group,
      requests.filter((request) => request.refinementGroup === group).length,
    ]),
  ),
  estimatedInlineBytes,
  rules: [
    "Use only the supplied exact-product sources for each request.",
    "Preserve identity, selected color, material, seams, closures and source silhouette.",
    "Do not widen, taper, crop, recolor, brand or otherwise redesign a garment.",
    "Generate one complete product on pure white; background removal remains a later separate gate.",
    "Do not submit without explicit user authorization for this prepared batch.",
  ],
  requests,
};

if (manifest.requestCount !== manifest.distinctProductIdentities) {
  throw new Error("The refinement manifest contains a repeated product identity");
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      outputPath,
      status: manifest.status,
      requestCount: manifest.requestCount,
      distinctProductIdentities: manifest.distinctProductIdentities,
      estimatedInlineBytes: manifest.estimatedInlineBytes,
    },
    null,
    2,
  ),
);
