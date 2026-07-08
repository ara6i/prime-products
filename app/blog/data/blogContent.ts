import type {
  BlogAuthor,
  BlogCreatingItem,
  BlogExperienceItem,
  BlogPostRecord,
  BlogToolItem,
  BlogTopic,
} from "../types";

export const BLOG_TOPICS: BlogTopic[] = [
  { key: "ai-sizing", label: "AI Sizing", iconName: "ruler" },
  { key: "virtual-try-on", label: "Virtual Try-On", iconName: "sparkles" },
  { key: "shopify", label: "Shopify", iconName: "shopping-bag" },
  { key: "conversion", label: "Conversion", iconName: "gauge" },
  { key: "fashion-tech", label: "Fashion Tech", iconName: "shirt" },
  { key: "fit-data", label: "Fit Data", iconName: "bar-chart" },
  { key: "merchant-growth", label: "Growth", iconName: "bot" },
];

export const BLOG_AUTHOR: BlogAuthor = {
  name: "PrimeStyleAI Editorial",
  role: "AI commerce insights",
  location: "Built for Shopify merchants",
  bio: "Clear notes on sizing intelligence, visual try-on, shopper confidence, and the operating details that help apparel stores reduce fit friction.",
  avatarSrc: "/images/landing/logo-footer-6fe3f1.png",
};

export const BLOG_POSTS: BlogPostRecord[] = [
  {
    id: "fit-confidence",
    title: "How AI Fit Guidance Turns Uncertain Shoppers Into Confident Buyers",
    excerpt:
      "Why photo-based sizing, product measurements, and clear fit language matter when shoppers are deciding between sizes.",
    publishedAt: "2026-06-24",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["ai-sizing", "conversion"],
    imageSrc: "/images/landing/ps/ps-recommended-size-v3.png",
    imageAlt: "PrimeStyleAI size recommendation result",
    readTimeMinutes: 5,
    content: [
      {
        type: "paragraph",
        body: "Fit uncertainty starts before checkout. A shopper may like the product, trust the brand, and still hesitate because size selection feels risky.",
      },
      {
        type: "heading",
        title: "1. Start with the product, not generic advice",
        body: "Recommendations are stronger when they use the merchant's own measurements, product category, cut, and size chart instead of broad apparel assumptions.",
      },
      {
        type: "heading",
        title: "2. Show a clear answer",
        body: "The result should say what size to choose and why. Confidence comes from readable fit language, not a black-box score.",
      },
      {
        type: "heading",
        title: "3. Keep visual try-on nearby",
        body: "Sizing and try-on answer different questions. Size guidance reduces risk; virtual try-on helps the shopper imagine the item on themselves.",
      },
      {
        type: "heading",
        title: "4. Measure friction points",
        body: "Track where shoppers start, abandon, and complete fit flows so the product page can improve over time.",
      },
    ],
  },
  {
    id: "virtual-tryon-pdp",
    title: "Designing Virtual Try-On for the Product Page, Not a Demo Lab",
    excerpt:
      "The product page needs fast decisions, accurate visuals, and CTAs that keep shoppers inside the buying flow.",
    publishedAt: "2026-06-20",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["virtual-try-on", "shopify"],
    imageSrc: "/images/landing/ps/ps-raw-06-tryon.jpg",
    imageAlt: "Virtual try-on preview inside a shopping flow",
    readTimeMinutes: 6,
    content: [
      {
        type: "paragraph",
        body: "A product-page try-on experience has to earn attention quickly. Shoppers are there to decide, compare, and buy.",
      },
      {
        type: "heading",
        title: "1. Make the entry point obvious",
        body: "The CTA should sit close to the buying decision and use direct language that explains the value without needing extra instructions.",
      },
      {
        type: "heading",
        title: "2. Keep the result tied to the product",
        body: "The shopper should always know which product they are trying, what image was used, and how to return to the product page.",
      },
      {
        type: "heading",
        title: "3. Avoid demo-only behavior",
        body: "A polished lab demo is not enough. Real product pages need fast loading, mobile-safe layouts, and predictable recovery states.",
      },
    ],
  },
  {
    id: "size-chart-training",
    title: "Why Your Own Size Chart Should Train the Recommendation Layer",
    excerpt:
      "Generic sizing advice misses brand-specific fit. Merchant charts and product context make recommendations feel real.",
    publishedAt: "2026-06-16",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["fit-data", "ai-sizing"],
    imageSrc: "/images/landing/ps/ps-raw-01-sizing.jpg",
    imageAlt: "Sizing workflow visual",
    readTimeMinutes: 4,
    content: [
      {
        type: "paragraph",
        body: "Every brand has its own fit logic. A medium in one catalog can behave very differently from a medium in another.",
      },
      {
        type: "heading",
        title: "1. Treat the size chart as product data",
        body: "Measurements, units, and category rules should be normalized and connected to product records before recommendations are shown.",
      },
      {
        type: "heading",
        title: "2. Respect category differences",
        body: "Dresses, pants, shoes, hats, and accessories need different measurement paths and shopper-facing language.",
      },
    ],
  },
  {
    id: "shopify-rollout",
    title: "A Practical Shopify Rollout Plan for Try-On and Smart Sizing",
    excerpt:
      "Start with a small product set, verify theme placement, measure engagement, then expand without breaking the storefront.",
    publishedAt: "2026-06-12",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["shopify", "merchant-growth"],
    imageSrc: "/images/landing/ps/ps-step-golive.png",
    imageAlt: "Shopify go-live step illustration",
    readTimeMinutes: 7,
    content: [
      {
        type: "paragraph",
        body: "A good Shopify rollout starts small and proves the experience on real products before it expands to the full catalog.",
      },
      {
        type: "heading",
        title: "1. Begin with a controlled product set",
        body: "Choose products with clean images, known size charts, and enough traffic to evaluate shopper behavior.",
      },
      {
        type: "heading",
        title: "2. Verify storefront placement",
        body: "Theme placement, mobile spacing, app proxy behavior, and product gating should be checked before launch.",
      },
    ],
  },
  {
    id: "returns-signal",
    title: "The Fit Signals That Can Reduce Avoidable Returns",
    excerpt:
      "Returns are not just a logistics problem. They often start with unclear size confidence before checkout.",
    publishedAt: "2026-06-08",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["conversion", "fit-data"],
    imageSrc: "/images/landing/feature-catalog-screenshots.png",
    imageAlt: "Catalog and product insight screens",
    readTimeMinutes: 5,
    content: [
      {
        type: "paragraph",
        body: "Avoidable returns often begin with vague size confidence. The product page should reduce that uncertainty before checkout.",
      },
      {
        type: "heading",
        title: "1. Separate fit confidence from style preference",
        body: "A shopper can like the look and still worry about fit. The interface should answer both questions clearly.",
      },
      {
        type: "heading",
        title: "2. Track recommendation acceptance",
        body: "Acceptance, add-to-cart, and return patterns show whether fit guidance is helping shoppers make better choices.",
      },
    ],
  },
  {
    id: "accessories-fit",
    title: "What Changes When Sizing Expands Beyond Apparel",
    excerpt:
      "Shoes, eyewear, hats, belts, and jewelry need different measurement paths from shirts and dresses.",
    publishedAt: "2026-06-03",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["fashion-tech", "ai-sizing"],
    imageSrc: "/images/catalog/occasion-products/occasion-product-6.png",
    imageAlt: "Accessory product styling visual",
    readTimeMinutes: 4,
    content: [
      {
        type: "paragraph",
        body: "Accessories should not be treated as apparel with different copy. The measurement model changes by category.",
      },
      {
        type: "heading",
        title: "1. Route by product type",
        body: "Shoes, hats, eyewear, jewelry, bags, and belts need category-specific sizing and try-on expectations.",
      },
      {
        type: "heading",
        title: "2. Use guide-only states honestly",
        body: "When a product is one-size or guide-only, the UI should explain useful details without inventing a size recommendation.",
      },
    ],
  },
  {
    id: "shopper-photo-flow",
    title: "Making Photo Upload Feel Safe, Fast, and Worth It",
    excerpt:
      "A better photo flow explains value through the interface itself and avoids adding friction before the shopper sees results.",
    publishedAt: "2026-05-29",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["virtual-try-on", "conversion"],
    imageSrc: "/images/landing/ps/ps-raw-04-photoguid.jpg",
    imageAlt: "Photo guide for shopper upload",
    readTimeMinutes: 5,
    content: [
      {
        type: "paragraph",
        body: "Photo upload has to feel worth it. Shoppers need to understand what they get before they commit to the flow.",
      },
      {
        type: "heading",
        title: "1. Show the value immediately",
        body: "Use concise UI text, visual examples, and progress states that connect the upload to a clear fit or try-on result.",
      },
      {
        type: "heading",
        title: "2. Keep mobile controls visible",
        body: "Footer actions, result CTAs, and retry controls need stable placement on smaller screens.",
      },
    ],
  },
  {
    id: "merchant-dashboard",
    title: "What Merchants Need From a Fit Intelligence Dashboard",
    excerpt:
      "Usage, product readiness, gated rollout status, and shopper signals should be easy to scan without becoming noisy.",
    publishedAt: "2026-05-22",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["merchant-growth", "fit-data"],
    imageSrc: "/images/landing/feature-ai-stylist.png",
    imageAlt: "AI commerce dashboard preview",
    readTimeMinutes: 6,
    content: [
      {
        type: "paragraph",
        body: "Merchant dashboards should be dense enough for real operations but calm enough to scan every day.",
      },
      {
        type: "heading",
        title: "1. Lead with current state",
        body: "Product readiness, usage balance, plan status, and shopper activity should be visible without digging through settings.",
      },
      {
        type: "heading",
        title: "2. Keep actions close to context",
        body: "When something needs setup, the dashboard should point directly to the relevant products, keys, or storefront controls.",
      },
    ],
  },
  {
    id: "fashion-ai-brand",
    title: "Keeping AI Commerce Experiences On-Brand",
    excerpt:
      "The strongest AI tools feel native to the store. Styling, language, timing, and visual hierarchy all matter.",
    publishedAt: "2026-05-15",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["fashion-tech", "shopify"],
    imageSrc: "/images/landing/ps/ps-hero-visual.png",
    imageAlt: "PrimeStyleAI visual commerce preview",
    readTimeMinutes: 5,
    content: [
      {
        type: "paragraph",
        body: "AI commerce tools work best when they feel native to the brand and product page.",
      },
      {
        type: "heading",
        title: "1. Match the storefront rhythm",
        body: "Typography, spacing, button language, and image treatment should support the store's existing buying path.",
      },
      {
        type: "heading",
        title: "2. Avoid generic AI framing",
        body: "The shopper does not need a technical explanation. They need a useful result that helps them decide.",
      },
    ],
  },
  {
    id: "launch-metrics",
    title: "Launch Metrics to Watch After Adding Smart Sizing",
    excerpt:
      "Track recommendation starts, completed flows, add-to-cart lift, product coverage, and where shoppers leave the experience.",
    publishedAt: "2026-05-09",
    authorName: "PrimeStyleAI Editorial",
    authorAvatarSrc: "/images/landing/logo-footer-6fe3f1.png",
    topicKeys: ["conversion", "merchant-growth"],
    imageSrc: "/images/landing/stats-section-reference.png",
    imageAlt: "Performance metrics interface",
    readTimeMinutes: 4,
    content: [
      {
        type: "paragraph",
        body: "Launch metrics should show whether shoppers are finding, using, and trusting the fit experience.",
      },
      {
        type: "heading",
        title: "1. Watch completion and acceptance",
        body: "Starts alone are not enough. Completion, accepted recommendations, and add-to-cart behavior tell a better story.",
      },
      {
        type: "heading",
        title: "2. Compare by product coverage",
        body: "A rollout should track which products are enabled and where the experience has the most impact.",
      },
    ],
  },
];

export const FEATURED_BLOG_POST = {
  id: "ai-size-recommendations-shopify",
  title: "AI Size Recommendations for Shopify Stores",
  eyebrow: "Featured blog",
  imageSrc: "/images/landing/ps/ps-hero-visual.png",
  imageAlt: "PrimeStyleAI sizing interface preview",
};

export const BLOG_EXPERIENCE: BlogExperienceItem[] = [
  { title: "Fit Intelligence", subtitle: "Sizing + VTO", period: "Now" },
  { title: "Shopify Rollouts", subtitle: "Theme + app flow", period: "2026" },
  { title: "Merchant Growth", subtitle: "Conversion systems", period: "2025" },
];

export const BLOG_TOOLS: BlogToolItem[] = [
  {
    title: "AI Sizing",
    description: "Photo-based guidance mapped to product measurements.",
    iconSrc: "/images/try-on-icon.svg",
  },
  {
    title: "Virtual Try-On",
    description: "Visual confidence directly on the product page.",
    iconSrc: "/images/ai-stylist-icon.svg",
  },
  {
    title: "Shopify App",
    description: "Merchant controls for storefront rollout and product access.",
    iconSrc: "/images/landing/ps/shopify-glyph.svg",
  },
];

export const BLOG_CREATING: BlogCreatingItem[] = [
  {
    title: "Fit Confidence Notes",
    description: "Short explainers for teams improving size selection and shopper trust.",
  },
  {
    title: "Storefront Patterns",
    description: "Practical product-page UI ideas for virtual try-on and sizing adoption.",
  },
  {
    title: "Merchant Operations",
    description: "Rollout, measurement, and product-readiness guidance for growing catalogs.",
  },
];
