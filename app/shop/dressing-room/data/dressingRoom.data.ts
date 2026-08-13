export type DressingRoomGender = "Women" | "Men";

export type DressingRoomCategory =
  | "All"
  | "Tops"
  | "Bottoms"
  | "Outerwear"
  | "Dresses"
  | "Shoes"
  | "Bags";

export type DressingRoomCatalogItem = {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  category: Exclude<DressingRoomCategory, "All">;
  genders: DressingRoomGender[];
  aspectRatio: number;
  defaultWidth: number;
  color: string;
  note: string;
};

export type DressingRoomCanvasItem = {
  instanceId: string;
  catalogId: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
  z: number;
};

export const dressingRoomCategories: DressingRoomCategory[] = [
  "All",
  "Tops",
  "Bottoms",
  "Outerwear",
  "Dresses",
  "Shoes",
  "Bags",
];

export const dressingRoomCatalog: DressingRoomCatalogItem[] = [
  {
    id: "signal-shell",
    name: "Signal Shell",
    brand: "Rove Athletics",
    price: 168,
    image: "/media/global-shop/dressing-room/look-15-shell.png",
    category: "Tops",
    genders: ["Women", "Men"],
    aspectRatio: 401 / 402,
    defaultWidth: 190,
    color: "Signal coral",
    note: "Let the cropped volume sit above a clean, high-waisted line.",
  },
  {
    id: "cobalt-track",
    name: "Cobalt Track Set",
    brand: "Assembly 01",
    price: 214,
    image: "/media/global-shop/dressing-room/look-18-track-set.png",
    category: "Bottoms",
    genders: ["Women", "Men"],
    aspectRatio: 468 / 428,
    defaultWidth: 240,
    color: "Electric cobalt",
    note: "Keep the silhouette loose and let one compact accessory sharpen it.",
  },
  {
    id: "noir-blazer",
    name: "Noir Halo Blazer",
    brand: "Onda Studio",
    price: 246,
    image: "/media/global-shop/dressing-room/look-19-blazer.png",
    category: "Outerwear",
    genders: ["Women"],
    aspectRatio: 322 / 356,
    defaultWidth: 190,
    color: "Noir",
    note: "The sculpted shoulder works best against a long, uninterrupted base.",
  },
  {
    id: "camel-trench",
    name: "Form Trench",
    brand: "Northline",
    price: 288,
    image: "/media/global-shop/dressing-room/look-16-coat.png",
    category: "Outerwear",
    genders: ["Women", "Men"],
    aspectRatio: 246 / 401,
    defaultWidth: 175,
    color: "Camel",
    note: "Use the warm neutral as the anchor and keep the rest of the palette spare.",
  },
  {
    id: "lilac-volume",
    name: "Lilac Volume Jacket",
    brand: "Mara & Form",
    price: 188,
    image: "/media/global-shop/dressing-room/look-17-jacket.png",
    category: "Outerwear",
    genders: ["Women", "Men"],
    aspectRatio: 354 / 351,
    defaultWidth: 205,
    color: "Soft lilac",
    note: "Balance the volume with a narrow skirt or a precise trouser.",
  },
  {
    id: "black-column",
    name: "Column Mini Dress",
    brand: "Onda Studio",
    price: 176,
    image: "/media/global-shop/dressing-room/look-16-dress.png",
    category: "Dresses",
    genders: ["Women"],
    aspectRatio: 142 / 319,
    defaultWidth: 128,
    color: "Black",
    note: "A clean black column gives expressive outerwear room to lead.",
  },
  {
    id: "acid-midi",
    name: "Acid Column Skirt",
    brand: "Afterglow",
    price: 132,
    image: "/media/global-shop/dressing-room/look-17-skirt.png",
    category: "Bottoms",
    genders: ["Women"],
    aspectRatio: 164 / 361,
    defaultWidth: 128,
    color: "Acid lime",
    note: "Treat the saturated skirt as one deliberate hit of color.",
  },
  {
    id: "frame-bag",
    name: "Frame 02 Bag",
    brand: "Mara & Form",
    price: 118,
    image: "/media/global-shop/dressing-room/look-17-bag.png",
    category: "Bags",
    genders: ["Women"],
    aspectRatio: 296 / 163,
    defaultWidth: 132,
    color: "Lavender",
    note: "Keep it close to the body line so the small scale feels intentional.",
  },
  {
    id: "cobalt-camera-bag",
    name: "Cobalt Camera Bag",
    brand: "Assembly 01",
    price: 126,
    image: "/media/global-shop/dressing-room/look-18-bag.png",
    category: "Bags",
    genders: ["Women", "Men"],
    aspectRatio: 264 / 151,
    defaultWidth: 138,
    color: "Cobalt",
    note: "Use it as a compact color echo rather than the largest statement.",
  },
  {
    id: "noir-soft-bag",
    name: "Noir Soft Bag",
    brand: "Onda Studio",
    price: 104,
    image: "/media/global-shop/dressing-room/look-15-bag.png",
    category: "Bags",
    genders: ["Women", "Men"],
    aspectRatio: 213 / 235,
    defaultWidth: 118,
    color: "Black",
    note: "A soft black accessory quietly connects tailored and casual pieces.",
  },
  {
    id: "blade-sneaker",
    name: "Blade Sneaker",
    brand: "Rove Athletics",
    price: 154,
    image: "/media/global-shop/dressing-room/look-16-sneaker.png",
    category: "Shoes",
    genders: ["Women", "Men"],
    aspectRatio: 332 / 153,
    defaultWidth: 180,
    color: "Cobalt",
    note: "Let the technical sole break up a polished look with one sporty cue.",
  },
  {
    id: "ink-runner",
    name: "Ink Runner",
    brand: "Afterglow",
    price: 148,
    image: "/media/global-shop/dressing-room/look-18-sneaker.png",
    category: "Shoes",
    genders: ["Women", "Men"],
    aspectRatio: 334 / 156,
    defaultWidth: 180,
    color: "Ink blue",
    note: "This low, dark profile grounds brighter layers without adding weight.",
  },
  {
    id: "ivory-knee-boot",
    name: "Ivory Knee Boot",
    brand: "Mara & Form",
    price: 224,
    image: "/media/global-shop/dressing-room/look-19-boots.png",
    category: "Shoes",
    genders: ["Women"],
    aspectRatio: 198 / 290,
    defaultWidth: 132,
    color: "Ivory",
    note: "The light boot extends the vertical line and softens a dark base.",
  },
  {
    id: "black-ankle-boot",
    name: "Noir Ankle Boot",
    brand: "Northline",
    price: 198,
    image: "/media/global-shop/dressing-room/look-16-black-boots.png",
    category: "Shoes",
    genders: ["Women", "Men"],
    aspectRatio: 302 / 148,
    defaultWidth: 170,
    color: "Black",
    note: "Use the compact boot when the upper silhouette already carries volume.",
  },
];

export const initialDressingRoomCanvasItems: DressingRoomCanvasItem[] = [
  {
    instanceId: "starter-dress",
    catalogId: "black-column",
    x: -86,
    y: -20,
    width: 154,
    rotation: -2,
    z: 1,
  },
  {
    instanceId: "starter-trench",
    catalogId: "camel-trench",
    x: 72,
    y: -35,
    width: 188,
    rotation: 2,
    z: 2,
  },
  {
    instanceId: "starter-bag",
    catalogId: "frame-bag",
    x: 182,
    y: 50,
    width: 122,
    rotation: 4,
    z: 3,
  },
  {
    instanceId: "starter-boots",
    catalogId: "ivory-knee-boot",
    x: 118,
    y: 195,
    width: 126,
    rotation: 1,
    z: 4,
  },
];
