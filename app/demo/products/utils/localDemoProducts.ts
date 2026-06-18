import type { DemoProductApi } from "../types";

const uniformColorVariants = [
  {
    name: "Sky Print",
    hex: "#6EA7D8",
    images: [
      "https://shopcdnpro.grainajz.com/category/68528/3570/19e4f03236bbb3cc6de0c93ad3660651/1.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/1c4fe41903b173e3a48cca1e071b18cc/2.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/f30df7a746ce92b4c633864799f8f244/3.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/a056722fcc26c059cbf10378848ca9a6/4.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/94e50b7686b5814022130ff66444d56a/5.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/8bb419d2cd5de6ea5deb381e6b553aa1/6.jpg",
    ],
  },
  {
    name: "Blush Print",
    hex: "#D8899C",
    images: [
      "https://shopcdnpro.grainajz.com/category/68528/3570/354e21fe5eae5e1c3166b24ad258fdbc/1.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/b585a5f944cfab9da25a80d1b0d79c15/2.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/231b3270d92f9df2a8cc68153382f9b8/3.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/cbc8e182ed167674c4f6315cd1ca0958/4.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/0806e89a77a593daccee4b0bb694d42c/5.jpg",
      "https://shopcdnpro.grainajz.com/category/68528/3570/7af5bb868dd2a657b5f468119c5c05d9/6.jpg",
    ],
  },
  {
    name: "Navy Print",
    hex: "#275678",
    images: [
      "https://shopcdnpro.grainajz.com/category/68528/3570/1f704a8bcdb00e58185b6c2a70aee7df/%E4%B8%BB%E5%9B%BE.jpg",
    ],
  },
];

const uniformSizeGuide = {
  title: "Medical Scrub Uniform Size Guide",
  subtitle: "Unisex scrub sizing prepared for SDK testing.",
  headers: ["Size", "Chest (in)", "Chest (cm)", "Waist (in)", "Waist (cm)", "Hips (in)", "Hips (cm)", "Height (in)", "Height (cm)"],
  rows: [
    { Size: "S", "Chest (in)": "34-36", "Chest (cm)": "86-91", "Waist (in)": "28-30", "Waist (cm)": "71-76", "Hips (in)": "35-37", "Hips (cm)": "89-94", "Height (in)": "62-68", "Height (cm)": "157-173" },
    { Size: "M", "Chest (in)": "38-40", "Chest (cm)": "97-102", "Waist (in)": "32-34", "Waist (cm)": "81-86", "Hips (in)": "39-41", "Hips (cm)": "99-104", "Height (in)": "64-70", "Height (cm)": "163-178" },
    { Size: "L", "Chest (in)": "42-44", "Chest (cm)": "107-112", "Waist (in)": "36-38", "Waist (cm)": "91-97", "Hips (in)": "43-45", "Hips (cm)": "109-114", "Height (in)": "66-72", "Height (cm)": "168-183" },
    { Size: "XL", "Chest (in)": "46-48", "Chest (cm)": "117-122", "Waist (in)": "40-42", "Waist (cm)": "102-107", "Hips (in)": "47-49", "Hips (cm)": "119-124", "Height (in)": "68-74", "Height (cm)": "173-188" },
    { Size: "2XL", "Chest (in)": "50-52", "Chest (cm)": "127-132", "Waist (in)": "44-46", "Waist (cm)": "112-117", "Hips (in)": "51-53", "Hips (cm)": "130-135", "Height (in)": "68-76", "Height (cm)": "173-193" },
  ],
  howToMeasure: [
    "Chest: measure around the fullest part of the chest.",
    "Waist: measure around the natural waistline.",
    "Hips: measure around the fullest part of the hips.",
  ],
};

function uniformProduct(input: {
  id: string;
  name: string;
  imageIndex: number;
  price: number;
  material: string;
  description: string;
}): DemoProductApi {
  const selectedColor = uniformColorVariants[input.imageIndex] ?? uniformColorVariants[0];
  const image = selectedColor.images[0];
  const hoverImage = selectedColor.images[1] ?? image;
  const variantSizes = ["S", "M", "L", "XL", "2XL"].map((name) => ({
    name,
    availability: "InStock",
    price: input.price,
  }));

  return {
    product_id: input.id,
    name: input.name,
    brand: "PrimeStyleAI",
    category: "Women",
    subcategory: "Medical Uniforms",
    gender: "women",
    price: input.price,
    currency: "USD",
    stock_status: "InStock",
    color: selectedColor.name,
    color_hex: selectedColor.hex,
    selected_color: {
      id: selectedColor.name.toLowerCase().replace(/\s+/g, "-"),
      name: selectedColor.name,
      hex: selectedColor.hex,
      available: true,
    },
    color_variants: uniformColorVariants.map((color) => ({
      name: color.name,
      hex: color.hex,
      available: true,
    })),
    variants: uniformColorVariants.map((color) => ({
      id: color.name.toLowerCase().replace(/\s+/g, "-"),
      name: color.name,
      hex: color.hex,
      available: true,
      images: color.images,
      sizes: variantSizes,
    })),
    image_urls: [image, hoverImage],
    gallery: selectedColor.images,
    generated_cover: image,
    sizes: ["S", "M", "L", "XL", "2XL"],
    size_system: "US",
    material: input.material,
    description: input.description,
    short_description: input.description,
    tags: ["demo", "women", "uniform", "medical scrubs", "healthcare workwear", "sdk-test"],
    is_virtual_tryon_supported: true,
    size_guide: uniformSizeGuide,
  };
}

export const LOCAL_UNIFORM_DEMO_PRODUCTS: DemoProductApi[] = [
  uniformProduct({
    id: "uniform_medical_scrub_1",
    name: "Printed Stretch Medical Scrub Set",
    imageIndex: 0,
    price: 42,
    material: "95% Cotton / 5% Spandex",
    description: "V-neck scrub set with a chest pocket, straight-leg pants, adjustable drawstring waist, and breathable stretch fabric for healthcare workwear tests.",
  }),
  uniformProduct({
    id: "uniform_medical_scrub_2",
    name: "Breathable Cotton Medical Scrub Set",
    imageIndex: 1,
    price: 38,
    material: "100% Pure Cotton",
    description: "Soft cotton scrub set with practical pockets, straight-leg pants, and a breathable fit for clinic, dental, veterinary, and hospital uniform testing.",
  }),
  uniformProduct({
    id: "uniform_medical_scrub_3",
    name: "Unisex V-Neck Medical Scrub Set",
    imageIndex: 2,
    price: 48,
    material: "92% Polyester / 8% Spandex",
    description: "Easy-care unisex scrub set with a V-neck top, multi-pocket layout, straight pants, and comfort stretch for professional uniform sizing tests.",
  }),
];

export function mergeLocalDemoProducts(items: DemoProductApi[]): DemoProductApi[] {
  const existingIds = new Set(items.map((item) => item.product_id ?? item._id).filter(Boolean));
  return [
    ...items,
    ...LOCAL_UNIFORM_DEMO_PRODUCTS.filter((product) => !existingIds.has(product.product_id)),
  ];
}

export function findLocalDemoProduct(productId: string): DemoProductApi | undefined {
  return LOCAL_UNIFORM_DEMO_PRODUCTS.find((product) => product.product_id === productId || product._id === productId);
}
