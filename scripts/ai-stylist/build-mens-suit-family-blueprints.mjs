#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const reportRoot = path.join(
  repoRoot,
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913",
);
const coverage = JSON.parse(
  await readFile(path.join(reportRoot, "mens-128-scenario-coverage/coverage.json"), "utf8"),
);
const outputDir = path.join(reportRoot, "mens-suit-family-blueprints");
const outputJsonPath = path.join(outputDir, "blueprints.json");
const outputMarkdownPath = path.join(outputDir, "BLUEPRINTS.md");

const budgets = ["Budget-Friendly", "Mid-Range", "Premium", "Luxury"];
const budgetIndex = new Map(budgets.map((budget, index) => [budget, index]));

const palettes = {
  "Work / Office|Spring": {
    suit: ["soft sage", "muted sky blue", "dusty lilac", "pale mineral blue"],
    shoe: ["cognac", "oxblood", "forest green", "burgundy"],
    bag: ["warm tan", "camel", "tobacco", "deep plum"],
    dial: ["cream", "pale blue", "champagne", "mother-of-pearl blue"],
    strap: ["tan", "cognac", "burgundy", "plum"],
    accent: ["soft coral", "sage and cream", "dusty rose", "apricot"],
  },
  "Work / Office|Summer": {
    suit: ["sand", "washed teal", "pale sage", "warm ivory"],
    shoe: ["tobacco", "sand", "cognac", "muted teal"],
    bag: ["camel", "warm taupe", "cognac", "soft tobacco"],
    dial: ["warm white", "powder blue", "champagne", "pale aqua"],
    strap: ["tan", "sand suede", "cognac", "sage suede"],
    accent: ["powder blue", "soft coral", "pale lemon", "washed teal"],
  },
  "Work / Office|Fall": {
    suit: ["tobacco", "soft olive", "petrol blue", "berry brown"],
    shoe: ["dark brown", "burgundy", "oxblood", "espresso"],
    bag: ["cognac", "tobacco", "warm taupe", "deep olive"],
    dial: ["cream", "champagne", "forest green", "smoked amber"],
    strap: ["brown", "burgundy", "oxblood", "dark olive"],
    accent: ["rust", "ochre", "pale stone", "burnt orange"],
  },
  "Work / Office|Winter": {
    suit: ["warm charcoal", "forest green", "plum gray", "winter petrol"],
    shoe: ["dark chocolate", "burgundy", "espresso", "oxblood"],
    bag: ["tobacco", "deep cognac", "aubergine", "forest"],
    dial: ["winter white", "champagne", "silver gray", "pale ice blue"],
    strap: ["brown", "burgundy", "plum", "dark green"],
    accent: ["saffron", "winter cream", "dusty coral", "pale blue"],
  },
  "Formal Evening|Spring": {
    suit: ["muted blue", "light sage", "dusty lilac", "pale aqua"],
    shoe: ["burgundy", "dark olive", "oxblood", "plum"],
    bag: ["warm taupe", "cognac", "deep sage", "aubergine"],
    dial: ["pale blue", "champagne", "silver", "mother-of-pearl"],
    strap: ["brown", "olive", "burgundy", "plum"],
    accent: ["soft coral", "ivory", "dusty rose", "apricot"],
  },
  "Formal Evening|Summer": {
    suit: ["stone", "sand", "washed teal", "luminous ivory"],
    shoe: ["tobacco", "cognac", "deep teal", "burgundy"],
    bag: ["camel", "warm tan", "cognac", "soft gold"],
    dial: ["warm white", "pale aqua", "champagne", "ivory enamel"],
    strap: ["tan", "cognac", "teal", "burgundy"],
    accent: ["pale lemon", "powder blue", "soft coral", "sage silk"],
  },
  "Formal Evening|Fall": {
    suit: ["soft olive", "tobacco", "muted burgundy", "aubergine"],
    shoe: ["dark brown", "oxblood", "burgundy", "espresso"],
    bag: ["cognac", "tobacco", "deep plum", "dark olive"],
    dial: ["cream", "champagne", "smoked gray", "garnet"],
    strap: ["brown", "oxblood", "burgundy", "espresso"],
    accent: ["ochre", "rust", "pale stone", "burnt orange"],
  },
  "Formal Evening|Winter": {
    suit: ["deep plum", "forest green", "midnight petrol", "blackberry"],
    shoe: ["dark chocolate", "burgundy", "oxblood", "black cherry"],
    bag: ["tobacco", "deep cognac", "aubergine", "forest"],
    dial: ["winter white", "champagne", "silver", "pale ice blue"],
    strap: ["brown", "burgundy", "oxblood", "plum"],
    accent: ["winter cream", "dusty coral", "pale blue", "saffron silk"],
  },
  "Date Night|Spring": {
    suit: ["dusty rose", "soft sage", "powder blue", "pale lilac"],
    shoe: ["cognac", "dark olive", "burgundy", "plum"],
    bag: ["warm tan", "camel", "tobacco", "aubergine"],
    dial: ["cream", "pale blue", "champagne", "mother-of-pearl"],
    strap: ["tan", "olive", "burgundy", "plum"],
    accent: ["sage", "soft coral", "apricot", "pale aqua"],
  },
  "Date Night|Summer": {
    suit: ["terracotta", "washed teal", "sand", "light olive"],
    shoe: ["cream", "tobacco", "cognac", "muted teal"],
    bag: ["camel", "warm taupe", "cognac", "soft tobacco"],
    dial: ["warm white", "pale aqua", "champagne", "ivory"],
    strap: ["tan", "sand suede", "cognac", "sage suede"],
    accent: ["powder blue", "pale lemon", "soft coral", "apricot"],
  },
  "Date Night|Fall": {
    suit: ["cocoa", "petrol blue", "muted burgundy", "deep olive"],
    shoe: ["dark brown", "burgundy", "oxblood", "espresso"],
    bag: ["cognac", "tobacco", "warm taupe", "deep plum"],
    dial: ["cream", "champagne", "forest", "smoked amber"],
    strap: ["brown", "burgundy", "oxblood", "olive"],
    accent: ["ochre", "rust", "pale stone", "burnt orange"],
  },
  "Date Night|Winter": {
    suit: ["warm chocolate", "plum", "forest green", "winter teal"],
    shoe: ["dark chocolate", "burgundy", "espresso", "black cherry"],
    bag: ["tobacco", "deep cognac", "aubergine", "forest"],
    dial: ["winter white", "champagne", "silver gray", "pale ice blue"],
    strap: ["brown", "burgundy", "plum", "dark green"],
    accent: ["dusty coral", "winter cream", "pale blue", "saffron"],
  },
  "Party / Night Out|Spring": {
    suit: ["soft coral", "fresh sage", "cobalt blue", "dusty lilac"],
    shoe: ["cream", "dark olive", "burgundy", "plum"],
    bag: ["warm tan", "sage", "cognac", "aubergine"],
    dial: ["warm white", "pale aqua", "champagne", "mother-of-pearl"],
    strap: ["tan", "olive", "burgundy", "plum"],
    accent: ["powder blue", "apricot", "pale lemon", "soft coral"],
  },
  "Party / Night Out|Summer": {
    suit: ["saffron", "washed teal", "warm ivory", "tangerine"],
    shoe: ["cream", "tobacco", "cognac", "muted teal"],
    bag: ["camel", "warm taupe", "soft gold", "cognac"],
    dial: ["warm white", "pale aqua", "champagne", "ivory enamel"],
    strap: ["tan", "sand suede", "cognac", "sage suede"],
    accent: ["powder blue", "soft coral", "pale lemon", "sage"],
  },
  "Party / Night Out|Fall": {
    suit: ["paprika", "petrol blue", "muted burgundy", "ochre brown"],
    shoe: ["dark brown", "burgundy", "oxblood", "espresso"],
    bag: ["cognac", "tobacco", "deep plum", "dark olive"],
    dial: ["cream", "champagne", "smoked gray", "garnet"],
    strap: ["brown", "burgundy", "oxblood", "olive"],
    accent: ["pale stone", "rust", "burnt orange", "saffron"],
  },
  "Party / Night Out|Winter": {
    suit: ["wine red", "forest green", "electric cobalt", "deep plum"],
    shoe: ["dark chocolate", "burgundy", "black cherry", "espresso"],
    bag: ["tobacco", "deep cognac", "aubergine", "forest"],
    dial: ["winter white", "champagne", "silver", "pale ice blue"],
    strap: ["brown", "burgundy", "plum", "dark green"],
    accent: ["winter cream", "dusty coral", "pale blue", "saffron silk"],
  },
};

const tier = {
  "Budget-Friendly": {
    suitMaterial: "matte cotton-viscose or wool-blend",
    shoeMaterial: "clean smooth leather or suede",
    bagMaterial: "matte full-grain-look leather",
    watchCase: "restrained stainless-steel",
    accessoryMaterial: "cotton-silk",
    price: { suit: "$100-$160", shoe: "$60-$90", bag: "$40-$70", watch: "$25-$45", accessory: "$15-$30" },
  },
  "Mid-Range": {
    suitMaterial: "breathable wool-blend",
    shoeMaterial: "full-grain leather or suede",
    bagMaterial: "pebbled leather",
    watchCase: "slim brushed-steel",
    accessoryMaterial: "silk-cotton",
    price: { suit: "$240-$300", shoe: "$110-$140", bag: "$90-$120", watch: "$45-$75", accessory: "$30-$55" },
  },
  Premium: {
    suitMaterial: "high-twist pure wool or linen-wool",
    shoeMaterial: "calf leather or fine suede",
    bagMaterial: "full-grain calf leather",
    watchCase: "thin polished-steel",
    accessoryMaterial: "pure silk",
    price: { suit: "$370-$500", shoe: "$180-$250", bag: "$170-$250", watch: "$130-$210", accessory: "$70-$110" },
  },
  Luxury: {
    suitMaterial: "hand-finished wool-silk or cashmere-wool",
    shoeMaterial: "hand-finished calf leather or calf suede",
    bagMaterial: "hand-finished full-grain calf leather",
    watchCase: "ultra-thin precious-tone or polished-steel",
    accessoryMaterial: "hand-rolled silk",
    price: { suit: "$700-$1,300", shoe: "$300-$550", bag: "$350-$700", watch: "$300-$700", accessory: "$140-$300" },
  },
};

const budgetBands = {
  "Budget-Friendly": [0, 500],
  "Mid-Range": [501, 900],
  Premium: [901, 1600],
  Luxury: [1601, 5000],
};

function parsePriceRange(value) {
  const values = value.match(/\d[\d,]*/g)?.map((part) => Number(part.replaceAll(",", "")));
  if (values?.length !== 2) throw new Error(`Invalid price range: ${value}`);
  return values;
}

const occasionShape = {
  "Work / Office": {
    shoe: "round-toe derby or penny loafer",
    bag: "slim structured document tote",
    accessory: "clean pocket square",
  },
  "Formal Evening": {
    shoe: "soft-almond tassel loafer or double-monk shoe",
    bag: "slim evening folio",
    accessory: "hand-finished pocket square",
  },
  "Date Night": {
    shoe: "soft-almond suede loafer or low-profile side-zip shoe",
    bag: "compact minimalist crossbody",
    accessory: "narrow pocket square",
  },
  "Party / Night Out": {
    shoe: "sleek round-toe loafer or side-zip ankle shoe",
    bag: "compact soft-structured shoulder bag",
    accessory: "small expressive pocket square",
  },
};

const entries = coverage.scenarios
  .filter((scenario) => scenario.suitEligible)
  .map((scenario) => {
    const key = `${scenario.occasionLabel}|${scenario.seasonLabel}`;
    const palette = palettes[key];
    const index = budgetIndex.get(scenario.budgetLabel);
    const quality = tier[scenario.budgetLabel];
    const shape = occasionShape[scenario.occasionLabel];
    if (!palette || index === undefined || !quality || !shape) {
      throw new Error(`Missing suit-family styling data for ${scenario.scenarioId}: ${key}`);
    }
    const colors = Object.fromEntries(
      Object.entries(palette).map(([name, values]) => [name, values[index]]),
    );
    const roles = [
      {
        family: "suit",
        category: "suit",
        searchPhrase: `men ${colors.suit} ${quality.suitMaterial} single breasted suit natural shoulder straight trouser ${scenario.seasonLabel.toLowerCase()} ${scenario.occasionLabel.toLowerCase()}`,
        targetProduct: `${colors.suit} ${quality.suitMaterial} two-piece suit with a natural shoulder, softly shaped single-breasted jacket and controlled straight trouser`,
        customerRetailTarget: quality.price.suit,
      },
      {
        family: "suit",
        category: "shoe",
        searchPhrase: `men ${colors.shoe} ${quality.shoeMaterial} ${shape.shoe} slim sole ${scenario.seasonLabel.toLowerCase()}`,
        targetProduct: `${colors.shoe} ${quality.shoeMaterial} ${shape.shoe} with a slim sole and no pointed or bulky construction`,
        customerRetailTarget: quality.price.shoe,
      },
      {
        family: "suit",
        category: "bag",
        searchPhrase: `men ${colors.bag} ${quality.bagMaterial} ${shape.bag} minimal logo`,
        targetProduct: `${colors.bag} ${quality.bagMaterial} ${shape.bag} with restrained hardware and no oversized black-business styling`,
        customerRetailTarget: quality.price.bag,
      },
      {
        family: "suit",
        category: "watch",
        searchPhrase: `men ${colors.dial} dial ${colors.strap} leather strap ${quality.watchCase} minimal watch thin case`,
        targetProduct: `${colors.dial}-dial minimalist watch with a ${quality.watchCase} case and ${colors.strap} leather strap`,
        customerRetailTarget: quality.price.watch,
      },
      {
        family: "suit",
        category: "accessory",
        searchPhrase: `men ${colors.accent} ${quality.accessoryMaterial} ${shape.accessory} minimal pattern`,
        targetProduct: `${colors.accent} ${quality.accessoryMaterial} ${shape.accessory} with a restrained micro-pattern`,
        customerRetailTarget: quality.price.accessory,
      },
    ];
    const [targetMinimum, targetMaximum] = roles.reduce(
      ([minimum, maximum], role) => {
        const [roleMinimum, roleMaximum] = parsePriceRange(role.customerRetailTarget);
        return [minimum + roleMinimum, maximum + roleMaximum];
      },
      [0, 0],
    );
    const [bandMinimum, bandMaximum] = budgetBands[scenario.budgetLabel];
    if (targetMinimum < bandMinimum || targetMaximum > bandMaximum) {
      throw new Error(
        `${scenario.scenarioId} target $${targetMinimum}-$${targetMaximum} escapes ${scenario.budgetLabel} $${bandMinimum}-$${bandMaximum}`,
      );
    }
    return {
      scenarioId: scenario.scenarioId,
      occasion: scenario.occasionLabel,
      season: scenario.seasonLabel,
      budget: scenario.budgetLabel,
      plannedPosition: 1,
      family: "suit",
      palette: colors,
      stylingRule:
        "One controlled statement color, natural shoulders, normal jacket length, straight trousers, non-pointed footwear, and family-specific companions that cannot be reused by Separates.",
      planningOutfitRetailTarget: `$${targetMinimum}-$${targetMaximum}`,
      roles,
      productIdentitiesSelected: 0,
      completeOutfitsApproved: 0,
      uiIntegrated: false,
    };
  });

const allRoleKeys = entries.flatMap((entry) =>
  entry.roles.map((role) => `${entry.scenarioId}|${role.family}|${role.category}`),
);
if (entries.length !== 64 || new Set(allRoleKeys).size !== 320) {
  throw new Error(`Expected 64 suit cells and 320 unique role keys, found ${entries.length}/${new Set(allRoleKeys).size}`);
}

const summary = {
  suitEligibleScenarioCells: entries.length,
  plannedPositionsPerCell: 1,
  familyRoleDirections: allRoleKeys.length,
  suits: entries.length,
  shoes: entries.length,
  bags: entries.length,
  watches: entries.length,
  accessories: entries.length,
  productIdentitiesSelected: 0,
  completeOutfitsApproved: 0,
  weddingAndWeddingGuestIncluded: false,
  uiIntegrated: false,
};
const result = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scope: "Active position-1 Suit/Tuxedo family blueprints for 64 men's non-wedding scenario cells",
  identityRule:
    "Every eventual product must be a new identity and cannot be reused by Separates or another scenario, outfit position, color or variant.",
  pricingRule:
    "Customer-retail ranges are styling targets only. They do not prove CJ wholesale or final retail price-band eligibility.",
  summary,
  entries,
};

const rows = entries
  .map((entry) => {
    const role = Object.fromEntries(entry.roles.map((item) => [item.category, item.targetProduct]));
    return `| ${entry.scenarioId} | ${entry.occasion} | ${entry.season} | ${entry.budget} | ${entry.planningOutfitRetailTarget} | ${role.suit} | ${role.shoe} | ${role.bag} | ${role.watch} | ${role.accessory} |`;
  })
  .join("\n");
const markdown = `# Men's Suit/Tuxedo family blueprints

Generated: ${result.generatedAt}

These are stylist-authored sourcing directions for the active first Suit/Tuxedo position in all 64 eligible non-wedding cells. They are deliberately separate from the Separates family so products cannot be recycled across UI modes.

- Scenario cells: ${summary.suitEligibleScenarioCells}
- Family-specific role directions: ${summary.familyRoleDirections}
- Product identities selected: 0
- Complete outfits approved: 0
- Wedding / Wedding Guest included: no
- UI integrated: no

Customer-retail ranges inside the JSON are planning targets, not verified prices. Every eventual product still requires exact-page sourcing, full visual proof, global de-duplication, refinement, background removal and complete-outfit visual approval.

| Scenario | Occasion | Season | Budget | Planned total | Suit | Shoe | Bag | Watch | Accessory |
|---|---|---|---|---:|---|---|---|---|---|
${rows}
`;

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(outputMarkdownPath, markdown),
]);

console.log(JSON.stringify({ outputJsonPath, outputMarkdownPath, ...summary }, null, 2));
