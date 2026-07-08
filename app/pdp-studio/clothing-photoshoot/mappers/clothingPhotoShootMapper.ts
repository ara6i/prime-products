import type { PdpStudioPhotoShootPreset, PdpStudioPhotoShootView } from "../../types";

const assetBase = "/images/pdp-studio/clothing-photoshoot";
const backgroundStyleBase = `${assetBase}/backgrounds/styles`;
const youngPoseBase = `${assetBase}/poses/young-european-model`;
const modelThumbnailCrop = {
  thumbnailFit: "contain" as const,
  thumbnailObjectPosition: "50% 50%",
};
const poseThumbnailCrop = {
  thumbnailObjectPosition: "50% 50%",
};

const backgroundStyles: Array<Pick<PdpStudioPhotoShootPreset, "id" | "label" | "description" | "swatch">> = [
  { id: "random", label: "Random", description: "Editorial street setting selected automatically.", swatch: "#dfe9e4" },
  { id: "street", label: "Street", description: "European street facade with soft daylight.", swatch: "#d7d2c7" },
  { id: "bedroom", label: "Bedroom", description: "Bright lifestyle bedroom interior.", swatch: "#f0ebe4" },
  { id: "sunset", label: "Sunset", description: "Warm seaside golden-hour scene.", swatch: "#f5a75c" },
  { id: "factory", label: "Factory", description: "Industrial wall and concrete floor.", swatch: "#667069" },
  { id: "studio", label: "Studio", description: "Clean white photography studio.", swatch: "#f8f8f8" },
  { id: "colored-studio", label: "Colored Studio", description: "Blue spotlight studio background.", swatch: "#253c7d" },
  { id: "concrete-studio", label: "Concrete Studio", description: "Minimal grey concrete studio.", swatch: "#c9c9c9" },
  { id: "beach", label: "Beach", description: "Clean turquoise shoreline.", swatch: "#8bcbd8" },
  { id: "tropical", label: "Tropical", description: "Palm leaves and tropical flowers.", swatch: "#48b79a" },
  { id: "library", label: "Library", description: "Warm library-style interior.", swatch: "#a77a52" },
  { id: "forest", label: "Forest", description: "Green forest path with filtered light.", swatch: "#4f7d3c" },
  { id: "business-district", label: "Business District", description: "Modern glass district walkway.", swatch: "#b9c6cf" },
  { id: "countryside", label: "Countryside", description: "Sunny field and fruit tree.", swatch: "#b8c96a" },
  { id: "flowers", label: "Flowers", description: "Soft flower meadow backdrop.", swatch: "#f0b9c9" },
  { id: "golden-light", label: "Golden Light", description: "Tall grass in golden hour light.", swatch: "#c8943d" },
  { id: "mountain", label: "Mountain", description: "Green mountain valley campaign scene.", swatch: "#759d62" },
  { id: "pool", label: "Pool", description: "Luxury resort pool background.", swatch: "#71c9d6" },
  { id: "latin-city", label: "Latin City", description: "Warm colorful city street.", swatch: "#d08258" },
  { id: "cafe", label: "Cafe", description: "Paris-style cafe sidewalk.", swatch: "#8a6a4a" },
  { id: "asian-city", label: "Asian City", description: "Neon night city street.", swatch: "#28316f" },
  { id: "night-lights", label: "Night Lights", description: "Soft city lights and reflections.", swatch: "#151b2b" },
  { id: "desert", label: "Desert", description: "Warm sandstone canyon road.", swatch: "#c47745" },
  { id: "stone-wall", label: "Stone Wall", description: "Street-style limestone wall.", swatch: "#c7b9a2" },
  { id: "dark-storefront", label: "Dark Storefront", description: "Dark doorway with stone facade.", swatch: "#252525" },
  { id: "cafe-doorway", label: "Cafe Doorway", description: "Cafe entrance and wicker chairs.", swatch: "#b5916a" },
  { id: "concrete-wall", label: "Concrete Wall", description: "Modern concrete wall for lean poses.", swatch: "#a9a9a3" },
];

const poseStyles: Array<Pick<PdpStudioPhotoShootPreset, "id" | "label" | "description">> = [
  { id: "front-sunglasses-hand", label: "Sunglasses hand", description: "Front pose touching sunglasses." },
  { id: "back-over-shoulder", label: "Back shoulder", description: "Back view looking over shoulder." },
  { id: "hand-on-head-pocket", label: "Hand on head", description: "One hand on hair, one in pocket." },
  { id: "wall-lean-one-knee", label: "Wall knee lean", description: "One knee bent against wall." },
  { id: "crossed-arms-front", label: "Crossed arms", description: "Front pose with crossed arms." },
  { id: "side-hair-touch", label: "Side hair touch", description: "Side pose with hand in hair." },
  { id: "hands-in-pockets-front", label: "Hands in pockets", description: "Relaxed front pose." },
  { id: "relaxed-seated-lean", label: "Seated lean", description: "Relaxed seated editorial pose." },
];

export function mapClothingPhotoShootView(): PdpStudioPhotoShootView {
  return {
    previewAssets: {
      compositeAssetUrl: `${assetBase}/preview/garment-to-model-transformation.png`,
      productAssetUrl: `${assetBase}/preview/parts/product-outfit.png`,
      sourceModelAssetUrl: `${assetBase}/preview/parts/source-model.png`,
      resultModelAssetUrl: `${assetBase}/preview/parts/result-model.png`,
    },
    models: [
      {
        id: "young-european-editorial",
        label: "Mia",
        description: "Young editorial model",
        icon: "model",
        previewTone: "bg-[#f7f7f8]",
        assetUrl: `${assetBase}/models/young-european-pose-model-reference.png`,
        ...modelThumbnailCrop,
      },
      {
        id: "avery",
        label: "Avery",
        description: "Clean ecommerce model",
        icon: "model",
        previewTone: "bg-[#eef2ff]",
        assetUrl: `${assetBase}/models/avery.png`,
        ...modelThumbnailCrop,
      },
      {
        id: "sam",
        label: "Sam",
        description: "Menswear studio model",
        icon: "model",
        previewTone: "bg-[#edf7f0]",
        assetUrl: `${assetBase}/models/sam.png`,
        ...modelThumbnailCrop,
      },
      {
        id: "taylor",
        label: "Taylor",
        description: "Front catalog model",
        icon: "model",
        previewTone: "bg-[#f7f8fb]",
        assetUrl: `${assetBase}/models/taylor.png`,
        ...modelThumbnailCrop,
      },
      {
        id: "kendall",
        label: "Kendall",
        description: "Everyday apparel model",
        icon: "model",
        previewTone: "bg-[#eef7fb]",
        assetUrl: `${assetBase}/models/kendall.png`,
        ...modelThumbnailCrop,
      },
      {
        id: "jordan",
        label: "Jordan",
        description: "Relaxed studio model",
        icon: "model",
        previewTone: "bg-[#f7f2ea]",
        assetUrl: `${assetBase}/models/jordan.png`,
        ...modelThumbnailCrop,
      },
      {
        id: "alex",
        label: "Alex",
        description: "Premium neutral model",
        icon: "model",
        previewTone: "bg-[#f4efe6]",
        assetUrl: `${assetBase}/models/alex.png`,
        ...modelThumbnailCrop,
      },
    ],
    backgrounds: backgroundStyles.map((background) => ({
      ...background,
      icon: background.id.includes("studio") ? "palette" : "sparkles",
      previewTone: "bg-[#f7f7f8]",
      assetUrl: `${backgroundStyleBase}/${background.id}.png`,
    })),
    poses: poseStyles.map((pose) => ({
      ...pose,
      icon: "pose",
      previewTone: "bg-[#f7f7f8]",
      assetUrl: `${youngPoseBase}/${pose.id}.png`,
      ...poseThumbnailCrop,
    })),
    qualities: [
      {
        id: "premium",
        label: "Premium",
        badge: "Ultra",
        resolution: "4K",
        description: "Highest quality",
        details: ["4k+ resolution", "Best product accuracy", "Most realistic models", "Highest quality", "Consumes most credits"],
        assetUrl: `${assetBase}/models/young-european-pose-model-reference.png`,
      },
      {
        id: "advanced",
        label: "Advanced",
        badge: "Max",
        resolution: "2K",
        description: "Better accuracy",
        details: ["2k resolution", "Better product accuracy", "Realistic models", "High quality", "Consumes more credits"],
        assetUrl: `${assetBase}/models/avery.png`,
      },
      {
        id: "standard",
        label: "Standard",
        badge: "Pro",
        resolution: "1K",
        description: "Fast generation",
        details: ["1k resolution", "Good product accuracy", "Fast generations", "Consumes less credits"],
        assetUrl: `${assetBase}/poses/young-european-model/front-sunglasses-hand.png`,
      },
    ],
    sizes: [
      { id: "original", label: "Original", aspectWidth: 1, aspectHeight: 1 },
      { id: "portrait-9-16", label: "Portrait (9:16)", aspectWidth: 9, aspectHeight: 16 },
      { id: "portrait-3-4", label: "Portrait (3:4)", aspectWidth: 3, aspectHeight: 4 },
      { id: "portrait-2-3", label: "Portrait (2:3)", aspectWidth: 2, aspectHeight: 3 },
      { id: "square", label: "Square", aspectWidth: 1, aspectHeight: 1 },
      { id: "landscape-3-2", label: "Landscape (3:2)", aspectWidth: 3, aspectHeight: 2 },
      { id: "landscape-4-3", label: "Landscape (4:3)", aspectWidth: 4, aspectHeight: 3 },
      { id: "landscape-16-9", label: "Landscape (16:9)", aspectWidth: 16, aspectHeight: 9 },
    ],
    brandStyles: [
      { id: "off", label: "Off", description: "No brand kit styling." },
      { id: "brand-kit", label: "Brand kit", description: "Use saved brand colors and visual rules." },
      { id: "minimal", label: "Minimal", description: "Clean ecommerce styling with restrained edits." },
      { id: "editorial", label: "Editorial", description: "Stronger campaign-style color and lighting." },
    ],
  };
}
