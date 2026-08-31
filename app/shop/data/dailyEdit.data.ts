import type { GlobalShopProduct } from "../types/globalShop.types";

// Keep the landing artwork, names, brands and prices in sync with their mock PDPs.
export const dailyEditProducts: (GlobalShopProduct & { href: string })[] = [
  {
    id: "daily-edit-vela-denim",
    href: "/shop/product/daily-edit-vela-denim",
    name: "Vela Cropped Denim",
    brand: "Northline",
    price: 148,
    category: "Denim",
    image: "/media/global-shop/product-denim-blonde-3d.webp",
    tone: "Indigo",
    note: "Cropped denim jacket",
  },
  {
    id: "daily-edit-cobalt-track",
    href: "/shop/product/daily-edit-cobalt-track",
    name: "Cobalt Track Set",
    brand: "Assembly 01",
    price: 72,
    category: "Men",
    image: "/media/global-shop/product-cobalt-3d.webp",
    tone: "Cobalt / Ivory",
    note: "Two-piece track set",
  },
  {
    id: "daily-edit-noir-halo",
    href: "/shop/product/daily-edit-noir-halo",
    name: "Noir Halo Blazer",
    brand: "Onda Studio",
    price: 164,
    category: "Women",
    image: "/media/global-shop/product-coral-black-3d.webp",
    tone: "Black",
    note: "Crystal-detail blazer dress",
  },
  {
    id: "daily-edit-signal-shell",
    href: "/shop/product/daily-edit-signal-shell",
    name: "Signal Sport Shell",
    brand: "Rove Athletics",
    price: 198,
    category: "Women",
    image: "/media/global-shop/product-coral-redhead-3d.webp",
    tone: "Signal coral",
    note: "Glossy cropped puffer",
  },
];
