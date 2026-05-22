import type {
  HeroContent,
  ProblemContent,
  FeaturesContent,
  SdkDemoContent,
  ScaleContent,
  HowContent,
  GarmentsContent,
  CtaBannerContent,
  IntegrationContent,
  PricingContent,
} from "../types/landing";

const ASSET = "/images/landing/ps";

// Sentinel "#pilot" — every Get Started / Get API key CTA on the landing
// page now opens the Apply For Free Pilot modal instead of routing out
// to the myaifitting dashboard. Any consumer that sees "#pilot" should
// call the pilot-modal opener (see IntegrationsSection's isPilotCta wiring
// for the canonical pattern).
export const GET_API_KEY_HREF = "#pilot";
export const DOCS_HREF = "/docs";
export const DEMO_HREF = "/demo/products";

export const HERO: HeroContent = {
  eyebrow: "SDK · Widget · API · Shopify",
  headline: "The",
  headlineEm: "Decision Engine",
  subhead: "Photo-based sizing · Virtual try-on · Trained on your size\u00A0guide",
  primaryLabel: "Apply for free pilot",
  primaryHref: GET_API_KEY_HREF,
  secondaryLabel: "See it in action",
  secondaryHref: DEMO_HREF,
  marquee: [
    "T-Shirts", "Dresses", "Suits", "Tuxedos", "Jeans", "Blouses",
    "Jackets", "Coats", "Activewear", "Swimwear", "Skirts",
    "Formal Wear", "Plus Size", "Pants", "Shorts",
  ],
};

export const PROBLEM: ProblemContent = {
  eyebrow: "Returns",
  headline: "Wrong size. Lost margin.",
  body: "Size returns are the biggest cost in online fashion. Shoppers guess. They order multiples. They send items back. PrimeStyle AI is designed to address this at the source.",
  pullquote: "What if every customer could see a size recommendation aligned to their measurements before they ever touched \u2018Add to Cart\u2019?",
  pullquoteFooter: "That\u2019s what PrimeStyle AI helps with \u2014 reducing guesswork and helping minimize sizing uncertainty so shoppers can buy with more confidence.",
};

export const FEATURES: FeaturesContent = {
  eyebrow: "What it does",
  title: "Four moves. One perfect fit.",
  tabs: [
    {
      id: "photo",
      label: "Photo Sizing",
      title: "AI Sizing by Photo",
      body: "One full-body photo. Our Decision Engine extracts measurements and returns a recommended size from your catalog based on the photo.",
      image: `${ASSET}/optimized/ps-finalizing-pose-v2.webp`,
    },
    {
      id: "smart",
      label: "Smart Sizing",
      title: "Smart Size Recommendation",
      body: "Height, weight, age, and body-specific questions — separate flows for men and women. Matched to your size chart.",
      image: `${ASSET}/ps-raw-01-sizing.jpg`,
    },
    {
      id: "tryon",
      label: "Try-On",
      title: "Virtual Try-On",
      body: "Once the size is found, shoppers see the garment on themselves — inside your product page.",
      image: `${ASSET}/ps-raw-06-tryon.jpg`,
    },
    {
      id: "charts",
      label: "Your Charts",
      title: "Trained on Your Size Chart",
      body: "Send your size guide through the API or upload a CSV. The Decision Engine learns your sizes and recommends fit based on your catalog — not industry averages.",
      image: `${ASSET}/ps-recommended-size-v5.png`,
    },
  ],
};

export const SDK_DEMO: SdkDemoContent = {
  eyebrow: "Live in your store",
  title: "From guessing to knowing — in seconds.",
  subtitle: "Two AI flows. One seamless widget. Built for Shopify.",
  flow1: {
    tag: "Smart Size Finder",
    steps: [
      {
        num: "01",
        label: "Sizing",
        tag: "Smart Size Finder",
        title: "A size recommendation. In seconds.",
        body: "Shoppers enter height, weight, and a few body-type questions. The Decision Engine matches them to your size chart — not industry averages — and returns a recommended size in seconds.",
        image: `${ASSET}/ps-raw-01-sizing.jpg`,
        badges: [
          "Works with any Shopify size chart",
          "Separate flows for men and women",
          "Reduced guesswork — matched to your catalog",
        ],
      },
      {
        num: "02",
        label: "Body",
        tag: "Body Shape",
        title: "Tell us your shape.",
        body: "A few visual questions — narrow, average, or broad. Our engine uses body shape to fine-tune fit, not just raw measurements.",
        image: `${ASSET}/ps-raw-02-bodytype.jpg`,
        badges: [
          "Illustrated options — designed to reduce guesswork",
          "Works for menswear and womenswear",
        ],
      },
      {
        num: "03",
        label: "Your Fit",
        tag: "Perfect Fit",
        title: "A size aligned to your catalog.",
        body: "The Decision Engine returns a recommendation for every piece — jacket, vest, trousers — matched to the brand's own size chart.",
        image: `${ASSET}/ps-raw-03-fitresult.jpg`,
        badges: [
          "One clear recommendation per item",
          "Matched to your catalog, not averages",
        ],
      },
    ],
  },
  flow2: {
    tag: "Virtual Try-On",
    aiTag: "Powered by PrimeStyle Decision Engine",
    steps: [
      {
        num: "01",
        label: "Photo",
        tag: "Virtual Try-On · Step 01",
        title: "Upload one photo.",
        body: "Stand facing the camera — full body in frame. Our visual AI handles everything else. In seconds.",
        image: `${ASSET}/ps-raw-04-photoguid.jpg`,
        badges: [
          "One photo — results in seconds",
          "Works on any Shopify product page",
          "No app download required",
        ],
      },
      {
        num: "02",
        label: "Your Fit",
        tag: "Virtual Try-On · Step 02",
        title: "Visualize the fit.",
        body: "Once the size is found, shoppers upload one photo. Our visual AI generates an illustrative preview of them wearing the garment — inside your product page. Visuals are for illustrative purposes only and may not perfectly reflect actual fit or appearance.",
        image: `${ASSET}/ps-raw-06-tryon.jpg`,
        badges: [],
      },
    ],
  },
};

export const SCALE: ScaleContent = {
  eyebrow: "Built right",
  title: "Built for production environments.",
  cards: [
    { id: "customize", icon: "customize", title: "Fully customizable", body: "Colors, layout, widget placement, flow." },
    { id: "devices",   icon: "devices",   title: "Mobile & desktop",   body: "Same experience, every device." },
    {
      id: "globe",     icon: "globe",     title: "10+ languages",      body: "Sell globally without friction.",
      flags: ["en","es","fr","de","it","pt","ar","zh","ja","ko","ru"],
    },
    { id: "garment",   icon: "garment",   title: "Any garment",        body: "Menswear, womenswear, suits, denim, outerwear, activewear, plus size." },
  ],
};

export const HOW: HowContent = {
  eyebrow: "Setup",
  title: "Live in minutes.",
  steps: [
    { title: "Install",   description: "From the Shopify App Store.",       image: `${ASSET}/ps-step-install.png` },
    { title: "Upload",    description: "Your size chart as a CSV.",         image: `${ASSET}/ps-step-upload.png` },
    { title: "Customize", description: "The widget to match your brand.",   image: `${ASSET}/ps-step-customize.png` },
    { title: "Go live",   description: "On every product page.",            image: `${ASSET}/ps-step-golive.png` },
  ],
};

export const GARMENTS: GarmentsContent = {
  eyebrow: "Any product",
  title: "Designed to work across a wide range of garments.",
  subtitle: "Menswear, womenswear, denim, outerwear, activewear, plus size — if it has a size chart, PrimeStyle fits it.",
  items: [
    { label: "T-Shirts",    image: `${ASSET}/ps-garment-tshirt.png` },
    { label: "Dresses",     image: `${ASSET}/ps-garment-dress.png` },
    { label: "Suits",       image: `${ASSET}/ps-garment-suit.png` },
    { label: "Tuxedos",     image: `${ASSET}/ps-garment-tuxedo.png` },
    { label: "Jeans",       image: `${ASSET}/ps-garment-jeans.png` },
    { label: "Blouses",     image: `${ASSET}/ps-garment-blouse.png` },
    { label: "Jackets",     image: `${ASSET}/ps-garment-jacket.png` },
    { label: "Coats",       image: `${ASSET}/ps-garment-coat.png` },
    { label: "Activewear",  image: `${ASSET}/ps-garment-activewear.png` },
    { label: "Swimwear",    image: `${ASSET}/ps-garment-swimwear.png` },
    { label: "Skirts",      image: `${ASSET}/ps-garment-skirt.png` },
    { label: "Formal Wear", image: `${ASSET}/ps-garment-formal.png` },
    { label: "Plus Size",   image: `${ASSET}/ps-garment-plussize.png` },
    { label: "Pants",       image: `${ASSET}/ps-garment-pants.png` },
    { label: "Shorts",      image: `${ASSET}/ps-garment-shorts.png` },
  ],
};

export const INTEGRATIONS: IntegrationContent = {
  eyebrow: "Ship it your way",
  title: "Four ways to integrate.",
  subtitle: "SDK and REST API are live today. Widget and Shopify app are next up — get on the list and we'll ping you the day they ship.",
  methods: [
    {
      id: "sdk",
      label: "SDK",
      title: "React & JavaScript SDK",
      body: "Typed, tree-shakable, ships with full sizing + try-on components. Three lines and you're live.",
      docsHref: `${DOCS_HREF}#sdk`,
      badge: "Available",
    },
    {
      id: "api",
      label: "API",
      title: "REST API",
      body: "Full-control endpoints for sizing, try-on, and catalog sync. Bring your own frontend, ours stays out of the way.",
      docsHref: `${DOCS_HREF}#api`,
      badge: "Available",
    },
    {
      id: "widget",
      label: "Widget",
      title: "Drop-in Widget",
      body: "Zero-code embed. Paste a single <script> on your product page — works with any CMS or storefront.",
      docsHref: `${DOCS_HREF}#widget`,
      comingSoon: true,
    },
    {
      id: "shopify",
      label: "Shopify",
      title: "Shopify App",
      body: "One-click install. Trained on your size chart, themed to your store, live on every product page in minutes.",
      docsHref: `${DOCS_HREF}#shopify`,
      comingSoon: true,
    },
  ],
};

export const PRICING: PricingContent = {
  eyebrow: "Pricing",
  title: "Simple, usage-based pricing.",
  subtitle: "Start small. Control exposure. Scale with real customer engagement.",
  tiers: [
    {
      id: "pilot",
      name: "Pilot",
      price: "Free",
      description: "A controlled way to test the Decision Engine in a real environment.",
      features: [
        "50 try-ons",
        "Limited product selection",
        "7 day access",
        "Basic reporting",
        "No credit card required",
      ],
      ctaLabel: "Start Pilot",
      ctaHref: GET_API_KEY_HREF,
      free: true,
    },
    {
      id: "starter",
      name: "Starter",
      price: "$99",
      priceSuffix: "/month",
      description: "For smaller brands and initial rollouts.",
      features: [
        "200 try-ons included",
        "$0.50 per additional try-on",
        "Usage billed by Shopify",
        "Full Decision Engine access",
        "Email support",
      ],
      ctaLabel: "Get Started",
      ctaHref: GET_API_KEY_HREF,
    },
    {
      id: "growth",
      name: "Growth",
      price: "$199",
      priceSuffix: "/month",
      description: "For growing brands looking to scale usage.",
      features: [
        "400 try-ons included",
        "$0.50 per additional try-on",
        "Usage billed by Shopify",
        "Full Decision Engine access",
        "Advanced usage controls",
        "Priority support",
      ],
      ctaLabel: "Start Growing",
      ctaHref: GET_API_KEY_HREF,
      featured: true,
    },
    {
      id: "pro",
      name: "Pro",
      price: "$299",
      priceSuffix: "/month",
      description: "For brands with consistent customer engagement.",
      features: [
        "600 try-ons included",
        "$0.50 per additional try-on",
        "Usage billed by Shopify",
        "Full Decision Engine access",
        "Advanced analytics",
        "Priority support",
      ],
      ctaLabel: "Scale Usage",
      ctaHref: GET_API_KEY_HREF,
    },
    {
      id: "scale",
      name: "Scale",
      price: "Custom",
      description: "For high-volume retailers and larger catalogs.",
      features: [
        "Custom included try-ons",
        "Volume usage pricing",
        "Full Decision Engine access",
        "Dedicated support",
        "SLA options",
      ],
      ctaLabel: "Contact Sales",
      ctaHref: "mailto:support@primestyleai.com",
    },
  ],
  payg: {
    title: "Not ready for a plan?",
    description: "Start with pay-as-you-go and scale when you're ready.",
    price: "$0.50",
    priceSuffix: "per try-on",
    bullets: [
      "No monthly commitment",
      "Full Decision Engine access",
      "Ideal for testing or low-volume usage",
    ],
    ctaLabel: "Start Pay-As-You-Go",
    ctaHref: GET_API_KEY_HREF,
  },
  enterpriseNote: {
    label: "Need higher volume, custom SLAs, or on-prem? Talk to Enterprise →",
    href: "mailto:support@primestyleai.com",
  },
};

export const CTA: CtaBannerContent = {
  title: "Match every shopper to the right size.",
  body: "Grab an API key and ship sizing + try-on in an afternoon.",
  primaryLabel: "Apply for free pilot",
  primaryHref: GET_API_KEY_HREF,
  secondaryLabel: "See it in action",
  secondaryHref: DEMO_HREF,
  footer: "Free tier · SDK, Widget, API, Shopify · No credit card required",
};
