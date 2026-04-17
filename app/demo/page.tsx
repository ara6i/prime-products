import { cookies } from "next/headers";
import { listCatalogProducts } from "@/app/dashboard/catalog/services/catalogServerService";
import type { CatalogProductViewModel } from "@/app/dashboard/catalog/mapper/catalogMapper";
import { DemoContent } from "./components/DemoContent";

export const metadata = {
  title: "SDK Demo | PrimeStyle AI Virtual Try-On",
  description:
    "See the PrimeStyle Virtual Try-On SDK in action on a real product page.",
};

const DEMO_PRODUCT: CatalogProductViewModel = {
  product_id: "demo-sdk-001",
  name: "Relaxed Linen Blazer",
  description:
    "A beautifully tailored linen blazer with a relaxed silhouette. Perfect for layering over casual or semi-formal outfits.",
  brand: "PrimeStyle Collection",
  category: "Outerwear",
  subcategory: "Blazers",
  gender: "Women",
  sizes: ["XS", "S", "M", "L", "XL"],
  size_system: "US",
  color: "Beige",
  color_hex: "#C8B89A",
  color_variants: [
    { name: "Beige", hex: "#C8B89A", available: true },
    { name: "Black", hex: "#1a1a1a", available: true },
    { name: "Navy", hex: "#1B2A4A", available: true },
  ],
  material: "100% Linen",
  price: 89.0,
  original_price: 129.0,
  currency: "USD",
  stock_status: "instock",
  image_urls: [
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80",
    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80",
    "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&q=80",
  ],
  season: "Spring/Summer",
  occasion: "Casual",
  tags: ["linen", "blazer", "summer", "layering"],
  is_virtual_tryon_supported: true,
  rating: 4.7,
  reviews_count: 328,
  affiliate_url: "",
  date_added: "2025-01-15",
};

export default async function DemoPage() {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get("accessToken")?.value;

  let product: CatalogProductViewModel = DEMO_PRODUCT;
  try {
    const { items } = await listCatalogProducts({ limit: 20, page: 1 });
    const catalogProduct = items.find(
      (p) => p.is_virtual_tryon_supported && p.image_urls.length > 0
    );
    if (catalogProduct) {
      product = catalogProduct;
    }
  } catch {
    // Use demo fallback
  }

  return <DemoContent product={product} isLoggedIn={isLoggedIn} />;
}
