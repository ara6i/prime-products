import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;

const sources = [
  {
    sourceCollection: "formal-blazers",
    path: "output/reports/mens-ui-matrix-formal-blazers-20260912/index.json",
    key: "formal-blazers",
  },
  {
    sourceCollection: "formal-trousers-sets",
    path: "output/reports/mens-ui-matrix-formal-trousers-20260912/index.json",
    key: "formal-trousers",
  },
  {
    sourceCollection: "local-addon-candidates",
    path: "output/reports/mens-ui-matrix-addon-candidates-20260912/index.json",
    key: null,
  },
];

const decisions = new Map(
  [
    ["shopify_supplier:a901a5561df53711813f6f4920fba6f5de9a1aef", "reject", "Ornate black-and-gold dial, shield mark, and pseudo-luxury detailing read as cheap imitation rather than restrained modern design."],
    ["shopify_supplier:993900d066714bf927a5fb3d3fe25a65bd6a0c1d", "reject", "Octagonal integrated-sport-watch imitation, inconsistent recorded bracelet material versus visible rubber strap, and weak brand treatment fail the product-honesty gate."],
    ["shopify_supplier:7b507e7544d4888f53d46a6759769e663fa4ecca", "accept", "ACC-003", "Use the black leather and warm-gold watch once for a Budget-Friendly Date Night, Party, or Office outfit; keep the clothing light or colored so the look is not dark-dominant."],
    ["shopify_supplier:eab2417fcf27395a8ab1b7e4242ffc21198b2e47", "reject", "Generic all-black metal watch, prominent low-cost branding, and near-duplicate dark styling add no useful modern identity."],
    ["shopify_supplier:545d554e3e9a00f3c0fae6201d8d1f767d8ecc96", "reject", "All-black bracelet and rose-gold-marker treatment is another dark generic business watch and does not justify a unique styling role."],
    ["shopify_supplier:25f0ae396193e56843b28f53ef22cb3376e9c01d", "accept", "BAG-001", "Use the brown crescent crossbody once for Budget-Friendly Casual Everyday, Date Night, Party, or Travel. It is a unisex fashion bag, not an Office, Formal Evening, or Sports bag."],
    ["shopify_supplier:bccc6fbc375fac213aa163545a38b7ab1b336baf", "reject", "Bulky pseudo-luxury case and bracelet, imitation high-end design cues, and weak dial branding fail the restrained-accessory standard."],
    ["shopify_supplier:5b6472bb554b545516e4943c9f074794246079c2", "reject", "Integrated bracelet, oversized faceted bezel, shield logo, and imitation-luxury styling are not credible for the represented price."],
    ["shopify_supplier:fc52c37c5427e19975dc142dac55feb9061b97ab", "reject", "Generic black bracelet watch with conspicuous logo and date plaque duplicates the existing dark-watch role without better finish."],

    ["shopify_supplier:0143de1d39ad250cfd40f75ab789f412c677701b", "reject", "Hanger-only pseudo-blazer image does not prove adult shoulder, chest, sleeve, or body fit; the concealed-button shape reads more like a generic jacket."],
    ["shopify_supplier:8097306928947ab82fd42a0824e85268fcaa1f49", "reject", "Garment-only corduroy blazer has shiny low-cost fabric, dated floral lining, narrow shaping, and no worn proportion proof."],
    ["shopify_supplier:37ebb75d999d6bed30e0f75b206282a29c5cc30f", "reject", "Worn image shows narrow sleeves and a skinny, waist-suppressed corduroy silhouette styled with dated vest-and-denim layering."],
    ["shopify_supplier:52df9594dfcfc3c64a45461eb6517d70e6b747fc", "reject", "Conventional dark garment packshot lacks worn shoulder, sleeve, torso, and length proof; it cannot pass only because the title says classic fit."],
    ["shopify_supplier:51adfaa28712e9a62577a331e38e67fadcb786be", "reject", "On-body light blazer is excessively dropped and oversized through the shoulder and sleeve, with incomplete lower-body proportion proof."],
    ["shopify_supplier:41fc02d030cdc175ea966115713f8acf8241e326", "reject", "Washed denim blazer has a dated narrow waist, decorative lining and hardware, and no credible worn-fit proof."],
    ["shopify_supplier:5d5eb7a403cdcbaab147934e34260021d12d0dba", "accept", "FOR-050", "Use the light khaki relaxed blazer once for Spring or Fall Office, Date Night, or smart Casual. Pair it with a regular top and controlled straight trousers, never a wide or puddled bottom."],
    ["shopify_supplier:6f381e6267f3618cbba0ae257c3e1ec857860f33", "reject", "Full sequin surface, satin shawl lapel, saturated color range, and stage-costume character violate the non-wedding Zara-led brief."],
    ["shopify_supplier:d507d0195688b9042040361ef66313e4ded86cea", "reject", "Dark garment-only blazer is sharply waist-suppressed and lacks worn fit proof; it reproduces the skinny formal silhouette being removed."],
    ["shopify_supplier:fe9e18f37faeca5053396f3fd7f519b39c690521", "reject", "Sequin tailcoat shape and theatrical long back are costume styling, not a modern non-wedding outfit component."],
    ["shopify_supplier:e9b81fc4e01563f7f9da01c8edd95dbe091415c2", "reject", "Abstract scribble print, narrow sleeves, tight torso and visible slim-fit styling fail both the pattern and silhouette gates."],
    ["shopify_supplier:ae42f31958adb49765dd0e3bdfa9253e7ae00054", "reject", "Garment-only casual blazer has no adult fit proof and conventional contrast buttons and lining that read dated rather than clean modern."],
    ["shopify_supplier:af504bcf4622c649685fb8a826bc24a06a6f110a", "reject", "Denim blazer construction, narrow waist and decorative contrast lining look dated; no on-body image proves a modern regular fit."],
    ["shopify_supplier:d543128c28b47087e79b0a045436b65893cdf1a3", "reject", "On-body plaid blazer is visibly tight through sleeves and torso and uses the exact skinny styling direction the user rejected."],
    ["shopify_supplier:d6f43740bbb92716985da24a28a9e8db78ee2374", "reject", "Dark checked packshot lacks adult shoulder, torso, sleeve and length proof; a clean hanger silhouette is not sufficient for approval."],
    ["shopify_supplier:e432fac25e1eec9bb86abd1f4ec7a815a0a5bc3f", "reject", "Dark navy packshot has no worn fit or proportion proof and adds another generic dark blazer without a distinct role."],
    ["shopify_supplier:f722f661decb3d0abced8705cddd40cad64b162d", "reject", "Denim blazer has tight darted shaping, contrast stitching and a dated casual-business hybrid; no worn proof rescues it."],
    ["shopify_supplier:ed4bff6fdaa62995076816a61432d79ae70b36f7", "reject", "Loud printed cuffs and hem, skinny sleeves and novelty contrast make this a costume-like statement rather than restrained Party tailoring."],
    ["shopify_supplier:6b6d643f4b8448629aa9c8de3e5e0c92c1c166d9", "reject", "Faded denim blazer, contrast stitching, three-button front and narrow waist read dated and do not provide a clean modern layer."],
    ["shopify_supplier:aa65922cc6da70e9d45986f32f94c8d063e0a301", "reject", "Velvet blazer is visibly slim through torso and sleeves, uniformly dark, and uses dated contrast pocket trim."],
    ["shopify_supplier:0edc6d8910e83bb80c86ca21153f1f8382418cfd", "reject", "Sequin finish, saturated novelty colors and stage-jacket construction are incompatible with every included non-wedding style board."],
    ["shopify_supplier:8c0ad180faa75e5f929cbca85905da097b405d27", "reject", "Gold-and-silver reversible sequin surface and ornate lapel are theatrical costume details, not modern Party tailoring."],

    ["shopify_supplier:0adf298ea3722b9af98775e792c4360c1035b8b0", "reject", "Complete shirt-and-pants set is misclassified as a standalone bottom; splitting it would misrepresent the sold product, while the full look is too loose for the strict trouser slot."],
    ["shopify_supplier:289cb3c3358f620596e73907d9b756e790f3e57e", "reject", "Hooded shirt-and-pants resort set is not a standalone bottom, and the drawstrings and tourist-beach styling do not solve the tailored-trouser gap."],
    ["shopify_supplier:ee136605b22288c558fe0b8f29b5670e48261ae7", "reject", "Complete shirt-and-pants set is misclassified as a bottom; the worn trouser is also visibly narrow through thigh and ankle."],
    ["shopify_supplier:f5002a31c8faec43fab4ada98a6f6edf895456e8", "reject", "Hanger-only trousers do not prove rise, thigh ease, knee line, worn length, or shoe break, so the straight-fit claim cannot be trusted."],
    ["shopify_supplier:d62bf3364f6321600c6caefa02874d16ec5e2c19", "reject", "Full textured polo-and-pants set cannot be split into a bottom identity, and the very wide leg creates the baggy upper/lower imbalance being removed."],
    ["shopify_supplier:b26ba8d292bc6a679e400992fee43d65e97e9ea0", "reject", "Textured pants are shown only as an isolated product, with no credible rise, thigh, knee, length or drape proof on a person."],
    ["shopify_supplier:15429f81dd127d5987c1150fa5e0d2e046530740", "accept", "FOR-025", "Use the khaki high-rise pleated trouser once for Spring or Summer Office, Date Night, or Formal Evening with a regular top and low-profile shoe."],
    ["shopify_supplier:432a4e593952b41ef7d923e9d351a7bb36f6252a", "reject", "All available images are product-only; side zips and elastic-looking waist are visible, but adult fit, drape and shoe break are not proven."],
    ["shopify_supplier:f426a5651658d1823d4de96048e3ecdbf8abe875", "reject", "Utility-zip trouser is tapered and visibly bunches at knee and ankle, making it neither clean tailoring nor refined activewear."],
    ["shopify_supplier:62d97f1c730596b677f0de4ccbb3bd8cd8f05c83", "reject", "Khaki stretch trouser is close through the thigh and strongly tapers to the ankle, reproducing the skinny-chino problem."],
    ["shopify_supplier:5ee70df61299c873a76cd10ed93b206f97430c23", "accept", "FOR-037", "Use the brown high-rise double-pleat trouser once for Fall or Winter Office, Date Night, or Party with a regular fitted-not-tight top; do not pair it with oversized outerwear."],
    ["shopify_supplier:7ee696d55d117603d65ae3551f473677b11eda9e", "reject", "Dress pant is narrow through thigh and calf and ends in a tight cropped ankle; it is not the controlled straight line required."],
    ["shopify_supplier:36775b09ed8cf6af570dd58f177804a5200ce70c", "accept", "FOR-026", "Use the khaki regular straight trouser once for Office or Date Night. Keep the upper half clean and regular, and use a loafer, derby, or minimal sneaker."],
    ["shopify_supplier:4c1d90dd23491c9cc97274b13ffa10a108758061", "reject", "Full-resolution correction: despite the straight supplier label, the thigh and lower leg are visibly narrow and the long hem bunches on both shoes."],
    ["shopify_supplier:e723a28010613b6e791f05fe3d7a9b719dc30f15", "reject", "Pocket trouser is close through thigh and strongly tapered; cropped framing also prevents reliable full shoe-break judgment."],
    ["shopify_supplier:7e3e6d240bec10146faf621fc96052b2d404886b", "reject", "White trouser is visibly skinny through thigh, knee and calf and therefore fails the user's core silhouette rule."],
    ["shopify_supplier:1684ef13b5e86b7e21848e7ce69f4c19a0503932", "reject", "Shiny embossed texture, isolated product-only imagery and no worn drape proof make this unsuitable for modern tailored outfits."],
  ].map(([identity, status, detail, constraint]) => [
    identity,
    status === "accept"
      ? { status, selectedReviewId: detail, constraints: [constraint] }
      : { status, reason: detail },
  ]),
);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const existingIdentities = new Set(manifest.entries.map((entry) => entry.identity));
const candidates = [];

for (const source of sources) {
  const index = JSON.parse(await readFile(source.path, "utf8"));
  const rows = source.key
    ? index.categories[source.key]
    : Object.values(index.categories).flat();
  const grouped = Map.groupBy(rows, (row) => row.styleRagId ?? row.productId);
  for (const [identity, variants] of grouped.entries()) {
    if (existingIdentities.has(identity)) continue;
    candidates.push({ ...source, identity, variants });
  }
}

const candidateIdentities = new Set(candidates.map((candidate) => candidate.identity));
if (
  candidates.length === 0 &&
  [...decisions.keys()].every((identity) => existingIdentities.has(identity))
) {
  console.log(JSON.stringify({ alreadyApplied: true, decisions: decisions.size }, null, 2));
  process.exit(0);
}
const uncovered = [...candidateIdentities].filter((identity) => !decisions.has(identity));
const extra = [...decisions.keys()].filter((identity) => !candidateIdentities.has(identity));
if (candidates.length !== 48 || uncovered.length || extra.length) {
  throw new Error(
    `Decision coverage mismatch: candidates=${candidates.length}, uncovered=${uncovered.join(",")}, extra=${extra.join(",")}`,
  );
}

const newEntries = candidates.map((candidate) => {
  const decision = decisions.get(candidate.identity);
  const base = {
    identity: candidate.identity,
    sourceCollection: candidate.sourceCollection,
    sourceReviewIds: candidate.variants.map((variant) => variant.reviewId),
    status: decision.status,
  };
  if (decision.status === "accept") {
    const selectedVariant = candidate.variants.find(
      (variant) => variant.reviewId === decision.selectedReviewId,
    );
    if (!selectedVariant) {
      throw new Error(
        `Missing selected review ${decision.selectedReviewId} for ${candidate.identity}`,
      );
    }
    return { ...base, constraints: decision.constraints, selectedVariant };
  }
  return { ...base, reason: decision.reason, selectedVariant: null };
});

manifest.entries.push(...newEntries);

const statusCounts = Object.fromEntries(
  ["reject", "accept", "conditional", "duplicate-existing"].map((status) => [
    status,
    manifest.entries.filter((entry) => entry.status === status).length,
  ]),
);
const uniqueIdentities = new Set(manifest.entries.map((entry) => entry.identity));
const usableIdentities = new Set(
  manifest.entries
    .filter((entry) => entry.status === "accept" || entry.status === "conditional")
    .map((entry) => entry.identity),
);
const collectionCounts = [...new Set(manifest.entries.map((entry) => entry.sourceCollection))]
  .sort()
  .map((sourceCollection) => {
    const entries = manifest.entries.filter(
      (entry) => entry.sourceCollection === sourceCollection,
    );
    return {
      sourceCollection,
      identities: new Set(entries.map((entry) => entry.identity)).size,
      accept: entries.filter((entry) => entry.status === "accept").length,
      conditional: entries.filter((entry) => entry.status === "conditional").length,
      reject: entries.filter((entry) => entry.status === "reject").length,
      duplicateExisting: entries.filter(
        (entry) => entry.status === "duplicate-existing",
      ).length,
    };
  });
const usableGroups = Map.groupBy(
  manifest.entries.filter(
    (entry) => entry.status === "accept" || entry.status === "conditional",
  ),
  (entry) => entry.identity,
);

manifest.generatedAt = new Date().toISOString();
manifest.summary = {
  reviewDecisionRows: manifest.entries.length,
  uniqueIdentitiesReviewed: uniqueIdentities.size,
  usableUniqueIdentities: usableIdentities.size,
  statusCounts,
  collectionCounts,
  duplicateUsableIdentities: [...usableGroups.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([identity, entries]) => ({
      identity,
      rows: entries.map((entry) => ({
        sourceCollection: entry.sourceCollection,
        sourceReviewIds: entry.sourceReviewIds,
        status: entry.status,
      })),
    })),
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const markdownRows = newEntries
  .map((entry) => {
    const variant = entry.selectedVariant;
    const title = variant?.title ?? candidates.find((candidate) => candidate.identity === entry.identity)?.variants[0]?.title ?? "Unknown";
    const detail = entry.status === "accept" ? entry.constraints.join(" ") : entry.reason;
    return `| ${entry.sourceReviewIds.join(", ")} | ${title.replaceAll("|", "\\|")} | **${entry.status}** | ${detail.replaceAll("|", "\\|")} |`;
  })
  .join("\n");

const qa = `# Local Formal Separates and Add-ons — One-by-One Visual QA

Status: complete first-pass visual review of the 48 previously omitted identities. Wedding and Wedding Guest remain excluded.

## Result

- 48 unique identities reviewed from the local blazer, trouser/set, bag, and watch candidate indexes.
- 7 accepted: one bag, one watch, one light relaxed blazer, and four tailored trousers.
- 41 rejected.
- Full sets were rejected when their catalog slot described only a bottom; splitting a sold set would misrepresent product identity.
- Packshot-only blazers and trousers were rejected when adult fit, drape, or proportion could not be judged.
- Sequin, skinny, denim-blazer, imitation-luxury, and heavily tapered products were rejected even when their metadata labels sounded suitable.

## Decisions

| Review IDs | Product | Decision | Visual reason or strict use |
|---|---|---|---|
${markdownRows}

No accepted product in this file is automatically assigned to an outfit. It may be allocated once only after the complete outfit passes season, occasion, budget, palette, and proportion review.
`;

await writeFile(`${reportDirectory}/FORMAL_SEPARATES_ADDONS_ONE_BY_ONE_QA.md`, qa, "utf8");

console.log(
  JSON.stringify(
    {
      added: newEntries.length,
      accepted: newEntries.filter((entry) => entry.status === "accept").length,
      rejected: newEntries.filter((entry) => entry.status === "reject").length,
      summary: manifest.summary,
    },
    null,
    2,
  ),
);
