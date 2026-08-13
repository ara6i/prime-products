/* ─── UI-only types ─── */

export interface ChatHistoryItem {
  id: string;
  title: string;
  previewImages: string[];
}

export type { WeatherData } from "@/app/shared/types";

export interface SuggestionChip {
  id: string;
  label: string;
}

/* ─── Conversation types (matching backend) ─── */

export type ConversationPhase =
  | "gathering_info"
  | "awaiting_model"
  | "generating"
  | "complete"
  | "follow_up";

export type MessageRole = "user" | "assistant";

export interface OutfitProduct {
  id: string;
  productId?: string;
  name: string;
  category: string;
  subcategory?: string;
  color?: string;
  colorName?: string;
  brand?: string;
  imageUrl?: string;
  price?: number;
  gender?: string;
  affiliateUrl?: string;
  recommendedSize?: string | null;
  sizeConfidence?: "high" | "medium" | "low" | null;
  sizeStatus?: StylistSizeStatus;
}

export interface Outfit {
  id: string;
  items: OutfitProduct[];
  theme?: string;
  summary?: string;
  tryOnImageUrl?: string;
  tryOnModelImage?: string;
  transparentImageUrl?: string;
}

export interface StylistMessage {
  _id: string;
  id?: string;
  role: MessageRole;
  prompt?: string;
  response?: string;
  outfits?: Outfit[];
  isGenerating?: boolean;
  waitingForModel?: boolean;
  gatheringInfo?: boolean;
  modelImage?: string;
  createdAt?: string;
}

export interface StylistConversation {
  _id: string;
  id?: string;
  title: string;
  conversationPhase: ConversationPhase;
  messages: StylistMessage[];
  lastMessageAt?: string;
  createdAt?: string;
}

/* ─── Mapped UI types (what components receive) ─── */

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  type?: "text" | "model-preview" | "loading";
  outfits?: Outfit[];
  /** Backend flags — used by useConversation to determine phase */
  gatheringInfo?: boolean;
  waitingForModel?: boolean;
  isGenerating?: boolean;
}

export interface OutfitSuggestion {
  id: string;
  title: string;
  budget: string;
  itemCount: number;
  imageUrl: string;
  transparentImageUrl?: string;
  items: OutfitProduct[];
  isBookmarked: boolean;
}

/* ─── Structured AI Stylist types ─── */

export type StylistOccasion =
  | "casual-day"
  | "weekend"
  | "work-office"
  | "interview"
  | "date-night"
  | "party"
  | "wedding-guest"
  | "formal-event"
  | "travel"
  | "vacation"
  | "sports-workout";

export type StylistVibe =
  | "minimal"
  | "classic"
  | "romantic"
  | "edgy"
  | "streetwear"
  | "boho"
  | "sporty"
  | "preppy"
  | "glamorous"
  | "casual"
  | "business";

export type StylistSeason =
  | "spring"
  | "summer"
  | "fall"
  | "winter"
  | "all-season"
  | "current";

export interface StylistOnboardingProfile {
  gender: "female" | "male" | "unisex";
  occasion: StylistOccasion;
  styleVibes: StylistVibe[];
  season: StylistSeason;
  budget: {
    min?: number;
    max: number;
    currency: string;
  };
  preferredColors: string[];
  avoidColors: string[];
  fitPreferences: string[];
  coveragePreferences: string[];
  avoidMaterials: string[];
  favoriteBrands: string[];
  size?: string;
  weather?: {
    temperatureC: number;
    condition: string;
    raining: boolean;
    windSpeedKph?: number;
  };
}

export interface OutfitIntelligenceRequest {
  onboarding: StylistOnboardingProfile;
  modelImageId?: string;
  requestedOutfits: number;
  deliveryMode?: "fast-start" | "full";
  excludeOutfitIds?: string[];
}

export interface IntelligentOutfitItem {
  id: string;
  styleRagId: string;
  title: string;
  merchantName: string;
  brand: string | null;
  slot:
    | "top"
    | "bottom"
    | "dress"
    | "outerwear"
    | "shoe"
    | "bag"
    | "accessory";
  garmentType: string | null;
  gender: string | null;
  price: number;
  currency: string;
  productUrl: string;
  affiliateUrl: string | null;
  imageUrl: string;
  cutoutImageUrl: string | null;
  color: string | null;
  colorHex: string | null;
  material: string | null;
  pattern: string | null;
  styleTags: string[];
  occasionTags: string[];
  seasonTags: string[];
  formality: string | null;
  silhouetteTags: string[];
  availableSizes: string[];
  recommendedSize?: string | null;
  sizeConfidence?: "high" | "medium" | "low" | null;
  sizeStatus?: StylistSizeStatus;
  sizeReason?: string | null;
  embeddingReady: boolean;
  candidateScore: {
    vectorRelevance: number;
    occasion: number;
    styleVibe: number;
    seasonWeather: number;
    colorPreference: number;
    sizeAvailability: number;
    dataQuality: number;
    total: number;
  };
}

export type StylistSizeStatus =
  | "loading"
  | "ready"
  | "not-needed"
  | "unavailable";

export interface StylistSizeRecommendation {
  styleRagId: string;
  status: Exclude<StylistSizeStatus, "loading">;
  recommendedSize: string | null;
  confidence: "high" | "medium" | "low" | null;
  reason: string;
  availableSizes: string[];
}

export interface StylistCatalogProduct {
  product_id: string;
  style_rag_id: string;
  source_product_id: string;
  source: "style_rag";
  name: string;
  brand: string;
  description?: string;
  category: string;
  parentCategory: string;
  subcategory?: string;
  gender?: string;
  price: number;
  original_price?: number;
  currency: string;
  stock_status: string;
  image_urls: string[];
  cutout_image_url?: string;
  enriched_image_url?: string;
  sizes: string[];
  color?: string;
  color_hex?: string;
  material?: string;
  pattern?: string;
  season?: string;
  season_tags: string[];
  occasion: string[];
  tags: string[];
  style_tags: string[];
  fit_tags: string[];
  silhouette_tags: string[];
  coverage_tags: string[];
  formality?: string;
  is_virtual_tryon_supported: boolean;
  rating: number;
  reviews_count: number;
  affiliate_url: string | null;
  product_url: string | null;
  date_added: string;
  variants: unknown[];
}

export interface IntelligentOutfit {
  id: string;
  template: "dress" | "separates";
  label: string;
  items: IntelligentOutfitItem[];
  totalPrice: number;
  currency: string;
  score: {
    personalRelevance: number;
    colorHarmony: number;
    formality: number;
    silhouette: number;
    patternTexture: number;
    seasonWeather: number;
    budget: number;
    dataQuality: number;
    aiJudgment: number | null;
    total: number;
  };
  rationale: string[];
  penalties: string[];
}

export interface OutfitIntelligenceTrace {
  requestId: string;
  pipelineVersion: string;
  indexScope: string;
  semanticQuery: string;
  indexedProductsRead: number;
  eligibleProducts: number;
  eligibleBySlot: Record<string, number>;
  rejectedByReason: Record<string, number>;
  templatesConsidered: string[];
  combinationsGenerated: number;
  aiReranker: "openai" | "deterministic-fallback" | "not-run";
  aiModel: string | null;
  deliveryMode: "fast-start" | "full";
  hardRulesApplied: string[];
}

export interface OutfitIntelligenceResponse {
  source: "structured-onboarding-rag";
  selectionLimit: number;
  outfits: IntelligentOutfit[];
  trace: OutfitIntelligenceTrace;
}

export interface OutfitCatalogAvailability {
  currency: string;
  catalogGenders: Array<"female" | "male" | "unisex">;
  indexedProducts: number;
  slotCounts: Record<string, number>;
  minimumCompleteLookPrice: number | null;
  minimumCompleteLookPriceByGender: {
    female: number | null;
    male: number | null;
    unisex: number | null;
  };
}

export interface ProcessedStylistModel {
  imageUrl: string;
  publicId?: string;
  width: number;
  height: number;
  backgroundRemoved: true;
}

export interface GarmentCutoutResult {
  styleRagId: string;
  cutoutImageUrl?: string;
  cached?: boolean;
  error?: string;
}

export type StylistTryOnJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type StylistDiscStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface StylistHistoryProduct {
  id: string;
  styleRagId?: string;
  name: string;
  category: string;
  brand?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  affiliateUrl?: string;
  productUrl?: string;
  recommendedSize?: string;
  sizeConfidence?: "high" | "medium" | "low";
  sizeStatus?: Exclude<StylistSizeStatus, "loading">;
}

export interface StylistTryOnJob {
  outfitId: string;
  label: string;
  galleryId?: string;
  status: StylistTryOnJobStatus;
  discStatus?: StylistDiscStatus;
  startedAt?: number;
  finishedAt?: number;
  imageUrl?: string;
  discImageUrl?: string;
  products?: StylistHistoryProduct[];
  error?: string;
  discError?: string;
}

export type StylistTryOnBatchStatus =
  | "idle"
  | "starting"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

export interface StylistTryOnBatchState {
  batchId?: string;
  status: StylistTryOnBatchStatus;
  tokenCost: number;
  jobs: StylistTryOnJob[];
  startedAt?: number;
  finishedAt?: number;
  error?: string;
}

export interface StylistHistorySession {
  groupKey: string;
  createdAt: string;
  updatedAt?: string;
  status: "processing" | "completed" | "partial" | "failed";
  jobs: StylistTryOnJob[];
}

/* ─── Edit Outfit types ─── */

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: string;
}

export type CatalogTab = "catalog" | "closet" | "saved" | "ai-stylist";

/* ─── Outfit Modification types ─── */

export interface ModificationRequest {
  currentOutfit: Array<{
    id: string;
    productId: string;
    name: string;
    category: string;
    color: string;
    colorName: string;
    style: string;
    brand?: string;
    imageUrl: string;
    description?: string;
    gender?: string;
    tags?: string[];
  }>;
  userRequest: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface ModificationResponse {
  intent: {
    categoriesToChange: string[];
    colorPreferences?: string[];
    stylePreferences?: string[];
    reasoning?: string;
  };
  replacementOptions: {
    [categoryName: string]: Array<{
      id: string;
      productId: string;
      name: string;
      category: string;
      color: string;
      imageUrl: string;
      brand?: string;
      price?: number;
      rating?: number;
    }>;
  };
  message: string;
}

export interface ModificationChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  replacementProducts?: ReplacementProduct[];
}

export interface ReplacementProduct {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  brand?: string;
  price?: number;
  colorName?: string;
}
