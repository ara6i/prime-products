export type ProductReadiness =
  | "Ready"
  | "Needs information"
  | "Conflicting information"
  | "Blocked";

export type ProductSource = "Shopify" | "Merchant API" | "CSV" | "Website";

export type MerchantProduct = {
  id: string;
  merchantProductId: string;
  barcode: string;
  name: string;
  sku: string;
  source: ProductSource;
  category: string;
  price: number;
  stock: number;
  sizes: string[];
  colors: string[];
  sizeChart: "Connected" | "Missing" | "Problem" | "Waiting approval";
  score: number;
  readiness: ProductReadiness;
  problems: string[];
  updated: string;
  updatedOrder: number;
  createdOrder: number;
  image: string;
  material: string;
  fit: string;
  sourceDetail: string;
  changeHistory: Array<{ date: string; title: string; detail: string }>;
};

const PRODUCT_ASSET_ROOT = "/media/merchant-dashboard/generated/products/final";

export const MERCHANT_PRODUCTS: MerchantProduct[] = [
  {
    id: "PRD-10412",
    merchantProductId: "gid://shopify/Product/829104",
    barcode: "042410412805",
    name: "Silk column dress",
    sku: "NTA-DR-10412",
    source: "Shopify",
    category: "Dresses",
    price: 248,
    stock: 34,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Ivory", "Black", "Sage"],
    sizeChart: "Connected",
    score: 100,
    readiness: "Ready",
    problems: [],
    updated: "Today, 09:55",
    updatedOrder: 8,
    createdOrder: 4,
    image: `${PRODUCT_ASSET_ROOT}/product-silk-dress.webp`,
    material: "100% silk",
    fit: "Close fit through the waist",
    sourceDetail: "Shopify product 829104 · read_products",
    changeHistory: [
      { date: "Today, 09:55", title: "Inventory updated", detail: "Three variants changed stock." },
      { date: "01 Aug", title: "Size chart v6 connected", detail: "Approved by Maya Chen." },
      { date: "28 Jul", title: "Product imported", detail: "Imported from Shopify." },
    ],
  },
  {
    id: "PRD-10418",
    merchantProductId: "gid://shopify/Product/829118",
    barcode: "042410418807",
    name: "Tailored wool blazer",
    sku: "NTA-BL-10418",
    source: "Shopify",
    category: "Tailoring",
    price: 320,
    stock: 18,
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Midnight", "Camel"],
    sizeChart: "Waiting approval",
    score: 86,
    readiness: "Needs information",
    problems: ["No material stretch information", "Size chart waiting for approval"],
    updated: "Today, 09:48",
    updatedOrder: 7,
    createdOrder: 3,
    image: `${PRODUCT_ASSET_ROOT}/product-navy-blazer.webp`,
    material: "Wool blend · stretch not supplied",
    fit: "Structured fit",
    sourceDetail: "Shopify product 829118 · read_products",
    changeHistory: [
      { date: "Today, 09:48", title: "Product rescored", detail: "Score remained 86 after sync." },
      { date: "02 Aug", title: "Chart detected", detail: "UK tailoring chart found in Shopify metafields." },
      { date: "29 Jul", title: "Product imported", detail: "Imported from Shopify." },
    ],
  },
  {
    id: "PRD-10431",
    merchantProductId: "api_product_66219",
    barcode: "042410431806",
    name: "Pleated wide-leg trouser",
    sku: "NTA-TR-10431",
    source: "Merchant API",
    category: "Trousers",
    price: 178,
    stock: 42,
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Stone", "Black", "Chocolate"],
    sizeChart: "Connected",
    score: 98,
    readiness: "Ready",
    problems: ["Return window last checked 61 days ago"],
    updated: "Today, 09:44",
    updatedOrder: 6,
    createdOrder: 5,
    image: `${PRODUCT_ASSET_ROOT}/product-stone-trousers.webp`,
    material: "Viscose blend",
    fit: "High rise · relaxed leg",
    sourceDetail: "Merchant API · catalog.read",
    changeHistory: [
      { date: "Today, 09:44", title: "Inventory updated", detail: "Stock increased by 8 units." },
      { date: "30 Jul", title: "Return policy checked", detail: "Merchant policy URL verified." },
      { date: "26 Jul", title: "Product imported", detail: "Imported from Merchant API." },
    ],
  },
  {
    id: "PRD-10442",
    merchantProductId: "csv_row_00442",
    barcode: "042410442802",
    name: "Leather slingback pump",
    sku: "NTA-SH-10442",
    source: "CSV",
    category: "Footwear",
    price: 210,
    stock: 7,
    sizes: ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40"],
    colors: ["Sand", "Black"],
    sizeChart: "Missing",
    score: 61,
    readiness: "Blocked",
    problems: ["No footwear size chart", "EU 39 and EU 40 have no measurements", "Shipping information is missing"],
    updated: "Today, 08:51",
    updatedOrder: 5,
    createdOrder: 8,
    image: `${PRODUCT_ASSET_ROOT}/product-sand-slingbacks.webp`,
    material: "Leather upper",
    fit: "Fit information not supplied",
    sourceDetail: "northstar_catalog_aug.csv · row 442",
    changeHistory: [
      { date: "Today, 08:51", title: "Product blocked", detail: "Required size evidence is missing." },
      { date: "03 Aug", title: "Duplicate cleared", detail: "Merchant confirmed this is the canonical SKU." },
      { date: "03 Aug", title: "Product imported", detail: "Imported from CSV." },
    ],
  },
  {
    id: "PRD-10457",
    merchantProductId: "gid://shopify/Product/829201",
    barcode: "042410457806",
    name: "Cashmere rib cardigan",
    sku: "NTA-KN-10457",
    source: "Shopify",
    category: "Knitwear",
    price: 285,
    stock: 0,
    sizes: ["XS", "S", "M", "L"],
    colors: ["Oat", "Ink"],
    sizeChart: "Connected",
    score: 91,
    readiness: "Needs information",
    problems: ["All variants are out of stock", "Care information is missing"],
    updated: "Yesterday, 18:22",
    updatedOrder: 4,
    createdOrder: 7,
    image: `${PRODUCT_ASSET_ROOT}/product-navy-blazer.webp`,
    material: "Cashmere",
    fit: "Regular fit",
    sourceDetail: "Shopify product 829201 · read_products + read_inventory",
    changeHistory: [
      { date: "Yesterday, 18:22", title: "Inventory reached zero", detail: "All eight variants are unavailable." },
      { date: "31 Jul", title: "Product imported", detail: "Imported from Shopify." },
    ],
  },
  {
    id: "PRD-10463",
    merchantProductId: "web_product_nadia_063",
    barcode: "042410463807",
    name: "Nadia poplin shirt",
    sku: "NTA-SH-10463",
    source: "Website",
    category: "Shirts",
    price: 124,
    stock: 26,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["White", "Sky"],
    sizeChart: "Problem",
    score: 72,
    readiness: "Conflicting information",
    problems: ["Product page and chart disagree for size M", "Two different material values were found"],
    updated: "Yesterday, 16:10",
    updatedOrder: 3,
    createdOrder: 6,
    image: `${PRODUCT_ASSET_ROOT}/product-silk-dress.webp`,
    material: "Cotton poplin / cotton blend conflict",
    fit: "Relaxed fit",
    sourceDetail: "Approved northstar.demo product page · crawl policy v2",
    changeHistory: [
      { date: "Yesterday, 16:10", title: "Conflict found", detail: "Size M bust differs by 4 cm." },
      { date: "02 Aug", title: "Approved page rechecked", detail: "Crawler respected 2 requests/second." },
      { date: "01 Aug", title: "Product imported", detail: "Imported from approved website." },
    ],
  },
  {
    id: "PRD-10470",
    merchantProductId: "api_product_66307",
    barcode: "042410470805",
    name: "Draped jersey midi skirt",
    sku: "NTA-SK-10470",
    source: "Merchant API",
    category: "Skirts",
    price: 148,
    stock: 13,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Plum", "Black"],
    sizeChart: "Connected",
    score: 95,
    readiness: "Ready",
    problems: ["Secondary image is low resolution"],
    updated: "01 Aug, 14:32",
    updatedOrder: 2,
    createdOrder: 2,
    image: `${PRODUCT_ASSET_ROOT}/product-stone-trousers.webp`,
    material: "Viscose jersey",
    fit: "Slim waist · draped hip",
    sourceDetail: "Merchant API · catalog.read",
    changeHistory: [
      { date: "01 Aug, 14:32", title: "Image warning added", detail: "One secondary image is below 800 px." },
      { date: "24 Jul", title: "Product imported", detail: "Imported from Merchant API." },
    ],
  },
  {
    id: "PRD-10488",
    merchantProductId: "gid://shopify/Product/829242",
    barcode: "042410488800",
    name: "Cropped trench jacket",
    sku: "NTA-JK-10488",
    source: "Shopify",
    category: "Outerwear",
    price: 265,
    stock: 21,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Khaki", "Navy"],
    sizeChart: "Connected",
    score: 89,
    readiness: "Needs information",
    problems: ["No fit description", "Size XL has no sleeve measurement"],
    updated: "31 Jul, 11:06",
    updatedOrder: 1,
    createdOrder: 1,
    image: `${PRODUCT_ASSET_ROOT}/product-navy-blazer.webp`,
    material: "Cotton twill",
    fit: "Not supplied",
    sourceDetail: "Shopify product 829242 · read_products",
    changeHistory: [
      { date: "31 Jul, 11:06", title: "Product rescored", detail: "Fit description is still missing." },
      { date: "22 Jul", title: "Product imported", detail: "Imported from Shopify." },
    ],
  },
];

export type ImportMethod = {
  id: "shopify" | "api" | "file" | "website";
  title: string;
  eyebrow: string;
  description: string;
  access: string;
  status: "Connected" | "Ready to connect" | "Needs permission";
  health: string;
  approvedBy: string;
  lastImport: string;
  nextUpdate: string;
};

export const IMPORT_METHODS: ImportMethod[] = [
  {
    id: "shopify",
    title: "Shopify",
    eyebrow: "App connection",
    description: "Install PrimeStyleAI, review the requested access, and approve before any product is read.",
    access: "read_products · read_inventory and read_locations only for live stock",
    status: "Connected",
    health: "Healthy · checked 4 min ago",
    approvedBy: "Maya Chen · 01 Jul 2026",
    lastImport: "Today, 09:55 · 4,812 products",
    nextUpdate: "Today, 10:55 · automatic hourly",
  },
  {
    id: "api",
    title: "Merchant API",
    eyebrow: "Read-only access",
    description: "Use a merchant-approved sign-in or read-only key, then test access before import.",
    access: "catalog.read · variants.read · inventory.read optional",
    status: "Ready to connect",
    health: "Connection test required",
    approvedBy: "Not approved yet",
    lastImport: "No import yet",
    nextUpdate: "Choose after connection",
  },
  {
    id: "file",
    title: "CSV or Excel",
    eyebrow: "File upload",
    description: "Upload a file, match columns, preview errors, and choose the products to import.",
    access: "Local merchant file · no account access",
    status: "Ready to connect",
    health: "Waiting for a file",
    approvedBy: "File uploader becomes approver",
    lastImport: "03 Aug · northstar_catalog_aug.csv",
    nextUpdate: "Manual upload",
  },
  {
    id: "website",
    title: "Approved website",
    eyebrow: "Permissioned crawler",
    description: "Verify domain control, record written permission, and follow the merchant’s access and rate limits.",
    access: "Public approved product URLs only · no login, CAPTCHA, or blocked pages",
    status: "Needs permission",
    health: "DNS proof and written approval missing",
    approvedBy: "Not approved yet",
    lastImport: "No import yet",
    nextUpdate: "Choose after approval",
  },
];

export type SizeChartRecord = {
  id: string;
  name: string;
  category: string;
  region: string;
  units: "cm" | "in";
  basis: "Body measurements" | "Garment measurements" | "Foot length";
  source: string;
  products: number;
  status: "Approved" | "Waiting approval" | "Problem" | "Missing values";
  issue: string;
  version: string;
  updated: string;
  measurements: Array<{ size: string; first: string; second: string; third: string }>;
};

export const SIZE_CHARTS: SizeChartRecord[] = [
  {
    id: "SIZ-03142",
    name: "Women’s dresses · US",
    category: "Dresses",
    region: "United States",
    units: "in",
    basis: "Body measurements",
    source: "Merchant CSV · chart-v6.csv",
    products: 164,
    status: "Problem",
    issue: "Bust ranges overlap between M and L on 12 products.",
    version: "v6",
    updated: "Today, 09:12",
    measurements: [
      { size: "XS", first: "31–32", second: "24–25", third: "34–35" },
      { size: "S", first: "33–34", second: "26–27", third: "36–37" },
      { size: "M", first: "35–37", second: "28–30", third: "38–40" },
      { size: "L", first: "36–39", second: "31–33", third: "41–43" },
      { size: "XL", first: "40–42", second: "34–36", third: "44–46" },
    ],
  },
  {
    id: "SIZ-03118",
    name: "Women’s tailoring · UK",
    category: "Tailoring",
    region: "United Kingdom",
    units: "cm",
    basis: "Garment measurements",
    source: "Shopify metafield · sizing.tailoring_uk",
    products: 88,
    status: "Waiting approval",
    issue: "Automatically found and waiting for merchant approval.",
    version: "Detected draft",
    updated: "02 Aug, 17:30",
    measurements: [
      { size: "6", first: "82", second: "68", third: "91" },
      { size: "8", first: "86", second: "72", third: "95" },
      { size: "10", first: "90", second: "76", third: "99" },
      { size: "12", first: "94", second: "80", third: "103" },
    ],
  },
  {
    id: "SIZ-03091",
    name: "Women’s trousers · Global",
    category: "Trousers",
    region: "Global",
    units: "cm",
    basis: "Body measurements",
    source: "Merchant API · sizing/trousers",
    products: 126,
    status: "Approved",
    issue: "No problems found in the latest check.",
    version: "v5",
    updated: "01 Aug, 10:05",
    measurements: [
      { size: "XS", first: "62–66", second: "86–90", third: "78" },
      { size: "S", first: "67–71", second: "91–95", third: "79" },
      { size: "M", first: "72–76", second: "96–100", third: "80" },
      { size: "L", first: "77–83", second: "101–107", third: "81" },
    ],
  },
  {
    id: "SIZ-03072",
    name: "Footwear · EU",
    category: "Footwear",
    region: "European Union",
    units: "cm",
    basis: "Foot length",
    source: "Uploaded PDF · northstar-footwear.pdf",
    products: 42,
    status: "Missing values",
    issue: "EU 39 and EU 40 have no foot-length measurements.",
    version: "v2",
    updated: "31 Jul, 08:40",
    measurements: [
      { size: "36", first: "23.0", second: "—", third: "—" },
      { size: "37", first: "23.7", second: "—", third: "—" },
      { size: "38", first: "24.3", second: "—", third: "—" },
      { size: "39", first: "Missing", second: "—", third: "—" },
      { size: "40", first: "Missing", second: "—", third: "—" },
    ],
  },
];

export const PRODUCT_HEALTH_CHECKS = [
  "Title",
  "Description",
  "Category",
  "SKU",
  "Images",
  "Price",
  "Stock",
  "Sizes",
  "Colors",
  "Variants",
  "Material",
  "Fit",
  "Size chart",
  "Shipping",
  "Returns",
] as const;
