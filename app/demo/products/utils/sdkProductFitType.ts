import type { DemoProductView } from "../types";

const FIT_RULES: Array<{ fitType: string; pattern: RegExp }> = [
  {
    fitType: "shoe",
    pattern: /\b(shoe|shoes|sneaker|sneakers|boot|boots|heel|heels|loafer|loafers|mule|mules|sandal|sandals|trainer|trainers|slipper|slippers|stiletto|stilettos|pump|pumps|oxford|derby|derbies|wedge|espadrille|clog|footwear)\b/i,
  },
  {
    fitType: "hat",
    pattern: /\b(hat|hats|cap|caps|beanie|beanies|bucket hat|fedora|snapback|baseball cap|trucker hat|beret|panama|headband|visor|bonnet|headwear)\b/i,
  },
  {
    fitType: "sunglasses",
    pattern: /\b(sunglass|sunglasses|eyewear|eyeglasses|glasses|spectacles|optical|goggles|frames|aviator|wayfarer|lens)\b/i,
  },
  {
    fitType: "belt",
    pattern: /\b(belt|belts|waist belt)\b/i,
  },
  {
    fitType: "earring",
    pattern: /\b(earring|earrings|ear cuff|ear cuffs|stud|studs|hoop|hoops|drop earring|drop earrings)\b/i,
  },
  {
    fitType: "necklace",
    pattern: /\b(necklace|necklaces|pendant|pendants|chain|chains|choker|chokers)\b/i,
  },
  {
    fitType: "bracelet",
    pattern: /\b(bracelet|bracelets|bangle|bangles|cuff|cuffs)\b/i,
  },
  {
    fitType: "ring",
    pattern: /\b(ring|rings|band|bands)\b/i,
  },
  {
    fitType: "watch",
    pattern: /\b(watch|watches|timepiece|timepieces)\b/i,
  },
  {
    fitType: "bag",
    pattern: /\b(handbag|handbags|bag|bags|tote|totes|shoulder bag|hobo bag|crossbody|clutch|satchel|backpack|backpacks|weekender|duffle|duffel|wallet|wallets|purse|purses|briefcase|belt bag|fanny pack|luggage|suitcase|suitcases|leather goods)\b/i,
  },
  {
    fitType: "accessory",
    pattern: /\b(accessory|accessories|jewelry|jewellery|brooch|brooches|scarf|scarves|glove|gloves)\b/i,
  },
];

export function inferSdkProductFitType(product: DemoProductView): string | undefined {
  const text = [
    product.category,
    product.subcategory,
    product.name,
    product.description,
    product.material,
  ]
    .filter(Boolean)
    .join(" ");

  return FIT_RULES.find((rule) => rule.pattern.test(text))?.fitType;
}
