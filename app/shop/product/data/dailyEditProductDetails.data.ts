import { dailyEditProducts } from "../../data/dailyEdit.data";
import type { ProductDetailViewModel, ProductSizeGuideData } from "../types/productDetail.types";
import { formatProductPrice } from "../utils/productDetail.utils";

type MockSpecification = {
  asset: string;
  category: string;
  colorHex: string;
  description: string;
  details: string[];
  material: string;
  fit: string;
  sizeGuide: ProductSizeGuideData;
};

const specifications: Record<string, MockSpecification> = {
  "daily-edit-vela-denim": {
    asset: "vela",
    category: "Denim jackets",
    colorHex: "#172c49",
    description: "The indigo cropped jacket from the Daily Edit. A boxy trucker silhouette, rounded sleeves and golden contrast stitching bring structure to a clean, short hem.",
    details: ["Pointed collar and silver-tone button front", "Two buttoned chest flap pockets", "Dropped shoulders and full-length sleeves", "Jacket only; ivory trousers and blue shoes are styling pieces"],
    material: "Mock specification: 100% cotton denim with metal buttons. Cold gentle wash, inside out; line dry.",
    fit: "Boxy, relaxed body with a cropped length. The chart describes the jacket, not the trousers in the styled image.",
    sizeGuide: {
      title: "Vela jacket · sample garment measurements (cm)",
      headers: ["Size", "Chest", "Shoulder", "Length", "Sleeve"],
      rows: [["XS", "104", "50", "43", "55"], ["S", "108", "52", "44", "56"], ["M", "112", "54", "45", "57"], ["L", "118", "56", "46.5", "58"], ["XL", "124", "58", "48", "59"], ["XXL", "130", "60", "49.5", "60"]],
    },
  },
  "daily-edit-cobalt-track": {
    asset: "cobalt",
    category: "Men’s sets",
    colorHex: "#064ccb",
    description: "Cobalt above, ivory below. The Daily Edit’s relaxed two-piece set pairs a hooded blue windbreaker with easy ivory joggers, finished with black zip hardware and gathered cuffs.",
    details: ["Set includes the cobalt jacket and ivory trousers", "Hooded jacket with black zip fastening and zip pockets", "Elasticated trouser waist and ankle cuffs", "White T-shirt and sneakers are styling pieces, not included"],
    material: "Mock specification: nylon outer with a lightweight polyester lining. Cold gentle wash; air dry. No performance or waterproof rating is claimed.",
    fit: "Relaxed jacket and trousers. One size selection applies to both pieces. Waist is the relaxed trouser circumference; inseam measures the inside leg.",
    sizeGuide: {
      title: "Cobalt set · sample garment measurements (cm)",
      headers: ["Size", "Jacket chest", "Jacket length", "Waist", "Inseam"],
      rows: [["S", "112", "66", "72", "74"], ["M", "118", "68", "78", "75"], ["L", "124", "70", "84", "76"], ["XL", "130", "72", "90", "77"], ["XXL", "136", "74", "96", "78"], ["3XL", "142", "76", "102", "79"]],
    },
  },
  "daily-edit-noir-halo": {
    asset: "noir",
    category: "Blazer dresses",
    colorHex: "#171716",
    description: "Sharp tailoring with a small flash of light. This black blazer mini dress keeps the Daily Edit’s notched lapels, gathered wrap waist and delicate crystal spray at the left side.",
    details: ["Structured shoulders and long, slim sleeves", "Asymmetric wrap-over mini silhouette", "Silver-tone crystal detail at the wearer’s left waist", "Blazer dress only; the coral bag and cream boots are styling pieces"],
    material: "Mock specification: polyester-viscose crepe with a smooth lining and decorative crystals. Specialist cleaning; avoid direct heat on the embellishment.",
    fit: "Tailored through the bust and waist with a mini-length wrap hem. Measurements describe the finished garment, not body-size recommendations.",
    sizeGuide: {
      title: "Noir blazer dress · sample garment measurements (cm)",
      headers: ["Size", "Bust", "Waist", "Hip", "Length"],
      rows: [["XS", "86", "68", "92", "78"], ["S", "90", "72", "96", "79"], ["M", "94", "76", "100", "80"], ["L", "100", "82", "106", "81.5"], ["XL", "106", "88", "112", "83"], ["XXL", "112", "94", "118", "84.5"]],
    },
  },
  "daily-edit-signal-shell": {
    asset: "signal",
    category: "Puffer jackets",
    colorHex: "#ff603d",
    description: "The bright coral puffer from the Daily Edit, with its glossy finish, cropped body and generous quilted sleeves. A tall stand collar and gold-tone zip complete the shape.",
    details: ["Glossy orange-coral finish with horizontal quilting", "Cropped silhouette and padded stand collar", "Full-length zip fastening and elastic sleeve cuffs", "Jacket only; tank, trousers, blue bag and accessories are styling pieces"],
    material: "Mock specification: coated nylon shell with polyester lining and fill. Gentle spot cleaning; no insulation or weather-resistance rating is claimed.",
    fit: "Relaxed padded body with a short hem. Sleeve length is measured from the dropped shoulder seam. The chart is illustrative, not a verified fit guarantee.",
    sizeGuide: {
      title: "Signal puffer · sample garment measurements (cm)",
      headers: ["Size", "Chest", "Hem", "Length", "Sleeve"],
      rows: [["XS", "104", "90", "43", "56"], ["S", "108", "94", "44", "57"], ["M", "112", "98", "45", "58"], ["L", "118", "104", "46.5", "59"], ["XL", "124", "110", "48", "60"], ["XXL", "130", "116", "49.5", "61"]],
    },
  },
};

export const dailyEditProductDetails: ProductDetailViewModel[] = dailyEditProducts.map((product) => {
  const spec = specifications[product.id];
  const imageBase = `/media/global-shop/daily-edit-pdp-v1/${spec.asset}`;
  return {
    id: product.id,
    name: product.name,
    brandName: product.brand,
    badge: "Daily Edit · Mock product",
    isMock: true,
    category: spec.category,
    color: product.tone,
    colorHex: spec.colorHex,
    styleCode: `DE-${spec.asset.toUpperCase()}-01`,
    description: spec.description,
    priceLabel: formatProductPrice(product.price * 100),
    priceCents: product.price * 100,
    currency: "USD",
    sizes: spec.sizeGuide.rows.map(([size]) => size),
    sizeGuide: spec.sizeGuide,
    gallery: [
      { id: `${product.id}-styled`, src: product.image, alt: `${product.name} — original Daily Edit styled look` },
      { id: `${product.id}-front`, src: `${imageBase}-front.png`, alt: `${product.name} — generated front product view` },
      { id: `${product.id}-back`, src: `${imageBase}-back.png`, alt: `${product.name} — generated back product view` },
      { id: `${product.id}-detail`, src: `${imageBase}-detail.png`, alt: `${product.name} — generated fabric and construction detail` },
    ],
    featureImage: `${imageBase}-detail.png`,
    sourceHref: "/shop#outfit-edit",
    sourceLabel: "Daily Edit",
    canonicalHref: product.href,
    tryOnSupported: false,
    note: "Concept preview only. Generated imagery, sample prices and mock sizing; not available for purchase.",
    information: [
      { id: "details", title: "Details", summary: spec.description, items: spec.details },
      { id: "materials", title: "Materials & care", summary: spec.material, items: ["Illustrative product specification, not supplier-verified composition"] },
      { id: "fit", title: "Size & fit", summary: spec.fit, items: ["Open Size guide for a full sample measurement chart", "All measurements are in cm; chest, bust, waist, hip and hem are circumferences", "Mock measurements are not a personalized fit recommendation"] },
      { id: "shipping", title: "About this mock", summary: "This is an interactive concept product, matching the garment in the shop landing artwork.", items: ["Add different sizes to the browser-saved bag to test the flow", "No stock, payment, shipping or returns are connected to this mock product", "Additional views are AI-generated interpretations of the original garment"] },
    ],
    related: dailyEditProducts.filter((item) => item.id !== product.id).map((item) => ({
      id: item.id,
      href: item.href,
      brandName: item.brand,
      name: item.name,
      image: item.image,
      priceLabel: formatProductPrice(item.price * 100),
      badge: "Daily Edit",
    })),
  };
});
