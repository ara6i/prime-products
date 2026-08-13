import type {
  BrandEditorialAssets,
  EditorialStory,
} from "../types/brandCatalog.types";

export const brandEditorialAssets: BrandEditorialAssets = {
  dropped: "/media/global-shop/brand-editorial/brand-drop-four-panel.webp",
  gender: "/media/global-shop/brand-editorial/brand-gender-collage.webp",
  promos: "/media/global-shop/brand-editorial/brand-promos-three-panel.webp",
  news: "/media/global-shop/brand-editorial/brand-news-three-panel.webp",
};

export const editorialPromoStories: EditorialStory[] = [
  {
    eyebrow: "Sunglasses",
    title: "Beach days, sharpened",
    href: "/shop/category/accessories",
  },
  {
    eyebrow: "Movement",
    title: "Activewear, reworked",
    href: "/shop/category/men",
  },
  {
    eyebrow: "Accessories",
    title: "The new carry",
    href: "/shop/category/accessories",
  },
];

export const editorialNewsStories: EditorialStory[] = [
  {
    eyebrow: "Summer edit",
    title: "The coast collection",
    href: "/shop/category/women",
  },
  {
    eyebrow: "Travel edit",
    title: "Looks built to move",
    href: "/shop/category/men",
  },
  {
    eyebrow: "Cold weather",
    title: "The luxury layer",
    href: "/shop/category/denim",
  },
];
