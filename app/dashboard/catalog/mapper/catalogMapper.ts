export type Maybe<T> = T | null | undefined;

export type CatalogVariantSizeApi = {
  name?: string;
  sku?: string;
  availability?: string;
  price?: number;
};

export type CatalogVariantApi = {
  id?: string;
  name?: string;
  hex?: string;
  color_hex?: string;
  available?: boolean | string;
  is_available?: boolean;
  images?: string[];
  sizes?: CatalogVariantSizeApi[];
};

export type CatalogProductApi = {
  _id?: string;
  product_id?: string;
  id?: string;
  name?: string;
  description?: string;
  short_description?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  sizes?: string[];
  size_system?: string;
  color?: string;
  colorName?: string; // stylist schema
  color_hex?: string;
  color_variants?: { name?: string; hex?: string; available?: boolean }[];
  material?: string;
  price?: number;
  original_price?: number;
  currency?: string;
  stock_status?: string;
  image_urls?: string[];
  imageUrl?: string; // stylist schema
  gallery?: string[];
  season?: string;
  occasion?: string | string[];
  tags?: string[];
  style?: string; // stylist schema
  is_virtual_tryon_supported?: boolean;
  rating?: number;
  reviews_count?: number;
  affiliate_url?: string;
  trending_score?: number;
  date_added?: string;
  variants?: CatalogVariantApi[];
  selected_color?: CatalogVariantApi;
  variant_image_urls?: string[];
  variant_sizes?: CatalogVariantSizeApi[];
  dress_type?: 'upper' | 'lower';
  metadata?: {
    generatedCoverImage?: string;
    [key: string]: any;
  };
};

export type CatalogVariantSize = {
  name: string;
  sku?: string;
  availability?: string;
  price?: number;
};

export type CatalogVariant = {
  id?: string;
  name: string;
  hex?: string;
  available: boolean;
  images: string[];
  sizes: CatalogVariantSize[];
};

export type CatalogColorVariant = {
  name: string;
  hex: string;
  available: boolean;
};

export type CatalogProductViewModel = {
  product_id: string;
  name: string;
  description: string;
  short_description?: string;
  brand: string;
  category: string;
  subcategory: string;
  gender: string;
  sizes: string[];
  size_system: string;
  color: string;
  color_hex: string;
  color_variants: CatalogColorVariant[];
  material: string;
  price: number;
  original_price: number;
  currency: string;
  stock_status: string;
  image_urls: string[];
  gallery?: string[];
  season: string;
  occasion: string;
  tags: string[];
  is_virtual_tryon_supported: boolean;
  rating: number;
  reviews_count: number;
  affiliate_url: string;
  trending_score?: number;
  date_added: string;
  variants?: CatalogVariant[];
  selected_variant?: CatalogVariant;
  variant_image_urls?: string[];
  variant_sizes?: CatalogVariantSize[];
  dress_type?: 'upper' | 'lower';
};

const DEFAULT_HEX = '#999999';

const normalizeHex = (hex?: Maybe<string>) =>
  typeof hex === 'string' && hex.trim().startsWith('#') ? hex.trim() : DEFAULT_HEX;

const normalizeBoolean = (value?: Maybe<boolean | string>) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

export const mapCatalogVariantSize = (size: CatalogVariantSizeApi): CatalogVariantSize | null => {
  if (!size?.name) return null;
  return {
    name: size.name,
    sku: size.sku,
    availability: size.availability,
    price: typeof size.price === 'number' ? size.price : undefined,
  };
};

export const mapCatalogVariant = (variant: CatalogVariantApi): CatalogVariant | null => {
  if (!variant?.name) return null;
  const sizes = (variant.sizes ?? [])
    .map(mapCatalogVariantSize)
    .filter((size): size is CatalogVariantSize => Boolean(size));

  return {
    id: variant.id,
    name: variant.name,
    hex: normalizeHex(variant.hex ?? variant.color_hex),
    available:
      normalizeBoolean(variant.available ?? variant.is_available) ||
      sizes.some((s) => (s.availability ?? '').toLowerCase() === 'instock'),
    images: variant.images ?? [],
    sizes,
  };
};

const toColorVariant = (
  variant: CatalogVariant | { name?: string; hex?: string; available?: boolean } | undefined
): CatalogColorVariant | null => {
  if (!variant?.name) return null;
  return {
    name: variant.name,
    hex: normalizeHex(variant.hex || DEFAULT_HEX),
    available: normalizeBoolean('available' in variant ? variant.available : true),
  };
};

export const mapCatalogProductToViewModel = (product: CatalogProductApi): CatalogProductViewModel => {
  const variants = (product.variants ?? [])
    .map(mapCatalogVariant)
    .filter((variant): variant is CatalogVariant => Boolean(variant));

  const colorVariantsFromVariants = variants
    .map(toColorVariant)
    .filter((variant): variant is CatalogColorVariant => Boolean(variant));

  const colorVariantsFromApi = (product.color_variants ?? [])
    .map((variant) => toColorVariant({
      name: variant.name,
      hex: variant.hex,
      available: variant.available,
    }))
    .filter((variant): variant is CatalogColorVariant => Boolean(variant));

  const combinedColorVariants = colorVariantsFromVariants.length
    ? colorVariantsFromVariants
    : colorVariantsFromApi;

  const selectedVariant = product.selected_color
    ? mapCatalogVariant(product.selected_color)
    : variants[0];

  const baseImages = product.image_urls?.length
    ? product.image_urls
    : (product.gallery && product.gallery.length)
      ? product.gallery
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  const variantImages = product.variant_image_urls?.length
    ? product.variant_image_urls
    : selectedVariant?.images ?? [];

  // Prioritize generatedCoverImage from metadata if available
  const generatedCoverImage = product.metadata?.generatedCoverImage;
  let finalImages = variantImages.length ? variantImages : baseImages;
  
  if (generatedCoverImage) {
    // Remove the generatedCoverImage from the array if it exists elsewhere
    finalImages = finalImages.filter(img => img !== generatedCoverImage);
    // Add it to the beginning
    finalImages = [generatedCoverImage, ...finalImages];
  }

  const variantSizes = (product.variant_sizes ?? selectedVariant?.sizes ?? [])
    .map(mapCatalogVariantSize)
    .filter((size): size is CatalogVariantSize => Boolean(size));

  const primaryColor = selectedVariant?.name || product.colorName || product.color || combinedColorVariants[0]?.name || 'Varied';
  const primaryHex = selectedVariant?.hex || product.color_hex || combinedColorVariants[0]?.hex || DEFAULT_HEX;

  const normalizedDressType = product.dress_type === 'upper' || product.dress_type === 'lower'
    ? product.dress_type
    : undefined;

  return {
    product_id: product.product_id ?? product.id ?? product._id ?? '',
    name: product.name ?? 'Untitled Product',
    description: product.description ?? '',
    short_description: product.short_description,
    brand: product.brand ?? '',
    category: product.category ?? '',
    subcategory: product.subcategory ?? product.category ?? '',
    gender: product.gender ?? 'Unisex',
    sizes: variantSizes.length ? variantSizes.map((size) => size.name) : product.sizes ?? [],
    size_system: product.size_system ?? 'US',
    color: primaryColor,
    color_hex: normalizeHex(primaryHex),
    color_variants: combinedColorVariants,
    material: product.material ?? '',
    price: typeof product.price === 'number' ? product.price : 0,
    original_price:
      typeof product.original_price === 'number'
        ? product.original_price
        : typeof product.price === 'number'
        ? product.price
        : 0,
    currency: product.currency ?? 'USD',
    stock_status: product.stock_status ?? 'InStock',
    image_urls: finalImages,
    gallery: product.gallery,
    season: product.season ?? 'All Season',
    occasion: Array.isArray(product.occasion) ? product.occasion.join(', ') : product.occasion ?? '',
    tags: product.tags ?? [],
    is_virtual_tryon_supported:
      typeof product.is_virtual_tryon_supported === 'boolean'
        ? product.is_virtual_tryon_supported
        : true,
    rating: typeof product.rating === 'number' ? product.rating : 0,
    reviews_count: typeof product.reviews_count === 'number' ? product.reviews_count : 0,
    affiliate_url: product.affiliate_url ?? '',
    trending_score: product.trending_score,
    date_added: product.date_added ?? new Date().toISOString().slice(0, 10),
    variants: variants.length ? variants : undefined,
    selected_variant: selectedVariant ?? undefined,
    variant_image_urls: finalImages.length ? finalImages : undefined,
    variant_sizes: variantSizes.length ? variantSizes : undefined,
    dress_type: normalizedDressType,
  };
};

export const mapCatalogProductsToViewModel = (products: CatalogProductApi[]): CatalogProductViewModel[] =>
  products.map(mapCatalogProductToViewModel);
