import type { MerchantLandingViewModel } from "../types";

export const MERCHANT_LANDING_CONTENT: MerchantLandingViewModel = {
  hero: {
    eyebrow: "For fashion merchants",
    titleLead: "From catalog",
    titleAccent: "to confident cart.",
    body: "Connect product data, fit and sizing, authorized AI shopping, exact-variant cart handoff, and order reporting in one merchant-controlled program.",
    primaryCta: "Become connected",
    secondaryCta: "Explore the system",
    annotation: "Your catalog. A clearer decision.",
    video: "/media/partner-landing/merchant-studio.mp4",
    poster: "/media/partner-landing/merchant-studio-poster.jpg",
  },
  commerceSteps: [
    { number: "01", icon: "catalog", title: "Connect the catalog", description: "Shopify app, SDK/API, authorized feed, or enterprise connector." },
    { number: "02", icon: "product", title: "Create the decision page", description: "A standardized Direct Connected product page with current variants and merchant identity." },
    { number: "03", icon: "sparkle", title: "Add fit and AI shopping", description: "Size recommendation, fit interpretation, try-on, AI Stylist, and Complete the Look." },
    { number: "04", icon: "cart", title: "Hand off the exact variant", description: "The shopper's confirmed size and color enter your authorized cart integration." },
    { number: "05", icon: "cycle", title: "Reconcile the whole order", description: "Orders, returns, refunds, cancellations, and exchanges stay connected to the source." },
  ],
  capabilities: [
    { icon: "catalog", label: "Catalog", title: "Quality-gated catalog sync", description: "Normalize taxonomy, colors, sizes, fit attributes, and structured data while preserving your source values." },
    { icon: "ruler", label: "Sizing", title: "Category-aware size matching", description: "Map the correct regional and category chart, preserve merchant labels, and show confidence and caveats." },
    { icon: "sparkle", label: "AI commerce", title: "Authorized visual decisions", description: "Support try-on, outfit combinations, comparisons, stylist outputs, and Complete the Look within granted rights." },
    { icon: "cart", label: "Checkout", title: "Exact-variant cart handoff", description: "Verify live price, inventory, region, currency, size, and color before opening the merchant cart." },
    { icon: "receipt", label: "Attribution", title: "Item-level commercial truth", description: "Connect publisher and click/session IDs to validated order, return, refund, and exchange events." },
    { icon: "shield", label: "Control", title: "Merchant-owned permissions", description: "Define catalog scope, AI rights, marks, indexing, cart method, reporting duties, and support levels." },
  ],
  campaignTerms: ["Eligible products", "Publisher authorization", "Commission or fee", "Attribution window", "Exclusions and validation", "Returns and payment timing"],
  interest: {
    title: "Build your connected commerce path.",
    body: "Tell us about your catalog and platform. Our merchant team will prepare the right integration path.",
  },
};
