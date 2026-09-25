#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const audit = JSON.parse(
  await readFile(path.join(reportRoot, "mens-family-role-blueprint-audit/audit.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "mens-separates-family-completions");
const outputJsonPath = path.join(outputDir, "completions.json");
const outputMarkdownPath = path.join(outputDir, "COMPLETIONS.md");

const budgets = ["Budget-Friendly", "Mid-Range", "Premium", "Luxury"];
const occasions = [
  "Casual Everyday",
  "Work / Office",
  "Formal Evening",
  "Date Night",
  "Party / Night Out",
  "Sports / Workout",
  "Travel",
  "Vacation / Resort",
];

const seasonPalettes = {
  Spring: [
    { primary: "sky blue", neutral: "warm ecru", leather: "cognac", accent: "soft coral" },
    { primary: "soft sage", neutral: "pale stone", leather: "tobacco", accent: "apricot" },
    { primary: "dusty lilac", neutral: "warm gray", leather: "oxblood", accent: "pale lemon" },
    { primary: "soft coral", neutral: "oatmeal", leather: "dark olive", accent: "powder blue" },
    { primary: "clean cobalt", neutral: "cream", leather: "caramel", accent: "fresh sage" },
    { primary: "dusty rose", neutral: "sand", leather: "burgundy", accent: "pale aqua" },
    { primary: "mineral blue", neutral: "pale khaki", leather: "dark brown", accent: "warm orange" },
    { primary: "pistachio", neutral: "ivory", leather: "chestnut", accent: "soft lilac" },
  ],
  Summer: [
    { primary: "washed aqua", neutral: "warm ivory", leather: "tobacco", accent: "soft coral" },
    { primary: "apricot", neutral: "sand", leather: "cognac", accent: "powder blue" },
    { primary: "pale lemon", neutral: "ecru", leather: "caramel", accent: "fresh sage" },
    { primary: "turquoise", neutral: "stone", leather: "dark brown", accent: "soft coral" },
    { primary: "terracotta", neutral: "cream", leather: "warm tan", accent: "pale aqua" },
    { primary: "sky blue", neutral: "oatmeal", leather: "olive", accent: "apricot" },
    { primary: "soft mint", neutral: "warm gray", leather: "cognac", accent: "pale lemon" },
    { primary: "coral", neutral: "sand", leather: "tobacco", accent: "washed teal" },
  ],
  Fall: [
    { primary: "paprika", neutral: "pale stone", leather: "cognac", accent: "petrol blue" },
    { primary: "petrol blue", neutral: "camel", leather: "oxblood", accent: "ochre" },
    { primary: "muted burgundy", neutral: "ecru", leather: "dark brown", accent: "sage" },
    { primary: "soft olive", neutral: "oatmeal", leather: "tobacco", accent: "rust" },
    { primary: "deep plum", neutral: "warm gray", leather: "cognac", accent: "dusty coral" },
    { primary: "burnt orange", neutral: "stone", leather: "espresso", accent: "pale blue" },
    { primary: "muted teal", neutral: "sand", leather: "burgundy", accent: "saffron" },
    { primary: "cocoa", neutral: "cream", leather: "forest green", accent: "apricot" },
  ],
  Winter: [
    { primary: "clean cobalt", neutral: "winter white", leather: "dark brown", accent: "dusty coral" },
    { primary: "forest green", neutral: "cream", leather: "cognac", accent: "saffron" },
    { primary: "deep plum", neutral: "pale taupe", leather: "burgundy", accent: "ice blue" },
    { primary: "winter petrol", neutral: "stone", leather: "espresso", accent: "apricot" },
    { primary: "muted burgundy", neutral: "oatmeal", leather: "dark olive", accent: "pale blue" },
    { primary: "warm charcoal", neutral: "cream", leather: "cognac", accent: "soft coral" },
    { primary: "aubergine", neutral: "warm gray", leather: "oxblood", accent: "sage" },
    { primary: "deep teal", neutral: "ecru", leather: "tobacco", accent: "saffron" },
  ],
};

const quality = {
  "Budget-Friendly": {
    bag: "clean matte coated canvas with tonal trim",
    leather: "clean full-grain-look leather",
    cap: "cotton twill",
    frames: "matte acetate",
    knit: "fine merino-blend",
    scarf: "brushed wool-blend",
    pocketSquare: "cotton-silk",
    jewelry: "brushed stainless steel",
    outerwear: "matte cotton-blend",
    tailoring: "matte cotton-viscose blend",
    shoe: "smooth leather or suede",
  },
  "Mid-Range": {
    bag: "pebbled leather and compact canvas",
    leather: "full-grain leather",
    cap: "compact organic-cotton twill",
    frames: "plant-based acetate",
    knit: "fine merino wool",
    scarf: "brushed pure wool",
    pocketSquare: "silk-cotton",
    jewelry: "brushed sterling-silver-tone steel",
    outerwear: "compact cotton or wool blend",
    tailoring: "breathable wool blend",
    shoe: "full-grain leather or suede",
  },
  Premium: {
    bag: "full-grain calf leather",
    leather: "calf leather",
    cap: "brushed wool-cashmere",
    frames: "hand-finished acetate",
    knit: "fine cashmere-merino",
    scarf: "soft cashmere-wool",
    pocketSquare: "pure silk",
    jewelry: "sterling silver",
    outerwear: "high-twist wool or supple suede",
    tailoring: "high-twist pure wool",
    shoe: "calf leather or fine suede",
  },
  Luxury: {
    bag: "hand-finished full-grain calf leather",
    leather: "hand-finished calf leather",
    cap: "cashmere and fine suede",
    frames: "hand-polished Japanese acetate",
    knit: "pure cashmere",
    scarf: "double-face cashmere",
    pocketSquare: "hand-rolled silk",
    jewelry: "solid sterling silver",
    outerwear: "wool-cashmere or lamb suede",
    tailoring: "hand-finished wool-silk",
    shoe: "hand-finished calf leather or calf suede",
  },
};

const bagShape = {
  "Casual Everyday": "compact soft-structured crossbody",
  "Work / Office": "slim document tote with a removable shoulder strap",
  "Formal Evening": "slim evening folio",
  "Date Night": "small crescent crossbody with restrained hardware",
  "Party / Night Out": "compact soft-structured shoulder bag",
  "Sports / Workout": "clean cylindrical training duffel",
  Travel: "streamlined cabin backpack with a luggage sleeve",
  "Vacation / Resort": "woven-panel soft tote",
};

const outerwearShape = {
  "Casual Everyday": {
    Spring: "short clean blouson with a regular shoulder and upper-hip hem",
    Summer: "unlined shirt-jacket with a regular shoulder and breathable open collar",
    Fall: "supple short bomber with a controlled regular body",
    Winter: "clean short car coat with a regular shoulder and room for one knit",
  },
  "Work / Office": {
    Spring: "unstructured single-breasted blazer with natural shoulders and normal length",
    Summer: "unlined linen-blend office jacket with natural shoulders and normal length",
    Fall: "soft wool overshirt-jacket with a controlled straight body",
    Winter: "clean single-breasted car coat with natural shoulders and normal length",
  },
  "Formal Evening": {
    Spring: "unstructured evening blazer with a clean single-button front",
    Summer: "unlined evening jacket with a natural shoulder and breathable construction",
    Fall: "matte velvet-touch evening jacket with restrained lapels",
    Winter: "single-breasted evening topcoat with a clean normal-length line",
  },
  "Date Night": {
    Spring: "short suede-touch blouson with a clean regular shoulder",
    Summer: "unlined textured overshirt with an upper-hip hem",
    Fall: "supple suede blouson with a clean regular body",
    Winter: "cropped wool jacket with a natural shoulder and clean hem",
  },
  "Party / Night Out": {
    Spring: "short satin-matte blouson with minimal hardware",
    Summer: "unlined textured camp-collar overshirt with a clean upper-hip hem",
    Fall: "short velvet-touch or suede blouson with restrained hardware",
    Winter: "clean brushed-wool bomber with a regular shoulder and upper-hip hem",
  },
  "Sports / Workout": {
    Spring: "lightweight water-resistant training shell with a regular athletic fit",
    Summer: "ultralight packable training overshirt with mesh ventilation",
    Fall: "clean technical track jacket with a regular athletic fit",
    Winter: "lightly insulated training jacket with a clean hip-length hem",
  },
  Travel: {
    Spring: "light water-resistant field jacket with a regular shoulder",
    Summer: "unlined travel overshirt with a clean upper-hip hem",
    Fall: "soft utility blouson with concealed pockets and a regular body",
    Winter: "clean short puffer with a regular shoulder and minimal quilting",
  },
  "Vacation / Resort": {
    Spring: "unlined cotton-linen shirt-jacket with a natural shoulder",
    Summer: "featherweight linen overshirt with a breathable regular body",
    Fall: "soft suede-touch overshirt with a controlled straight body",
    Winter: "lightly padded resort vest with a clean straight body",
  },
};

function accessoryTarget(occasion, season, palette, materials) {
  if (occasion === "Formal Evening") {
    return `${palette.accent} ${materials.pocketSquare} pocket square with a restrained micro-pattern`;
  }
  if (occasion === "Sports / Workout") {
    if (season === "Summer") return `${palette.accent} technical sweat-wicking training cap with a minimal logo`;
    if (season === "Winter") return `${palette.accent} fine technical-merino training beanie with a close clean fit`;
    return `${palette.accent} technical six-panel performance cap with a minimal logo`;
  }
  if (occasion === "Vacation / Resort") {
    if (season === "Winter") return `${palette.accent} ${materials.scarf} narrow resort scarf with a clean solid finish`;
    return `${palette.accent}-lens ${materials.frames} slim sunglasses with no visible logo`;
  }
  if (occasion === "Travel") {
    if (season === "Fall" || season === "Winter") return `${palette.accent} ${materials.knit} minimalist rib beanie`;
    return `${palette.accent} ${materials.cap} packable six-panel cap with a minimal logo`;
  }
  if (occasion === "Work / Office") {
    return `${palette.leather} ${materials.leather} narrow belt with a brushed minimal buckle`;
  }
  if (occasion === "Party / Night Out") {
    return `${materials.jewelry} fine curb-chain necklace with a discreet clasp and no imitation-luxury marks`;
  }
  if (occasion === "Date Night") {
    if (season === "Fall" || season === "Winter") return `${palette.accent} ${materials.scarf} narrow scarf with a clean solid finish`;
    return `${palette.accent}-lens ${materials.frames} slim rectangular sunglasses with no visible logo`;
  }
  if (season === "Fall") return `${palette.accent} ${materials.knit} minimalist rib beanie`;
  if (season === "Winter") return `${palette.accent} ${materials.scarf} compact scarf with a clean solid finish`;
  return `${palette.accent} ${materials.cap} minimalist six-panel cap with a clean curved brim`;
}

function targetFor(category, scenario, palette, materials) {
  const { occasion, season } = scenario;
  if (category === "accessory") return accessoryTarget(occasion, season, palette, materials);
  if (category === "bag") {
    return `${palette.leather} ${materials.bag} ${bagShape[occasion]} with minimal hardware and no loud logo`;
  }
  if (category === "outerwear") {
    return `${palette.primary} ${materials.outerwear} ${outerwearShape[occasion][season]}; no dropped shoulder, long oversized body or skinny sleeve`;
  }
  if (category === "top") {
    const neckline = occasion === "Formal Evening" ? "fine-gauge open-collar knit polo" : occasion === "Sports / Workout" ? "clean performance crew top" : "self-contained fine-knit polo or band-collar shirt";
    return `${palette.primary} ${neckline} with a regular or controlled-relaxed shoulder and clean upper-hip hem`;
  }
  if (category === "bottom") {
    const shape = occasion === "Sports / Workout" ? "clean 7-inch performance short or controlled straight technical trouser" : "single-pleat controlled-straight trouser with a clean shoe break";
    return `${palette.neutral} ${materials.tailoring} ${shape}; no skinny calf, balloon leg or puddling`;
  }
  if (category === "shoe") {
    const shape = occasion === "Sports / Workout" ? "low-profile cross-training shoe" : occasion === "Date Night" ? "soft-almond suede loafer or low-profile side-zip shoe" : "low-profile round-toe court sneaker or loafer";
    return `${palette.leather} ${materials.shoe} ${shape} with a slim sole; no pointed toe, height-increasing sole or orthopedic construction`;
  }
  throw new Error(`Unsupported separates category: ${category}`);
}

let completionEntries;
if (audit.summary.activeNextLookMissingFamilyRoleDirections === 0) {
  const existing = JSON.parse(await readFile(outputJsonPath, "utf8"));
  completionEntries = existing.entries;
} else {
  completionEntries = audit.scenarios.flatMap((scenario) => {
    const budgetPosition = budgets.indexOf(scenario.budget);
    const occasionPosition = occasions.indexOf(scenario.occasion);
    if (budgetPosition < 0 || occasionPosition < 0) {
      throw new Error(`Unknown scenario labels for ${scenario.scenarioId}`);
    }
    const palette = seasonPalettes[scenario.season][(occasionPosition * 3 + budgetPosition * 2) % 8];
    const materials = quality[scenario.budget];
    return scenario.missingRoleKeys
      .filter((roleKey) => roleKey.startsWith("separates."))
      .map((roleKey) => {
        const category = roleKey.split(".")[1];
        const targetProduct = targetFor(category, scenario, palette, materials);
        return {
          scenarioId: scenario.scenarioId,
          occasion: scenario.occasion,
          season: scenario.season,
          budget: scenario.budget,
          plannedPosition: 1,
          family: "separates",
          category,
          palette,
          targetProduct,
          searchPhrase: `men ${targetProduct.replaceAll(";", "")} ${scenario.season.toLowerCase()} ${scenario.occasion.toLowerCase()}`,
          productIdentitySelected: false,
          visuallyApproved: false,
          budgetProofRequired: true,
          uiIntegrated: false,
        };
      });
  });
}

const uniqueKeys = new Set(
  completionEntries.map((entry) => `${entry.scenarioId}|${entry.family}|${entry.category}`),
);
if (completionEntries.length !== 204 || uniqueKeys.size !== 204) {
  throw new Error(`Expected 204 unique Separates completion directions, found ${completionEntries.length}/${uniqueKeys.size}`);
}

const categoryCounts = Object.fromEntries(
  [...new Set(completionEntries.map((entry) => entry.category))]
    .sort()
    .map((category) => [category, completionEntries.filter((entry) => entry.category === category).length]),
);
const summary = {
  scenarioCellsWithCompletions: new Set(completionEntries.map((entry) => entry.scenarioId)).size,
  familyRoleDirections: completionEntries.length,
  categoryCounts,
  productIdentitiesSelected: 0,
  completeOutfitsApproved: 0,
  weddingAndWeddingGuestIncluded: false,
  uiIntegrated: false,
};
const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scope: "Missing active position-1 Separates family directions across men's 128 non-wedding scenario cells",
  identityRule:
    "Every eventual product must be a new supplier-product identity and cannot be reused by another scenario, outfit position, variant or Suit/Tuxedo family.",
  visualRule:
    "Directions are authored styling targets, not image approvals. Every eventual candidate still requires exact-page and full-resolution product and complete-outfit visual review.",
  summary,
  entries: completionEntries,
};

const rows = completionEntries
  .map(
    (entry) =>
      `| ${entry.scenarioId} | ${entry.occasion} | ${entry.season} | ${entry.budget} | ${entry.category} | ${entry.targetProduct} |`,
  )
  .join("\n");
const markdown = `# Men's Separates family completion directions

Generated: ${result.generatedAt}

These ${summary.familyRoleDirections} directions fill only the missing roles in the active first/next Separates look. They are Zara-led sourcing specifications, not selected or visually approved products.

- Scenario cells receiving one or more directions: ${summary.scenarioCellsWithCompletions}
- Role directions: ${summary.familyRoleDirections}
- Accessories: ${categoryCounts.accessory}
- Bags: ${categoryCounts.bag}
- Outerwear: ${categoryCounts.outerwear}
- Bottoms: ${categoryCounts.bottom}
- Tops: ${categoryCounts.top}
- Shoes: ${categoryCounts.shoe}
- Product identities selected: 0
- Complete outfits approved: 0
- Wedding / Wedding Guest included: no
- UI integrated: no

| Scenario | Occasion | Season | Budget | Role | Stylist-authored target |
|---|---|---|---|---|---|
${rows}
`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(outputMarkdownPath, markdown),
]);

console.log(JSON.stringify({ outputJsonPath, outputMarkdownPath, ...summary }, null, 2));
