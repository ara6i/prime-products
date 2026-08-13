import type {
  WeatherData,
  SuggestionChip,
  ChatHistoryItem,
  ChatMessage,
  OutfitSuggestion,
  CatalogProduct,
} from "@/app/ai-stylist/types";
import { shopRunwayLooks } from "@/app/shop/runway/data/shopRunway.data";
import { mapShopRunwayLook } from "@/app/shop/runway/mappers/shopRunway.mapper";

export const WEATHER_DATA: WeatherData = {
  location: "Berlin",
  temperature: "18°C",
  icon: "cloud",
  condition: "Light Rain",
};

export const SUGGESTION_CHIPS: SuggestionChip[] = [
  { id: "wedding", label: "Wedding day outfit" },
  { id: "casual", label: "Everyday casual look" },
  { id: "date", label: "Date night outfit" },
  { id: "office", label: "Office outfit ideas" },
];

export const CHAT_HISTORY_ITEMS: ChatHistoryItem[] = [];

export const CONVERSATION_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "ai",
    content: "Hey Mina! 👋\nI can help you build the perfect outfit for today",
  },
  {
    id: "2",
    role: "user",
    content: "Casual day out",
  },
  {
    id: "3",
    role: "ai",
    content: "Nice choice.\nWhat kind of vibe are you going for?",
  },
  {
    id: "4",
    role: "user",
    content: "Effortless",
  },
  {
    id: "5",
    role: "ai",
    content: "Got it.\nWhat budget should I keep in mind?",
  },
  {
    id: "6",
    role: "user",
    content: "Under $200",
  },
  {
    id: "7",
    role: "ai",
    content: "Anything you want me to focus on or avoid?",
  },
  {
    id: "8",
    role: "user",
    content: "Interested in neutral colors",
  },
  {
    id: "9",
    role: "ai",
    content: "Before I style your looks, how would you like to preview them?",
  },
  {
    id: "10",
    role: "user",
    content: "",
    type: "model-preview",
  },
  {
    id: "11",
    role: "ai",
    content:
      "Perfect.\nI'm putting together 5 outfits that fit your plan, the weather, and your style.",
  },
  {
    id: "12",
    role: "ai",
    content: "Styling your looks…",
    type: "loading",
  },
];

const OUTFIT_IMAGES = [
  "/images/ai-stylist/outfit-1-6838db.png",
  "/images/ai-stylist/outfit-2-4f7574.png",
  "/images/ai-stylist/outfit-3-1cded7.png",
  "/images/ai-stylist/outfit-4-743308.png",
  "/images/ai-stylist/outfit-5-21ce53.png",
];

/** Reuse the exact five shoppable looks shown on the shop landing runway. */
export const INITIAL_STYLIST_LOOKS = shopRunwayLooks.map(mapShopRunwayLook);

export const MODEL_PLATFORM_IMAGES = INITIAL_STYLIST_LOOKS.map(
  (look) => look.modelImage,
);

export const MOCK_CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: "cp-1",
    name: "Fine-Knit Cardigan",
    brand: "H&M",
    price: 19.99,
    imageUrl: OUTFIT_IMAGES[0],
    category: "Tops",
  },
  {
    id: "cp-2",
    name: "Linen Blend Shirt",
    brand: "Zara",
    price: 35.99,
    imageUrl: OUTFIT_IMAGES[1],
    category: "Tops",
  },
  {
    id: "cp-3",
    name: "Oversized Cotton Tee",
    brand: "Uniqlo",
    price: 14.99,
    imageUrl: OUTFIT_IMAGES[2],
    category: "Tops",
  },
  {
    id: "cp-4",
    name: "Slim Fit Chinos",
    brand: "H&M",
    price: 29.99,
    imageUrl: OUTFIT_IMAGES[3],
    category: "Bottoms",
  },
  {
    id: "cp-5",
    name: "Ruffle-Trimmed Poplin Blouse",
    brand: "H&M",
    price: 19.99,
    imageUrl: OUTFIT_IMAGES[4],
    category: "Tops",
  },
  {
    id: "cp-6",
    name: "Pleated Midi Skirt",
    brand: "Mango",
    price: 45.99,
    imageUrl: OUTFIT_IMAGES[0],
    category: "Bottoms",
  },
  {
    id: "cp-7",
    name: "Relaxed Fit Blazer",
    brand: "Zara",
    price: 79.99,
    imageUrl: OUTFIT_IMAGES[1],
    category: "Outerwear",
  },
  {
    id: "cp-8",
    name: "Knit Polo Shirt",
    brand: "COS",
    price: 55.00,
    imageUrl: OUTFIT_IMAGES[2],
    category: "Tops",
  },
  {
    id: "cp-9",
    name: "Wide-Leg Trousers",
    brand: "Arket",
    price: 69.00,
    imageUrl: OUTFIT_IMAGES[3],
    category: "Bottoms",
  },
  {
    id: "cp-10",
    name: "Cropped Denim Jacket",
    brand: "Levi's",
    price: 89.99,
    imageUrl: OUTFIT_IMAGES[4],
    category: "Outerwear",
  },
  {
    id: "cp-11",
    name: "Satin Wrap Top",
    brand: "& Other Stories",
    price: 49.00,
    imageUrl: OUTFIT_IMAGES[0],
    category: "Tops",
  },
  {
    id: "cp-12",
    name: "Tailored Shorts",
    brand: "Massimo Dutti",
    price: 59.99,
    imageUrl: OUTFIT_IMAGES[1],
    category: "Bottoms",
  },
];

export const OUTFIT_SUGGESTIONS: OutfitSuggestion[] = [
  {
    id: "1",
    title: "Effortless workday",
    budget: "$199.99",
    itemCount: 3,
    imageUrl: "/images/ai-stylist/outfit-1-6838db.png",
    items: [],
    isBookmarked: false,
  },
  {
    id: "2",
    title: "Effortless workday",
    budget: "$199.99",
    itemCount: 3,
    imageUrl: "/images/ai-stylist/outfit-2-4f7574.png",
    items: [],
    isBookmarked: true,
  },
  {
    id: "3",
    title: "Effortless workday",
    budget: "$199.99",
    itemCount: 3,
    imageUrl: "/images/ai-stylist/outfit-3-1cded7.png",
    items: [],
    isBookmarked: false,
  },
  {
    id: "4",
    title: "Effortless workday",
    budget: "$199.99",
    itemCount: 3,
    imageUrl: "/images/ai-stylist/outfit-4-743308.png",
    items: [],
    isBookmarked: false,
  },
  {
    id: "5",
    title: "Effortless workday",
    budget: "$199.99",
    itemCount: 3,
    imageUrl: "/images/ai-stylist/outfit-5-21ce53.png",
    items: [],
    isBookmarked: false,
  },
];
