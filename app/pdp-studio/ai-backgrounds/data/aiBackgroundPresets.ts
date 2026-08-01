import type {
  AiBackgroundModelPreset,
  AiBackgroundPreset,
  AiBackgroundPresetGroup,
  AiBackgroundQuality,
} from "../types/aiBackgrounds";
import { AI_BACKGROUND_GENERATED_RESULTS } from "./aiBackgroundGeneratedResults";

const BACKGROUND_ASSET_ROOT = "/images/pdp-studio/background-presets";

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}

function promptFor(category: string, label: string): string {
  return [
    `Place the exact source product in an original ${label.toLowerCase()} background scene.`,
    `Interpret the scene as a ${category.toLowerCase()} setting for premium ecommerce photography.`,
    "Preserve the product silhouette, construction, labels, colors, materials, proportions, camera angle, and factual details exactly.",
    "Match contact shadows, perspective, reflections, depth of field, and lighting naturally.",
    "Do not add text, logos, watermarks, duplicate products, people, hands, or unrelated props.",
  ].join(" ");
}

function makePreset(
  category: string,
  label: string,
  assetLabel = label,
): AiBackgroundPreset {
  const assetKey = slug(assetLabel);
  return {
    id: `${slug(category)}:${slug(label)}`,
    label,
    category,
    assetKey,
    image: `${BACKGROUND_ASSET_ROOT}/${assetKey}.webp`,
    prompt: promptFor(category, label),
  };
}

function group(
  label: string,
  labels: readonly (string | readonly [label: string, assetLabel: string])[],
): AiBackgroundPresetGroup {
  return {
    id: slug(label),
    label,
    presets: labels.map((entry) =>
      typeof entry === "string"
        ? makePreset(label, entry)
        : makePreset(label, entry[0], entry[1]),
    ),
  };
}

const COLOR_NAMES = [
  "white",
  "black",
  "yellow",
  "orange",
  "red",
  "maroon",
  "light coral",
  "rose pink",
  "taffy pink",
  "hot pink",
  "violet",
  "plum",
  "baby blue",
  "ultramarine blue",
  "dark blue",
  "lime green",
  "emerald green",
  "army green",
] as const;

export const AI_BACKGROUND_PRESET_GROUPS: readonly AiBackgroundPresetGroup[] = [
  group("Trending", [
    ["Spring", "spring"],
    ["Light wood countertop", "light-wood-countertop"],
    ["Succulents", "succulents"],
    ["Sunset", "sunset"],
    ["Marble countertop", "marble-countertop"],
    ["Wood", "wood"],
    ["Mountain", "mountain"],
    ["Concrete countertop", "concrete-countertop"],
  ]),
  group("Mood", [
    "Spring",
    "Sunset",
    "Wood",
    "Mountain",
    "Clouds",
    "Minimalist",
    "Beach",
    "Tropical",
    "Bokeh effect",
    "Monstera",
    "Flowers",
    "Snow",
    "Autumn",
    "Golden light",
    "Love",
    "Street",
    "Tree stump",
    "Cowboy",
    "Countryside summer",
  ]),
  group("Countertop", [
    "Light wood countertop",
    "Marble countertop",
    "Concrete countertop",
    "Black marble countertop",
    "Brown marble countertop",
    "Cream marble countertop",
    "Green marble countertop",
    "Dark wood countertop",
  ]),
  group("Plant", [
    "Succulents",
    "Monstera plants",
    "Cactii",
    "Air plants",
    "Hoya plants",
    "Pilea plants",
  ]),
  group("Texture", ["Water", "Soil", "Fabric", "Marble"]),
  group("Mountain", [
    "Mountains",
    "Volcano",
    "Snowy Mountains",
    "Tropical Mountains",
    "Sand Dunes",
    "Grand Canyon",
    "Mountain Sunset",
    "Waterfall",
    "Canyon River",
  ]),
  group("Event", [
    "Lunar New Year",
    "Valentine’s Roses",
    "Valentine’s Hearts",
    "Carnaval",
    "Super Bowl",
    "St Patrick 1",
    "Easter 1",
    "Birthday",
    "Wedding",
    "Baby shower",
    "Christmas",
    "New year",
  ]),
  group("Holiday season", [
    "Winter wonderland",
    "Christmas cabin",
    "Fir branches",
  ]),
  group("Interior", ["Cozy home", "Bathroom", "Kitchen"]),
  group("Accessories", ["Grapes", "Coffee", "Berries"]),
  group(
    "Surface",
    COLOR_NAMES.map((color) => `Surface ${color}`),
  ),
  group("Flower", ["Roses", "Tulips", "Lavender", "Cherry blossom"]),
  group("A window on", [
    "Window on New York",
    "Window on Paris",
    "Window on Marrakech",
    "Window on Mykonos",
    "Window on Venice",
    "Window on Okinawa",
    "Window on Bali",
    "Window on Berlin",
    "Window on the ocean",
    "Window on the sand desert",
    "Window on a pine forest",
  ]),
  group("Creative", ["Supernova", "Fireworks", "Grafitti", "Color splash"]),
  group("Sci-Fi Worlds", [
    "On the moon",
    "Deep space",
    "Jungle",
    "Alien planet",
  ]),
  group("Backdrop", [
    "Light",
    "Dark",
    "Blue",
    "Red",
    "Pink",
    "Orange",
    "Golden",
    "Gradient",
  ]),
  group(
    "Fabric",
    COLOR_NAMES.map((color) => `${color[0]?.toUpperCase()}${color.slice(1)} fabric`),
  ),
  group(
    "Water",
    COLOR_NAMES.map((color) => `${color[0]?.toUpperCase()}${color.slice(1)} water`),
  ),
] as const;

export const AI_BACKGROUND_PRESETS = AI_BACKGROUND_PRESET_GROUPS.flatMap(
  (item) => item.presets,
);

export const AI_BACKGROUND_UNIQUE_ASSETS = Array.from(
  new Map(AI_BACKGROUND_PRESETS.map((preset) => [preset.assetKey, preset])).values(),
);

const AI_BACKGROUND_AVAILABLE_ASSET_KEYS = new Set(
  Object.keys(AI_BACKGROUND_GENERATED_RESULTS),
);

export const AI_BACKGROUND_AVAILABLE_PRESET_GROUPS =
  AI_BACKGROUND_PRESET_GROUPS.map((presetGroup) => ({
    ...presetGroup,
    presets: presetGroup.presets.filter((preset) =>
      AI_BACKGROUND_AVAILABLE_ASSET_KEYS.has(preset.assetKey),
    ),
  })).filter((presetGroup) => presetGroup.presets.length > 0);

export const AI_BACKGROUND_AVAILABLE_PRESETS =
  AI_BACKGROUND_AVAILABLE_PRESET_GROUPS.flatMap(
    (presetGroup) => presetGroup.presets,
  );

export const AI_BACKGROUND_MODEL_OPTIONS: readonly {
  id: AiBackgroundModelPreset;
  label: string;
  badge?: string;
  description: string;
}[] = [
  {
    id: "studio-hd",
    label: "Studio HD",
    badge: "Max",
    description:
      "Highest-quality backgrounds with sharp details and lifelike lighting. May take longer.",
  },
  {
    id: "studio",
    label: "Studio",
    description:
      "A step up in scene quality and detail while remaining faster than Studio HD.",
  },
  {
    id: "v3",
    label: "v3",
    description: "Fast and versatile for everyday product backgrounds.",
  },
  {
    id: "v2",
    label: "v2",
    badge: "Legacy",
    description: "Legacy rendering for projects that need the previous look.",
  },
] as const;

export const AI_BACKGROUND_QUALITY_OPTIONS: readonly {
  id: AiBackgroundQuality;
  label: string;
  badge: string;
  resolution: "1K" | "2K" | "4K";
  features: readonly string[];
}[] = [
  {
    id: "premium",
    label: "Premium",
    badge: "Ultra",
    resolution: "4K",
    features: [
      "4K+ resolution",
      "Best edit accuracy",
      "Photorealistic compositing",
      "Highest quality",
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    badge: "Max",
    resolution: "2K",
    features: [
      "2K resolution",
      "Better edit accuracy",
      "Consistent lighting adaptation",
      "High quality",
    ],
  },
  {
    id: "standard",
    label: "Standard",
    badge: "Pro",
    resolution: "1K",
    features: ["1K resolution", "Good edit accuracy", "Fast generations"],
  },
] as const;

export const AI_BACKGROUND_SURFACE_SUGGESTIONS = [
  "rustic wooden table",
  "marble countertop",
  "concrete slab",
  "glass surface",
  "vintage suitcase",
  "ceramic tile",
  "fluffy rug",
  "textured fabric",
  "shiny metal sheet",
  "fresh grass",
] as const;

export const AI_BACKGROUND_ENVIRONMENT_SUGGESTIONS = [
  "colorful balloons",
  "brick wall",
  "garden scene",
  "ocean view",
  "abstract painting",
  "graffiti wall",
  "rustic barn",
  "city skyline",
  "forest landscape",
  "mountain range",
] as const;
