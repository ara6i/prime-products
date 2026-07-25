import type {
  PdpStudioAuditCatalog,
  PdpStudioOption,
  PdpStudioToolDefinition,
  PdpStudioUiIconName,
} from "../types";

function options(labels: string[]): PdpStudioOption[] {
  return labels.map((label) => ({
    id: label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, ""),
    label,
  }));
}

const qualityOptions = options(["Standard · 1K", "Advanced · 2K", "Premium · 4K+"]);
const outputSizes = options([
  "Original",
  "Portrait 9:16",
  "Portrait 3:4",
  "Portrait 2:3",
  "Square",
  "Landscape 3:2",
  "Landscape 4:3",
  "Landscape 16:9",
]);

function generatorTool(
  definition: Omit<PdpStudioToolDefinition, "href" | "group" | "mode"> & {
    mode?: PdpStudioToolDefinition["mode"];
    group?: PdpStudioToolDefinition["group"];
  },
): PdpStudioToolDefinition {
  return {
    ...definition,
    icon: definition.id,
    href: `/pdp-studio/tools/${definition.id}`,
    group: definition.group ?? "create",
    mode: definition.mode ?? "generator",
  };
}

const CREATE_TOOLS: PdpStudioToolDefinition[] = [
  generatorTool({
    id: "video-generator",
    label: "Video Generator",
    description: "Turn up to four product angles into one short product video.",
    icon: "video",
    home: true,
    featured: true,
    badge: "Max",
    acceptsMultiple: true,
    uploadLabel: "Add product images",
    promptLabel: "Describe the video you want",
    outputCount: 1,
    defaultSize: "Square",
    options: [
      {
        label: "Template category",
        values: options(["All", "Dresses", "Tops", "Bottoms", "Outerwear", "Accessories", "Footwear", "Bags", "Beauty", "Food & Drink", "Furniture"]),
      },
      { label: "Template", values: options(["No template", "Clean rotation", "Studio reveal", "Close-up motion", "Lifestyle pan"]) },
      { label: "Output size", values: outputSizes },
    ],
  }),
  {
    id: "ai-fashion-models",
    label: "AI Fashion Models",
    description: "Visualize apparel on a selected model, pose, and background.",
    icon: "ai-fashion-models",
    mode: "generator",
    href: "/pdp-studio/clothing-photoshoot",
    group: "create",
    home: true,
    featured: true,
  },
  generatorTool({
    id: "product-staging",
    label: "Product Staging",
    description: "Create a lifestyle image that shows a product in context.",
    icon: "image",
    home: true,
    featured: true,
    uploadLabel: "Add one product image",
    promptLabel: "Describe the scene you want",
    outputCount: 1,
    defaultSize: "Landscape 3:2",
    options: [
      { label: "Quality", values: qualityOptions },
      { label: "Output size", values: outputSizes },
      { label: "Brand style", values: options(["Off", "Use Brand Kit"]) },
    ],
  }),
  generatorTool({
    id: "product-beautifier",
    label: "Product Beautifier",
    description: "Create a polished, professional product image.",
    icon: "wand",
    home: true,
    uploadLabel: "Add one product image",
    promptLabel: "Describe the finish you want",
    outputCount: 1,
    defaultSize: "Square",
    options: [
      { label: "Quality", values: qualityOptions },
      { label: "Output size", values: outputSizes },
      { label: "Brand style", values: options(["Off", "Use Brand Kit"]) },
    ],
  }),
  generatorTool({
    id: "edit-with-ai",
    label: "Edit with AI",
    description: "Change a selected detail using a written instruction.",
    icon: "sparkles",
    acceptsMultiple: true,
    uploadLabel: "Add images",
    promptLabel: "Describe an edit",
    outputCount: 1,
    defaultSize: "Square",
    options: [
      { label: "Quality", values: qualityOptions },
      { label: "Output size", values: outputSizes },
      { label: "Brand style", values: options(["Off", "Use Brand Kit"]) },
    ],
  }),
  generatorTool({
    id: "create-any-image",
    label: "Create any image",
    description: "Generate two images from a written prompt and visual style.",
    icon: "ai",
    mode: "text-generator",
    promptLabel: "Describe an image",
    outputCount: 2,
    defaultSize: "Square",
    options: [
      {
        label: "Style",
        values: options(["Random", "Hyper-Realistic Rendering", "Impressionist Painting", "Low Poly 3D", "Isometric View", "Futuristic Cyberpunk", "Baroque Ornate", "Abstract Expressionism", "Photorealistic CGI", "Surrealist Dreamscape"]),
      },
      { label: "Output size", values: outputSizes },
    ],
  }),
  generatorTool({
    id: "ghost-mannequin",
    label: "Ghost Mannequin",
    description: "Display a garment on a clean 3D ghost mannequin.",
    icon: "model",
    home: true,
    uploadLabel: "Add one garment image",
    promptLabel: "Describe styling details",
    outputCount: 1,
    defaultSize: "Square",
    options: [
      { label: "Quality", values: qualityOptions },
      { label: "Output size", values: outputSizes },
      { label: "Brand style", values: options(["Off", "Use Brand Kit"]) },
    ],
  }),
  generatorTool({
    id: "flat-lay",
    label: "Flat Lay",
    description: "Place a product flat on a clean, neutral surface.",
    icon: "layers",
    home: true,
    uploadLabel: "Add one product image",
    promptLabel: "Describe styling details",
    outputCount: 1,
    defaultSize: "Square",
    options: [
      { label: "Quality", values: qualityOptions },
      { label: "Output size", values: outputSizes },
      { label: "Brand style", values: options(["Off", "Use Brand Kit"]) },
    ],
  }),
  generatorTool({
    id: "logo",
    label: "Logo",
    description: "Generate two logo directions from a business description.",
    icon: "brand",
    mode: "text-generator",
    promptLabel: "What does your business do?",
    outputCount: 2,
    defaultSize: "Square",
    options: [
      { label: "Style", values: options(["Random", "Modern", "Minimalist", "Vintage", "Handwritten", "Flat Design", "Negative Space", "3D", "Monogram", "Luxury", "Smart Lettermark", "Playful"]) },
      { label: "Output size", values: outputSizes },
    ],
  }),
  generatorTool({
    id: "recolor",
    label: "Recolor",
    description: "Recolor a whole product or one described part.",
    icon: "recolor",
    uploadLabel: "Add one product image",
    promptLabel: "Which part should be recolored?",
    outputCount: 1,
    defaultSize: "Original",
    options: [
      { label: "Target color", values: [{ id: "violet", label: "#4D3DE3", swatch: "#4D3DE3" }] },
      { label: "Quality", values: qualityOptions },
      { label: "Output size", values: outputSizes },
    ],
  }),
  generatorTool({
    id: "product-photography",
    label: "Product photography",
    description: "Generate two product-photo concepts from a description.",
    icon: "camera",
    mode: "text-generator",
    promptLabel: "Describe a product",
    outputCount: 2,
    defaultSize: "Portrait 3:4",
    options: [
      { label: "Style", values: options(["Random", "Professional", "Cinematic", "Muted", "High Contrast", "Vintage Analog", "Polaroid", "Editorial", "Black & White", "Film Noir", "Raw Flash"]) },
      { label: "Output size", values: outputSizes },
    ],
  }),
  generatorTool({
    id: "text",
    label: "Text",
    description: "Generate stylized text imagery for campaign creative.",
    icon: "text",
    mode: "text-generator",
    promptLabel: "Write any text",
    outputCount: 2,
    defaultSize: "Square",
    options: [
      { label: "Style", values: options(["Random", "Bubble Balloons", "Soft Plush Material", "Fluffy Clouds", "Handwritten", "Cyberpunk", "3D Embossed", "Graffiti", "Blackletter", "Art Nouveau", "Groovy 1970s", "Neon Glow", "Kawaii", "Knitted", "3D Clay", "Modern Sans"]) },
      { label: "Output size", values: outputSizes },
    ],
  }),
  generatorTool({
    id: "ironing",
    label: "Ironing",
    description: "Preview wrinkle removal for clothing and fabric images.",
    icon: "wand",
    uploadLabel: "Add one clothing or fabric image",
    outputCount: 1,
  }),
  generatorTool({
    id: "product-packaging",
    label: "Product packaging",
    description: "Generate two packaging directions for a product and brand.",
    icon: "product",
    mode: "text-generator",
    promptLabel: "Describe your product and brand",
    outputCount: 2,
    defaultSize: "Landscape 4:3",
    options: [
      { label: "Style", values: options(["Random", "Eco-Friendly", "Luxury", "Vintage", "Minimalist", "Bold Patterns", "Pop Art", "Floral", "Metallic", "Transparent"]) },
      { label: "Output size", values: outputSizes },
    ],
  }),
  generatorTool({
    id: "instagram-story",
    label: "Instagram story",
    description: "Generate two promotional story directions.",
    icon: "image",
    mode: "text-generator",
    promptLabel: "Describe the business and promotion",
    outputCount: 2,
    defaultSize: "Portrait 9:16",
    options: [
      { label: "Style", values: options(["Random", "Vibrant and Colorful", "Minimalist Chic", "Retro Vintage", "Modern and Sleek", "Hand-Drawn Illustration", "Bold Typography", "Neon Glow", "Pastel Aesthetic", "Grunge Urban"]) },
      { label: "Output size", values: outputSizes },
    ],
  }),
];

const ALL_TOOLS: PdpStudioToolDefinition[] = [
  generatorTool({
    id: "product-fixer",
    label: "Product Fixer",
    description: "Compare a generated image with real product references.",
    icon: "wand",
    group: "all",
    mode: "dual-upload",
    uploadLabel: "Add the image that needs fixing",
    secondaryUploadLabel: "Add real product photos",
    acceptsMultiple: true,
    outputCount: 1,
  }),
  ...([
    ["image-enhancer", "Image Enhancer", "Improve image clarity after an upload.", "wand"],
    ["ai-backgrounds", "AI Backgrounds", "Generate or replace a product background.", "image"],
    ["ai-expand", "AI Expand", "Extend an image beyond its current crop.", "expand"],
    ["ai-shadows", "AI Shadows", "Add a realistic product shadow.", "layers"],
    ["background-remover", "Background Remover", "Remove a product background.", "image"],
    ["resize", "Resize", "Prepare marketplace and social output sizes.", "resize"],
    ["retouch", "Retouch", "Retouch selected image details.", "wand"],
  ] as const).map(([id, label, description, icon]) =>
    generatorTool({
      id,
      label,
      description,
      icon,
      group: "all",
      mode: "upload",
      uploadLabel: "Select an image",
      outputCount: 1,
    }),
  ),
  generatorTool({
    id: "ai-images",
    label: "AI Images",
    description: "Choose any available AI image creation workflow.",
    icon: "ai",
    group: "all",
    mode: "chooser",
  }),
  generatorTool({
    id: "studio-shot",
    label: "Studio Shot",
    description: "Create a clean product shot with controlled shadow and backdrop.",
    icon: "camera",
    group: "all",
    mode: "studio-shot",
    uploadLabel: "Add one product image",
    outputCount: 1,
    options: [
      { label: "Shadow", values: options(["Soft", "Hard", "Floating", "None"]) },
      { label: "Backdrop", values: options(["Plain", "Cyclo", "Lightbox"]) },
      { label: "Output size", values: options(["Portrait", "Square"]) },
    ],
  }),
  generatorTool({
    id: "ai-shot-list",
    label: "AI shot list",
    description: "Choose source images for a structured product shot list.",
    icon: "design",
    group: "all",
    mode: "shot-list",
    acceptsMultiple: true,
    uploadLabel: "Add images",
    options: [
      { label: "Image source", values: options(["All", "Uploads", "Shopify products", "AI images", "Designs"]) },
    ],
  }),
];

const BACKGROUNDS = [
  {
    id: "sell-ready",
    label: "Sell-ready",
    items: [
      {
        id: "clean-white",
        label: "Clean white",
        image: "/images/pdp-studio/presets/clean-white.png",
      },
      {
        id: "transparent-cutout",
        label: "Transparent cutout",
        image: "/images/pdp-studio/presets/transparent-cutout.png",
      },
      {
        id: "soft-shadow",
        label: "Soft shadow",
        image: "/images/pdp-studio/presets/soft-shadow.png",
      },
      {
        id: "catalog-gray",
        label: "Catalog gray",
        image: "/images/pdp-studio/presets/catalog-gray.png",
      },
    ],
  },
  {
    id: "studio-scenes",
    label: "Studio scenes",
    items: [
      {
        id: "warm-plinth",
        label: "Warm plinth",
        image: "/images/pdp-studio/presets/warm-plinth.png",
      },
      {
        id: "concrete-studio",
        label: "Concrete studio",
        image: "/images/pdp-studio/presets/concrete-studio.png",
      },
      {
        id: "window-light",
        label: "Window light",
        image: "/images/pdp-studio/presets/window-light.png",
      },
      {
        id: "cobalt-sweep",
        label: "Cobalt sweep",
        image: "/images/pdp-studio/presets/cobalt-sweep.png",
      },
    ],
  },
  {
    id: "lifestyle-scenes",
    label: "Lifestyle scenes",
    items: [
      {
        id: "minimal-home",
        label: "Minimal home",
        image: "/images/pdp-studio/presets/minimal-home.png",
      },
      {
        id: "boutique-display",
        label: "Boutique display",
        image: "/images/pdp-studio/presets/boutique-display.png",
      },
      {
        id: "stone-gallery",
        label: "Stone gallery",
        image: "/images/pdp-studio/presets/stone-gallery.png",
      },
      {
        id: "outdoor-daylight",
        label: "Outdoor daylight",
        image: "/images/pdp-studio/presets/outdoor-daylight.png",
      },
    ],
  },
];

const MARKETPLACE_PRESETS = options([
  "Facebook Marketplace", "eBay", "Poshmark", "Depop", "Mercari", "Mercado Libre", "Shopee", "Lazada", "Etsy Square", "Etsy Landscape", "Vinted", "Amazon", "Shopify Square", "Shopify Landscape", "Shopify Portrait", "Naver Banner", "Naver Product", "Karrot", "G Market", "SSG", "Idus", "auction", "11st", "Kakao Talk Store", "Mercari JP", "Creema", "Rakuten", "Qoo10", "BUYMA", "Otto Market", "Zalando", "Kaufland", "Mercado Livre", "Nuvemshop", "WhatsApp Business", "OLX", "Line Shop", "Shopline Product", "Shopline Banner", "MOMO",
]);

const SOCIAL_PRESETS = options([
  "Instagram Story", "Instagram Post", "Instagram Reel", "TikTok Post", "TikTok Thumbnail", "YouTube Cover", "YouTube Channel Art", "Facebook Cover", "Facebook Post", "LinkedIn Banner", "LinkedIn Profile Picture", "WhatsApp Sticker", "Pinterest", "Line",
]);

const icon = (name: PdpStudioUiIconName): PdpStudioUiIconName => name;

export const PDP_STUDIO_AUDIT_CATALOG: PdpStudioAuditCatalog = {
  navigation: [
    {
      routes: [
        { id: "home", label: "Home", icon: icon("home"), href: "/pdp-studio" },
        { id: "ai-tools", label: "AI Tools", icon: icon("ai"), href: "/pdp-studio/ai-tools" },
        { id: "photoshoot", label: "Photoshoot", icon: icon("camera"), href: "/pdp-studio/clothing-photoshoot" },
        { id: "batch", label: "Batch", icon: icon("batch"), href: "/pdp-studio/batch" },
      ],
      actions: [{ id: "activity", label: "Activity", icon: icon("activity") }],
    },
    {
      label: "Content",
      routes: [
        { id: "products", label: "Shopify Products", icon: icon("shopify"), href: "/pdp-studio/products", badge: "New" },
        { id: "designs", label: "Designs", icon: icon("design"), href: "/pdp-studio/designs" },
        { id: "brand-kit", label: "Brand Kit", icon: icon("brand"), href: "/pdp-studio/brand-kit" },
        { id: "templates", label: "Templates", icon: icon("template"), href: "/pdp-studio/templates" },
      ],
    },
    {
      label: "Workspace",
      routes: [{ id: "preferences", label: "Preferences", icon: icon("settings"), href: "/pdp-studio/preferences" }],
      actions: [
        { id: "usage", label: "Usage", icon: icon("usage") },
        { id: "api", label: "Visual Agents & API", icon: icon("api") },
        { id: "upgrade", label: "Upgrade Space", icon: icon("sparkles") },
        { id: "help", label: "Help", icon: icon("help") },
      ],
    },
  ],
  tools: [...CREATE_TOOLS, ...ALL_TOOLS],
  backgrounds: BACKGROUNDS,
  marketplacePresets: MARKETPLACE_PRESETS,
  socialPresets: SOCIAL_PRESETS,
  blankCanvases: options(["Custom size", "Landscape", "Portrait", "Square"]),
  plans: [
    {
      id: "pro",
      label: "Pro",
      tagline: "Create polished listings and sell more.",
      monthlyPrice: "$7.99",
      yearlyPrice: "$49.99",
      yearlyMonthlyEquivalent: "$4.17/mo",
      features: ["Batch edit up to 50 images", "High AI export limit", "1,000+ Pro templates", "HD export", "Brand Kit", "Marketplace resizing"],
    },
    {
      id: "max",
      label: "Max",
      tagline: "Make high-quality product visuals to boost sales.",
      monthlyPrice: "$26.99",
      yearlyPrice: "$124.99",
      yearlyMonthlyEquivalent: "$10.42/mo",
      features: ["Everything in Pro", "Publish visuals to Shopify", "Batch up to 250 images", "3× faster Batch", "Best AI models", "Priority support"],
      recommended: true,
    },
    {
      id: "ultra",
      label: "Ultra",
      tagline: "Automate image creation across large catalogs.",
      monthlyPrice: "$99",
      yearlyPrice: "$990",
      yearlyMonthlyEquivalent: "$82.50/mo",
      features: ["Everything in Max", "4K+ quality", "Advanced AI workflows", "Fastest processing", "5,000 Batch exports", "Volume variants up to Ultra 10x"],
    },
  ],
  preferenceSections: [
    { id: "account-profile", label: "Profile", group: "account" },
    { id: "account-billing", label: "Billing", group: "account" },
    { id: "account-usage", label: "Usage", group: "account" },
    { id: "space-details", label: "Space details", group: "space" },
    { id: "space-members", label: "Members", group: "space" },
    { id: "space-billing", label: "Billing", group: "space" },
    { id: "space-usage", label: "Usage", group: "space" },
    { id: "space-settings", label: "Settings", group: "space" },
  ],
};
