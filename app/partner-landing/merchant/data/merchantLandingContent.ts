import type { MerchantLandingViewModel } from "../types";

export const MERCHANT_LANDING_CONTENT: MerchantLandingViewModel = {
  hero: {
    eyebrow: "",
    titleLead: "One network.",
    titleMiddleLead: "Every",
    titleMiddleTail: "product",
    titleAccent: "advantage.",
    body: "Bring AI sizing and virtual try-on, trusted creators, PDP Studio, a dedicated merchant dashboard, and supplier access around one catalog—so every product is easier to discover, experience, and buy.",
    primaryCta: "Join the waitlist",
    secondaryCta: "See how it works",
    annotation: "Size it. Try it. Create it. Source it. Sell it.",
    image: "/media/partner-landing/merchant-network/running-shoe.webp",
    heroImage:
      "/media/partner-landing/merchant-network/merchant-network-people-logo-hero-v6-retail-right-4k.png",
    heroMobileImage:
      "/media/partner-landing/merchant-network/merchant-network-people-logo-hero-v6-retail-right-mobile-4k.png",
    pillars: [
      {
        title: "AI fit + try-on",
        description: "Personalize every product decision.",
        image:
          "/media/partner-landing/merchant-network/merchant-hero-ai-try-on-chatgpt-pro.png",
        imageAlt: "A shopper using PrimeStyleAI virtual try-on on a pink phone",
      },
      {
        title: "Influencer network",
        description: "Turn products into trusted demand.",
        image:
          "/media/partner-landing/merchant-network/merchant-hero-creator-network-chatgpt-pro.png",
        imageAlt:
          "A fashion creator surrounded by phones recording campaign content",
      },
      {
        title: "PDP Studio",
        description: "Create every product moment.",
        image:
          "/media/partner-landing/merchant-network/merchant-features/pdp-studio-photoshoot-v3.webp",
        imageAlt: "A polished PDP Studio campaign image of silver sneakers",
      },
      {
        title: "Merchant dashboard",
        description: "Run the network from one place.",
        image: "/media/merchant-dashboard/illustrations/overview.webp",
        imageAlt:
          "Merchant dashboard analytics arranged around a tailored blazer",
      },
      {
        title: "Supplier access",
        description: "Source more products, faster.",
        image: "/media/partner-landing/supplier/merchant-discovery.png",
        imageAlt:
          "A fashion supplier managing garments and merchant orders from a laptop",
      },
    ],
  },
  commerceSteps: [
    {
      number: "01",
      icon: "catalog",
      title: "Connect the catalog",
      description:
        "Shopify app, SDK/API, authorized feed, or enterprise connector.",
    },
    {
      number: "02",
      icon: "product",
      title: "Create the decision page",
      description:
        "A standardized Direct Connected product page with current variants and merchant identity.",
    },
    {
      number: "03",
      icon: "sparkle",
      title: "Add fit and AI shopping",
      description:
        "Size recommendation, fit interpretation, try-on, AI Stylist, and Complete the Look.",
    },
    {
      number: "04",
      icon: "cart",
      title: "Hand off the exact variant",
      description:
        "The shopper's confirmed size and color enter your authorized cart integration.",
    },
    {
      number: "05",
      icon: "cycle",
      title: "Reconcile the whole order",
      description:
        "Orders, returns, refunds, cancellations, and exchanges stay connected to the source.",
    },
  ],
  capabilities: [
    {
      icon: "catalog",
      label: "Catalog",
      title: "Quality-gated catalog sync",
      description:
        "Normalize taxonomy, colors, sizes, fit attributes, and structured data while preserving your source values.",
    },
    {
      icon: "ruler",
      label: "Sizing",
      title: "Category-aware size matching",
      description:
        "Map the correct regional and category chart, preserve merchant labels, and show confidence and caveats.",
    },
    {
      icon: "sparkle",
      label: "AI commerce",
      title: "Authorized visual decisions",
      description:
        "Support try-on, outfit combinations, comparisons, stylist outputs, and Complete the Look within granted rights.",
    },
    {
      icon: "cart",
      label: "Checkout",
      title: "Exact-variant cart handoff",
      description:
        "Verify live price, inventory, region, currency, size, and color before opening the merchant cart.",
    },
    {
      icon: "receipt",
      label: "Attribution",
      title: "Item-level commercial truth",
      description:
        "Connect publisher and click/session IDs to validated order, return, refund, and exchange events.",
    },
    {
      icon: "shield",
      label: "Control",
      title: "Merchant-owned permissions",
      description:
        "Define catalog scope, AI rights, marks, indexing, cart method, reporting duties, and support levels.",
    },
  ],
  campaignTerms: [
    "Eligible products",
    "Publisher authorization",
    "Commission or fee",
    "Attribution window",
    "Exclusions and validation",
    "Returns and payment timing",
  ],
  interest: {
    title: "Join the PrimeStyleAI network.",
    body: "Tell us how you want to connect—as a supplier, affiliate merchant, or direct connected merchant.",
  },
};
