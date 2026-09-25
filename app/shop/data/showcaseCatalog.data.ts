export const SHOWCASE_GENDERS = ["women", "men"] as const;
export const SHOWCASE_SLOTS = [
  "top",
  "bottom",
  "shoe",
  "bag",
  "accessory",
] as const;

export type ShowcaseGender = (typeof SHOWCASE_GENDERS)[number];
export type ShowcaseSlot = (typeof SHOWCASE_SLOTS)[number];
export type ShowcaseFitType = "apparel" | "shoe" | "bag" | "accessory";

export type ShowcaseSizeGuide = {
  title: string;
  headers: string[];
  rows: string[][];
};

export type ShowcaseProductSpecification = {
  details: string[];
  materialDetails: string[];
  careInstructions: string[];
  fitDescription: string;
  fitNotes: string[];
  sizeGuide: ShowcaseSizeGuide;
};

export type ShowcaseProduct = {
  id: string;
  name: string;
  gender: ShowcaseGender;
  slot: ShowcaseSlot;
  fitType: ShowcaseFitType;
  color: string;
  colorHex: string;
  material: string;
  description: string;
  sizes: string[];
  measurements?: string;
  priceCents: number;
};

export const showcaseAsset = (
  product: Pick<ShowcaseProduct, "id" | "gender">,
  file: string,
) =>
  `/media/global-shop/showcase-v4/${product.gender}/${product.id}/${file}.png`;

export const SHOWCASE_PRODUCTS: ShowcaseProduct[] = [
  {
    id: "women-camel-pinstripe-tailored-blazer",
    name: "Camel Pinstripe Tailored Blazer",
    gender: "women",
    slot: "top",
    fitType: "apparel",
    color: "Warm camel pinstripe",
    colorHex: "#9B806A",
    material: "Fine wool-linen blend with smooth lining",
    description:
      "A fitted single-breasted blazer with softly structured shoulders, long notched lapels, a dark horn button, angled welt pockets and precise waist shaping.",
    sizes: ["XS", "S", "M", "L", "XL"],
    priceCents: 18900,
  },
  {
    id: "women-dusty-blue-silk-poplin-shirt",
    name: "Dusty Blue Silk-Poplin Shirt",
    gender: "women",
    slot: "top",
    fitType: "apparel",
    color: "Muted dusty blue",
    colorHex: "#8596A1",
    material: "Matte silk-cotton poplin",
    description:
      "A refined long-sleeve shirt with a pointed collar, concealed placket, slim button cuffs and an easy, controlled drape.",
    sizes: ["XS", "S", "M", "L", "XL"],
    priceCents: 11900,
  },
  {
    id: "women-chocolate-tailored-trouser",
    name: "Chocolate Tailored Trouser",
    gender: "women",
    slot: "bottom",
    fitType: "apparel",
    color: "Deep chocolate brown",
    colorHex: "#4A3329",
    material: "Smooth compact suiting",
    description:
      "A high-rise full-length trouser with a concealed fastening, two restrained pleats, pressed creases and a straight relaxed leg.",
    sizes: ["24", "26", "28", "30", "32"],
    priceCents: 13900,
  },
  {
    id: "women-sage-grey-pleated-midi-skirt",
    name: "Sage-Grey Pleated Midi Skirt",
    gender: "women",
    slot: "bottom",
    fitType: "apparel",
    color: "Desaturated sage grey",
    colorHex: "#8C9286",
    material: "Fluid matte twill",
    description:
      "A below-knee A-line skirt with a narrow waistband and controlled knife pleats that open softly below the hip.",
    sizes: ["XS", "S", "M", "L", "XL"],
    priceCents: 12900,
  },
  {
    id: "women-oxblood-leather-slingback-pump",
    name: "Oxblood Leather Slingback Pump",
    gender: "women",
    slot: "shoe",
    fitType: "shoe",
    color: "Polished oxblood",
    colorHex: "#682D32",
    material: "Smooth calf leather with leather sole",
    description:
      "A pointed-toe slingback with a low sculpted heel, slim adjustable strap and minimal tonal stitching.",
    sizes: ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41"],
    priceCents: 15900,
  },
  {
    id: "women-ivory-leather-court-sneaker",
    name: "Ivory Leather Court Sneaker",
    gender: "women",
    slot: "shoe",
    fitType: "shoe",
    color: "Warm ivory and stone",
    colorHex: "#E6E0D3",
    material: "Smooth leather with suede heel tab and rubber cupsole",
    description:
      "A premium low-profile court sneaker with tonal lacing, a softly rounded toe and clean, unbranded panel seams.",
    sizes: ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41"],
    priceCents: 13900,
  },
  {
    id: "women-espresso-soft-shoulder-bag",
    name: "Espresso Soft Shoulder Bag",
    gender: "women",
    slot: "bag",
    fitType: "bag",
    color: "Rich espresso brown",
    colorHex: "#3C2A23",
    material: "Supple pebbled leather with brushed-brass hardware",
    description:
      "A softly structured crescent bag with a curved top zip, broad adjustable shoulder strap and subtle base gusset.",
    sizes: ["One size"],
    measurements: "29 × 18 × 9 cm; strap drop 24 cm",
    priceCents: 16900,
  },
  {
    id: "women-stone-woven-mini-tote",
    name: "Stone Woven Mini Tote",
    gender: "women",
    slot: "bag",
    fitType: "bag",
    color: "Warm limestone beige",
    colorHex: "#B4A795",
    material: "Hand-woven matte leather with tonal suede lining",
    description:
      "A compact architectural tote with a softly trapezoidal body and exactly two rounded top handles.",
    sizes: ["One size"],
    measurements: "22 × 19 × 11 cm; handle drop 10 cm",
    priceCents: 17900,
  },
  {
    id: "women-tortoiseshell-resin-hoop-set",
    name: "Tortoiseshell Resin Hoop Set",
    gender: "women",
    slot: "accessory",
    fitType: "accessory",
    color: "Tobacco tortoiseshell",
    colorHex: "#7B5034",
    material: "Hand-polished translucent resin with gold-tone posts",
    description:
      "A matching pair of medium sculptural hoops with a softly irregular profile and warm amber marbling.",
    sizes: ["One size"],
    measurements: "34 mm diameter; 9 mm width",
    priceCents: 4900,
  },
  {
    id: "women-burgundy-silk-scarf",
    name: "Burgundy Silk Scarf",
    gender: "women",
    slot: "accessory",
    fitType: "accessory",
    color: "Muted burgundy, ivory and taupe",
    colorHex: "#743A45",
    material: "Silk twill with hand-rolled edges",
    description:
      "A square scarf with an original restrained geometric border motif and a softly polished silk finish.",
    sizes: ["One size"],
    measurements: "70 × 70 cm",
    priceCents: 6900,
  },
  {
    id: "men-espresso-double-breasted-blazer",
    name: "Espresso Double-Breasted Blazer",
    gender: "men",
    slot: "top",
    fitType: "apparel",
    color: "Deep espresso brown",
    colorHex: "#40302A",
    material: "Compact wool suiting with smooth lining",
    description:
      "A modern double-breasted blazer with natural shoulders, broad peak lapels, six tonal horn buttons and refined waist suppression.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    priceCents: 19900,
  },
  {
    id: "men-muted-slate-knit-polo",
    name: "Muted Slate Knit Polo",
    gender: "men",
    slot: "top",
    fitType: "apparel",
    color: "Muted slate blue-grey",
    colorHex: "#637079",
    material: "Fine-gauge merino knit",
    description:
      "A regular-fit short-sleeve polo with an open collar, fully fashioned shoulders and restrained ribbed edges.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    priceCents: 10900,
  },
  {
    id: "men-charcoal-pleated-trouser",
    name: "Charcoal Pleated Trouser",
    gender: "men",
    slot: "bottom",
    fitType: "apparel",
    color: "Soft charcoal grey",
    colorHex: "#565653",
    material: "Fluid wool suiting",
    description:
      "A high-rise tailored trouser with an extended tab waistband, controlled forward pleats and a straight relaxed leg.",
    sizes: ["28", "30", "32", "34", "36", "38"],
    priceCents: 14900,
  },
  {
    id: "men-sand-straight-tailored-trouser",
    name: "Sand Straight Tailored Trouser",
    gender: "men",
    slot: "bottom",
    fitType: "apparel",
    color: "Warm stone sand",
    colorHex: "#B4A58D",
    material: "Textured linen-wool blend",
    description:
      "A medium-rise straight trouser with a clean flat front, pressed crease and natural full-length drape.",
    sizes: ["28", "30", "32", "34", "36", "38"],
    priceCents: 13900,
  },
  {
    id: "men-chocolate-suede-court-sneaker",
    name: "Chocolate Suede Court Sneaker",
    gender: "men",
    slot: "shoe",
    fitType: "shoe",
    color: "Dark chocolate and warm ivory",
    colorHex: "#51392E",
    material: "Fine suede with rubber sole",
    description:
      "A premium low-profile court sneaker with tonal laces, minimal stitched panels and a slim warm off-white sole.",
    sizes: ["EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45", "EU 46"],
    priceCents: 14900,
  },
  {
    id: "men-oxblood-penny-loafer",
    name: "Oxblood Penny Loafer",
    gender: "men",
    slot: "shoe",
    fitType: "shoe",
    color: "Burnished oxblood",
    colorHex: "#632D30",
    material: "Polished calf leather with leather-and-rubber sole",
    description:
      "An almond-toe penny loafer with precise saddle construction, subtle apron stitching and a stacked leather heel.",
    sizes: ["EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45", "EU 46"],
    priceCents: 16900,
  },
  {
    id: "men-dark-olive-crossbody-sling",
    name: "Dark Olive Crossbody Sling",
    gender: "men",
    slot: "bag",
    fitType: "bag",
    color: "Desaturated dark olive",
    colorHex: "#59604C",
    material: "Matte technical twill with tonal leather trim",
    description:
      "A compact curved crossbody with a concealed top zip, one adjustable webbing strap and restrained gunmetal hardware.",
    sizes: ["One size"],
    measurements: "25 × 17 × 7 cm; adjustable strap 82–138 cm",
    priceCents: 11900,
  },
  {
    id: "men-warm-grey-soft-weekender",
    name: "Warm Grey Soft Weekender",
    gender: "men",
    slot: "bag",
    fitType: "bag",
    color: "Warm mineral grey and espresso",
    colorHex: "#817B73",
    material: "Dense cotton canvas with leather trim",
    description:
      "A softly rectangular weekender with a full top zip, exactly two attached leather carry handles and reinforced base corners.",
    sizes: ["One size"],
    measurements: "48 × 30 × 22 cm; handle drop 18 cm",
    priceCents: 18900,
  },
  {
    id: "men-tortoiseshell-acetate-sunglasses",
    name: "Tortoiseshell Acetate Sunglasses",
    gender: "men",
    slot: "accessory",
    fitType: "accessory",
    color: "Dark tobacco tortoiseshell",
    colorHex: "#684630",
    material: "Polished acetate with smoke lenses",
    description:
      "Modern rectangular sunglasses with softly rounded corners, refined frame thickness and clean unbranded temples.",
    sizes: ["One size"],
    measurements: "Lens 50 mm; bridge 20 mm; temple 145 mm",
    priceCents: 7900,
  },
  {
    id: "men-burgundy-leather-strap-watch",
    name: "Burgundy Leather Strap Watch",
    gender: "men",
    slot: "accessory",
    fitType: "accessory",
    color: "Muted burgundy and brushed silver",
    colorHex: "#743A42",
    material: "Calf-leather strap with brushed-silver case",
    description:
      "A minimal dress watch with a warm ivory dial, simple baton markers and a smooth burgundy leather strap.",
    sizes: ["One size"],
    measurements: "38 mm case; 20 mm strap",
    priceCents: 12900,
  },
];

function number(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function measurementRange(start: number, width: number) {
  return `${number(start)}–${number(start + width)}`;
}

function topGuide(
  title: string,
  sizes: string[],
  base: {
    chest: number;
    waist: number;
    hip: number;
    shoulder: number;
    length: number;
    sleeve: number;
    circumferenceStep: number;
    pointStep: number;
    rangeWidth: number;
  },
): ShowcaseSizeGuide {
  return {
    title: `${title} · sample body-fit ranges and garment lengths (cm)`,
    headers: [
      "Size",
      "Chest/Bust (cm)",
      "Waist (cm)",
      "Hip (cm)",
      "Shoulder (cm)",
      "Back length (cm)",
      "Sleeve (cm)",
    ],
    rows: sizes.map((size, index) => [
      size,
      measurementRange(
        base.chest + index * base.circumferenceStep,
        base.rangeWidth,
      ),
      measurementRange(
        base.waist + index * base.circumferenceStep,
        base.rangeWidth,
      ),
      measurementRange(
        base.hip + index * base.circumferenceStep,
        base.rangeWidth,
      ),
      number(base.shoulder + index * base.pointStep),
      number(base.length + index * base.pointStep),
      number(base.sleeve + index * 0.5),
    ]),
  };
}

function bottomGuide(
  title: string,
  sizes: string[],
  base: {
    waist: number;
    hip: number;
    rise: number;
    inseam: number;
    hem: number;
    circumferenceStep: number;
    riseStep: number;
    hemStep: number;
    rangeWidth: number;
  },
): ShowcaseSizeGuide {
  return {
    title: `${title} · sample body-fit ranges and garment measurements (cm)`,
    headers: [
      "Size",
      "Waist (cm)",
      "Hip (cm)",
      "Front rise (cm)",
      "Inseam/Length (cm)",
      "Hem circumference (cm)",
    ],
    rows: sizes.map((size, index) => [
      size,
      measurementRange(
        base.waist + index * base.circumferenceStep,
        base.rangeWidth,
      ),
      measurementRange(
        base.hip + index * base.circumferenceStep,
        base.rangeWidth,
      ),
      number(base.rise + index * base.riseStep),
      number(base.inseam),
      number(base.hem + index * base.hemStep),
    ]),
  };
}

function skirtGuide(
  title: string,
  sizes: string[],
  base: {
    waist: number;
    hip: number;
    length: number;
    hem: number;
    circumferenceStep: number;
    lengthStep: number;
    hemStep: number;
    rangeWidth: number;
  },
): ShowcaseSizeGuide {
  return {
    title: `${title} · sample body-fit ranges and garment measurements (cm)`,
    headers: [
      "Size",
      "Waist (cm)",
      "Hip (cm)",
      "Skirt length (cm)",
      "Hem sweep (cm)",
    ],
    rows: sizes.map((size, index) => [
      size,
      measurementRange(
        base.waist + index * base.circumferenceStep,
        base.rangeWidth,
      ),
      measurementRange(
        base.hip + index * base.circumferenceStep,
        base.rangeWidth,
      ),
      number(base.length + index * base.lengthStep),
      number(base.hem + index * base.hemStep),
    ]),
  };
}

function shoeGuide(
  title: string,
  sizes: string[],
  base: {
    footLength: number;
    insoleLength: number;
    width: number;
    heel: number;
  },
): ShowcaseSizeGuide {
  return {
    title: `${title} · sample footwear measurements (cm)`,
    headers: [
      "Size",
      "Foot length (cm)",
      "Insole length (cm)",
      "Outsole width (cm)",
      "Heel/sole height (cm)",
    ],
    rows: sizes.map((size, index) => [
      size,
      measurementRange(base.footLength + index * 0.67, 0.4),
      number(base.insoleLength + index * 0.67),
      number(base.width + index * 0.12),
      number(base.heel),
    ]),
  };
}

export const SHOWCASE_PRODUCT_SPECIFICATIONS: Record<
  string,
  ShowcaseProductSpecification
> = {
  "women-camel-pinstripe-tailored-blazer": {
    details: [
      "Single-breasted front with one dark horn-effect button",
      "Softly structured shoulder, long notched lapel and shaped waist seams",
      "Two angled welt pockets and a single rear vent",
    ],
    materialDetails: [
      "Illustrative composition: 55% wool, 30% linen, 15% recycled polyester",
      "Illustrative lining: 100% viscose",
      "Horn-effect resin button and tonal internal binding",
    ],
    careInstructions: [
      "Specialist dry clean only",
      "Steam lightly; do not press directly over the pinstripe or lapel roll",
    ],
    fitDescription:
      "Tailored close through the shoulder and waist with room for a light base layer. Bust and waist are body-fit ranges; shoulder, back length and sleeve are finished-garment measurements.",
    fitNotes: [
      "Model styling shows a close tailored fit",
      "Choose the larger size for broader shoulders or layered styling",
    ],
    sizeGuide: topGuide(
      "Camel Pinstripe Tailored Blazer",
      ["XS", "S", "M", "L", "XL"],
      {
        chest: 80,
        waist: 62,
        hip: 86,
        shoulder: 38.5,
        length: 67,
        sleeve: 60,
        circumferenceStep: 4.5,
        pointStep: 1.2,
        rangeWidth: 4,
      },
    ),
  },
  "women-dusty-blue-silk-poplin-shirt": {
    details: [
      "Pointed collar with concealed front placket",
      "Full-length sleeves with slim single-button cuffs",
      "Curved shirttail hem with a controlled fluid drape",
    ],
    materialDetails: [
      "Illustrative composition: 55% silk, 45% cotton",
      "Lightweight matte poplin with tonal shell-effect buttons",
    ],
    careInstructions: [
      "Cold hand wash or specialist clean",
      "Dry flat and use a cool iron on the reverse",
    ],
    fitDescription:
      "Easy straight fit through the bust and waist. Body ranges drive SDK sizing; shoulder, back length and sleeve describe the finished shirt.",
    fitNotes: [
      "True to size for a relaxed shirt fit",
      "Size down only for a closer silhouette",
    ],
    sizeGuide: topGuide(
      "Dusty Blue Silk-Poplin Shirt",
      ["XS", "S", "M", "L", "XL"],
      {
        chest: 80,
        waist: 62,
        hip: 86,
        shoulder: 39,
        length: 69,
        sleeve: 59.5,
        circumferenceStep: 4.5,
        pointStep: 1.1,
        rangeWidth: 4,
      },
    ),
  },
  "women-chocolate-tailored-trouser": {
    details: [
      "High-rise waistband with concealed hook-and-zip fastening",
      "Two controlled front pleats and pressed front-and-back creases",
      "Straight full-length leg with side pockets and rear welt pockets",
    ],
    materialDetails: [
      "Illustrative composition: 54% wool, 43% recycled polyester, 3% elastane",
      "Pocketing: 65% polyester, 35% cotton",
    ],
    careInstructions: [
      "Specialist dry clean",
      "Steam creases into shape; do not tumble dry",
    ],
    fitDescription:
      "High-rise, fitted at the waist and easy through the hip and thigh. Waist and hip are body-fit ranges; rise, inseam and hem are garment measurements.",
    fitNotes: [
      "Full-length 82.5 cm inseam",
      "Choose the larger tagged waist if between sizes",
    ],
    sizeGuide: bottomGuide(
      "Chocolate Tailored Trouser",
      ["24", "26", "28", "30", "32"],
      {
        waist: 60,
        hip: 84,
        rise: 29.5,
        inseam: 82.5,
        hem: 45,
        circumferenceStep: 5,
        riseStep: 0.4,
        hemStep: 1,
        rangeWidth: 3,
      },
    ),
  },
  "women-sage-grey-pleated-midi-skirt": {
    details: [
      "Narrow fixed waistband with concealed side zip",
      "Controlled knife pleats opening below the hip",
      "Below-knee A-line silhouette with clean internal finishing",
    ],
    materialDetails: [
      "Illustrative composition: 68% recycled polyester, 28% viscose, 4% elastane",
      "Lightweight tonal lining through the upper skirt",
    ],
    careInstructions: [
      "Cold gentle wash in a garment bag or specialist clean",
      "Hang dry and steam vertically to preserve the pleats",
    ],
    fitDescription:
      "Sits at the natural waist with a smooth upper hip before the pleats release. Waist and hip are body-fit ranges; the length is measured from the top waistband.",
    fitNotes: [
      "Midi length increases slightly by size",
      "Choose the larger size when the waist falls between ranges",
    ],
    sizeGuide: skirtGuide(
      "Sage-Grey Pleated Midi Skirt",
      ["XS", "S", "M", "L", "XL"],
      {
        waist: 62,
        hip: 86,
        length: 78,
        hem: 172,
        circumferenceStep: 4.5,
        lengthStep: 0.5,
        hemStep: 4,
        rangeWidth: 4,
      },
    ),
  },
  "women-oxblood-leather-slingback-pump": {
    details: [
      "Pointed toe with a low sculpted heel",
      "Adjustable slingback strap with a small metal buckle",
      "Leather outsole with a discreet rubber forepart insert",
    ],
    materialDetails: [
      "Illustrative upper and lining: smooth calf leather",
      "Leather sole, rubber grip insert and metal buckle",
    ],
    careInstructions: [
      "Wipe with a soft dry cloth after wear",
      "Use neutral leather cream and store with toe support",
    ],
    fitDescription:
      "Standard European fit with a pointed toe. Match using foot length first; use outsole width as a secondary comfort check.",
    fitNotes: [
      "If between foot-length ranges, choose the next EU size",
      "Low 4.5 cm heel; adjustable slingback provides limited heel hold correction",
    ],
    sizeGuide: shoeGuide(
      "Oxblood Leather Slingback Pump",
      ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41"],
      { footLength: 22.6, insoleLength: 23.5, width: 7.9, heel: 4.5 },
    ),
  },
  "women-ivory-leather-court-sneaker": {
    details: [
      "Low-profile lace-up court shape with rounded toe",
      "Tonal leather panels and suede heel tab",
      "Flexible rubber cupsole with a padded collar",
    ],
    materialDetails: [
      "Illustrative upper: calf leather with suede heel detail",
      "Textile lining, cushioned insole and rubber outsole",
    ],
    careInstructions: [
      "Spot clean with a soft damp cloth",
      "Do not machine wash; air dry away from direct heat",
    ],
    fitDescription:
      "Standard European sneaker fit with light toe allowance. Foot length is the primary SDK matching field.",
    fitNotes: [
      "Choose the larger size for a wide forefoot or thicker socks",
      "Removable cushioned insole",
    ],
    sizeGuide: shoeGuide(
      "Ivory Leather Court Sneaker",
      ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41"],
      { footLength: 22.6, insoleLength: 23.6, width: 8.2, heel: 3 },
    ),
  },
  "women-espresso-soft-shoulder-bag": {
    details: [
      "Crescent body with curved top zip",
      "Broad adjustable shoulder strap and reinforced base gusset",
      "Single lined interior with one slip pocket",
    ],
    materialDetails: [
      "Illustrative outer: pebbled calf leather",
      "Cotton-twill lining with brushed-brass hardware",
    ],
    careInstructions: [
      "Store filled in its dust bag",
      "Avoid prolonged moisture, heat and contact with pale fabrics",
    ],
    fitDescription:
      "One-size carried accessory. Dimensions describe the finished bag and strap drop rather than body-size eligibility.",
    fitNotes: [
      "Fits a large phone, wallet and small essentials",
      "Shoulder carry",
    ],
    sizeGuide: {
      title: "Espresso Soft Shoulder Bag · finished dimensions (cm)",
      headers: [
        "Size",
        "Width (cm)",
        "Height (cm)",
        "Depth (cm)",
        "Strap drop (cm)",
      ],
      rows: [["One size", "29", "18", "9", "24"]],
    },
  },
  "women-stone-woven-mini-tote": {
    details: [
      "Hand-woven trapezoidal body with two rounded top handles",
      "Tonal suede-lined interior with magnetic closure",
      "Structured base designed to stand upright",
    ],
    materialDetails: [
      "Illustrative outer: woven matte calf leather",
      "Tonal suede lining and concealed magnetic closure",
    ],
    careInstructions: [
      "Store upright and lightly filled",
      "Avoid snagging the woven surface or exposing it to rain",
    ],
    fitDescription:
      "One-size hand-carry accessory. Dimensions describe the finished item.",
    fitNotes: ["Compact capacity", "10 cm handle drop"],
    sizeGuide: {
      title: "Stone Woven Mini Tote · finished dimensions (cm)",
      headers: [
        "Size",
        "Width (cm)",
        "Height (cm)",
        "Depth (cm)",
        "Handle drop (cm)",
      ],
      rows: [["One size", "22", "19", "11", "10"]],
    },
  },
  "women-tortoiseshell-resin-hoop-set": {
    details: [
      "Matching pair of sculptural medium hoops",
      "Softly irregular rounded profile with amber marbling",
      "Gold-tone post-and-butterfly fastening",
    ],
    materialDetails: [
      "Illustrative body: hand-polished resin",
      "Gold-tone plated brass posts",
    ],
    careInstructions: [
      "Keep dry and store separately",
      "Avoid perfume, hairspray and abrasive cleaners",
    ],
    fitDescription:
      "One-size pierced-ear accessory. Diameter, width and unit weight describe each earring.",
    fitNotes: ["Medium statement scale", "Sold as one matching pair"],
    sizeGuide: {
      title: "Tortoiseshell Resin Hoop Set · finished dimensions",
      headers: ["Size", "Diameter (mm)", "Width (mm)", "Weight each (g)"],
      rows: [["One size", "34", "9", "7"]],
    },
  },
  "women-burgundy-silk-scarf": {
    details: [
      "Square scarf with an original geometric border motif",
      "Double-sided print with hand-rolled edges",
      "Designed for neck, hair or bag-handle styling",
    ],
    materialDetails: ["Illustrative composition: 100% silk twill"],
    careInstructions: [
      "Specialist dry clean",
      "Store folded away from direct sunlight and sharp jewelry",
    ],
    fitDescription:
      "One-size square accessory. Width and length describe the finished scarf.",
    fitNotes: ["70 cm square", "Multiple styling uses"],
    sizeGuide: {
      title: "Burgundy Silk Scarf · finished dimensions (cm)",
      headers: ["Size", "Width (cm)", "Length (cm)", "Edge finish"],
      rows: [["One size", "70", "70", "Hand rolled"]],
    },
  },
  "men-espresso-double-breasted-blazer": {
    details: [
      "Double-breasted six-button front with broad peak lapels",
      "Natural shoulder, shaped waist and double rear vents",
      "Chest welt pocket, two flap pockets and four-button cuffs",
    ],
    materialDetails: [
      "Illustrative composition: 96% wool, 4% elastane",
      "Illustrative lining: 100% viscose",
      "Tonal horn-effect resin buttons",
    ],
    careInstructions: [
      "Specialist dry clean only",
      "Steam lightly and store on a shaped jacket hanger",
    ],
    fitDescription:
      "Modern tailored fit with a natural shoulder and controlled waist. Chest and waist are body-fit ranges; shoulder, back length and sleeve are finished-garment measurements.",
    fitNotes: [
      "True to size over a shirt or fine knit",
      "Choose the larger size for a broader chest or layered styling",
    ],
    sizeGuide: topGuide(
      "Espresso Double-Breasted Blazer",
      ["S", "M", "L", "XL", "XXL"],
      {
        chest: 88,
        waist: 76,
        hip: 92,
        shoulder: 44,
        length: 73,
        sleeve: 63,
        circumferenceStep: 6,
        pointStep: 1.2,
        rangeWidth: 5,
      },
    ),
  },
  "men-muted-slate-knit-polo": {
    details: [
      "Open polo collar without buttons",
      "Fully fashioned shoulder and short sleeves",
      "Fine rib finish at sleeve cuffs and hem",
    ],
    materialDetails: [
      "Illustrative composition: 100% extra-fine merino wool",
      "Fine-gauge breathable knit",
    ],
    careInstructions: [
      "Cold hand wash with wool detergent",
      "Reshape and dry flat; do not hang while wet",
    ],
    fitDescription:
      "Regular fit through chest and waist with a clean hip-length hem. Chest and waist are body-fit ranges; remaining values are garment measurements.",
    fitNotes: ["True to size", "Choose the larger size for a relaxed knit fit"],
    sizeGuide: topGuide("Muted Slate Knit Polo", ["S", "M", "L", "XL", "XXL"], {
      chest: 88,
      waist: 76,
      hip: 92,
      shoulder: 42,
      length: 68,
      sleeve: 23,
      circumferenceStep: 6,
      pointStep: 1.2,
      rangeWidth: 5,
    }),
  },
  "men-charcoal-pleated-trouser": {
    details: [
      "Extended-tab high-rise waistband",
      "Two forward pleats with pressed front-and-back creases",
      "Straight relaxed leg, side pockets and rear welt pockets",
    ],
    materialDetails: [
      "Illustrative composition: 98% wool, 2% elastane",
      "Pocketing: 65% polyester, 35% cotton",
    ],
    careInstructions: [
      "Specialist dry clean",
      "Steam creases; do not tumble dry",
    ],
    fitDescription:
      "High-rise with room through the seat and thigh. Waist and hip are body-fit ranges; rise, inseam and hem are garment measurements.",
    fitNotes: [
      "81 cm regular inseam",
      "Choose the larger waist when between sizes",
    ],
    sizeGuide: bottomGuide(
      "Charcoal Pleated Trouser",
      ["28", "30", "32", "34", "36", "38"],
      {
        waist: 70,
        hip: 88,
        rise: 29,
        inseam: 81,
        hem: 43,
        circumferenceStep: 5,
        riseStep: 0.4,
        hemStep: 1,
        rangeWidth: 4,
      },
    ),
  },
  "men-sand-straight-tailored-trouser": {
    details: [
      "Medium-rise flat-front waistband with concealed fastening",
      "Pressed crease and straight full-length leg",
      "Slanted side pockets and two rear welt pockets",
    ],
    materialDetails: [
      "Illustrative composition: 58% linen, 40% wool, 2% elastane",
      "Cotton-blend pocketing",
    ],
    careInstructions: [
      "Specialist dry clean",
      "Steam lightly; natural slubs are part of the fabric character",
    ],
    fitDescription:
      "Straight fit from hip to hem with a medium rise. Waist and hip are body-fit ranges; rise, inseam and hem are garment measurements.",
    fitNotes: ["81.5 cm regular inseam", "True to tagged waist"],
    sizeGuide: bottomGuide(
      "Sand Straight Tailored Trouser",
      ["28", "30", "32", "34", "36", "38"],
      {
        waist: 70,
        hip: 88,
        rise: 27.5,
        inseam: 81.5,
        hem: 42,
        circumferenceStep: 5,
        riseStep: 0.4,
        hemStep: 1,
        rangeWidth: 4,
      },
    ),
  },
  "men-chocolate-suede-court-sneaker": {
    details: [
      "Low-profile lace-up court shape",
      "Minimal suede panels with tonal laces",
      "Slim warm-ivory rubber cupsole and padded collar",
    ],
    materialDetails: [
      "Illustrative upper: fine calf suede",
      "Leather-textile lining, cushioned insole and rubber outsole",
    ],
    careInstructions: [
      "Brush dry suede with a dedicated suede brush",
      "Do not saturate; air dry away from direct heat",
    ],
    fitDescription:
      "Standard European sneaker fit. Match by foot length first, then use outsole width for forefoot comfort.",
    fitNotes: [
      "Choose the larger size for a broad forefoot",
      "Designed for medium-weight socks",
    ],
    sizeGuide: shoeGuide(
      "Chocolate Suede Court Sneaker",
      ["EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45", "EU 46"],
      { footLength: 25, insoleLength: 26, width: 9.2, heel: 2.8 },
    ),
  },
  "men-oxblood-penny-loafer": {
    details: [
      "Almond toe with traditional penny saddle",
      "Precise apron stitching and stacked leather heel",
      "Leather sole with a discreet rubber grip insert",
    ],
    materialDetails: [
      "Illustrative upper and lining: polished calf leather",
      "Leather-and-rubber sole with stacked leather heel",
    ],
    careInstructions: [
      "Wipe clean and polish with matching or neutral cream",
      "Use shoe trees between wears",
    ],
    fitDescription:
      "Structured European loafer fit with minimal stretch at first. Match by foot length and use outsole width as a secondary check.",
    fitNotes: [
      "Choose the larger size for a high instep",
      "Heel should feel secure without pinching",
    ],
    sizeGuide: shoeGuide(
      "Oxblood Penny Loafer",
      ["EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45", "EU 46"],
      { footLength: 25, insoleLength: 25.9, width: 9.1, heel: 2.5 },
    ),
  },
  "men-dark-olive-crossbody-sling": {
    details: [
      "Compact curved body with concealed top zip",
      "Adjustable webbing strap with gunmetal clips",
      "Lined interior with one slip pocket",
    ],
    materialDetails: [
      "Illustrative outer: 100% recycled nylon twill",
      "Tonal calf-leather trim and recycled-polyester lining",
    ],
    careInstructions: [
      "Spot clean only",
      "Remove surface moisture promptly and air dry",
    ],
    fitDescription:
      "One-size crossbody accessory. Bag dimensions and adjustable strap length describe the finished item.",
    fitNotes: ["Adjustable 82–138 cm strap", "Can be worn at chest or hip"],
    sizeGuide: {
      title: "Dark Olive Crossbody Sling · finished dimensions (cm)",
      headers: [
        "Size",
        "Width (cm)",
        "Height (cm)",
        "Depth (cm)",
        "Strap length (cm)",
      ],
      rows: [["One size", "25", "17", "7", "82–138"]],
    },
  },
  "men-warm-grey-soft-weekender": {
    details: [
      "Soft rectangular body with full top zip",
      "Two attached leather handles and reinforced base corners",
      "Cotton-lined interior with one zip and two slip pockets",
    ],
    materialDetails: [
      "Illustrative outer: dense cotton canvas",
      "Calf-leather trim, cotton lining and brushed-brass hardware",
    ],
    careInstructions: [
      "Spot clean canvas and condition leather trim separately",
      "Store lightly filled in a dry place",
    ],
    fitDescription:
      "One-size carry accessory. Dimensions describe the finished bag and handle drop.",
    fitNotes: [
      "Approximate 31-litre capacity",
      "Cabin suitability depends on carrier rules",
    ],
    sizeGuide: {
      title: "Warm Grey Soft Weekender · finished dimensions (cm)",
      headers: [
        "Size",
        "Width (cm)",
        "Height (cm)",
        "Depth (cm)",
        "Handle drop (cm)",
      ],
      rows: [["One size", "48", "30", "22", "18"]],
    },
  },
  "men-tortoiseshell-acetate-sunglasses": {
    details: [
      "Modern rectangular frame with softly rounded corners",
      "Integrated nose bridge and clean unbranded temples",
      "Smoke-tint lenses",
    ],
    materialDetails: [
      "Illustrative frame: polished acetate",
      "Smoke-tint lenses and metal hinge hardware",
    ],
    careInstructions: [
      "Clean with a microfibre cloth",
      "Store in a hard case; avoid prolonged heat",
    ],
    fitDescription:
      "One-size eyewear. Lens, bridge, temple and total frame width describe the finished frame.",
    fitNotes: ["Medium face fit", "Frame width 142 mm"],
    sizeGuide: {
      title: "Tortoiseshell Acetate Sunglasses · frame dimensions (mm)",
      headers: [
        "Size",
        "Lens width (mm)",
        "Bridge (mm)",
        "Temple (mm)",
        "Frame width (mm)",
      ],
      rows: [["One size", "50", "20", "145", "142"]],
    },
  },
  "men-burgundy-leather-strap-watch": {
    details: [
      "Minimal warm-ivory dial with baton markers",
      "Brushed-silver round case and slim crown",
      "Smooth burgundy leather strap with pin buckle",
    ],
    materialDetails: [
      "Illustrative case: brushed stainless steel",
      "Calf-leather strap and mineral-glass crystal",
    ],
    careInstructions: [
      "Wipe with a soft dry cloth",
      "Keep the leather strap away from water, fragrance and prolonged heat",
    ],
    fitDescription:
      "One-size watch with an adjustable strap. Case, lug width and wrist range describe the finished item.",
    fitNotes: ["Fits approximately 16–21 cm wrists", "38 mm case diameter"],
    sizeGuide: {
      title: "Burgundy Leather Strap Watch · finished dimensions",
      headers: [
        "Size",
        "Case (mm)",
        "Strap width (mm)",
        "Wrist range (cm)",
        "Case thickness (mm)",
      ],
      rows: [["One size", "38", "20", "16–21", "8.5"]],
    },
  },
};

export function getShowcaseProductSpecification(productId: string) {
  return SHOWCASE_PRODUCT_SPECIFICATIONS[productId];
}

export function getShowcaseProduct(productId: string) {
  return SHOWCASE_PRODUCTS.find((product) => product.id === productId);
}

export function getShowcaseProductsByGender(gender: ShowcaseGender) {
  return SHOWCASE_PRODUCTS.filter((product) => product.gender === gender);
}

export function isOneSizeProduct(product: Pick<ShowcaseProduct, "sizes">) {
  return product.sizes.length === 1 && product.sizes[0] === "One size";
}
