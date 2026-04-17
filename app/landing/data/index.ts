import type {
  StatCard,
  FeatureCard,
  HowItWorksStep,
  ProblemItem,
  SolutionItem,
  PricingPack,
  FAQItem,
  Testimonial,
  FooterLinkGroup,
} from "@/app/landing/types";

export const NAV_LINKS = ["Pricing", "Terms", "Policy"] as const;

export const STATS: StatCard[] = [
  {
    number: "+2.5K",
    label: "Users",
    description: "Using Outfit Builder to style smarter",
  },
  {
    number: "+60K",
    label: "Outfits created",
    description: "Generated for real people and real occasions",
  },
  {
    number: "+5K",
    label: "Fashion items",
    description: "Tops, bottoms, shoes & accessories",
  },
];

export const FEATURES: FeatureCard[] = [
  {
    icon: "checkroom",
    title: "Freedom without limitations",
    description:
      "Mix items across brands and styles — no locked looks, no forced paths.",
    bg: "bg-brand-blue-pale",
  },
  {
    icon: "apparel",
    title: "Confidence over guesswork",
    description:
      "See results before buying, so you return less and choose better.",
    bg: "bg-landing-blue-section-bg",
  },
  {
    icon: "shopping_bag",
    title: "Real products, not placeholders",
    description: "Every outfit is built from real, trusted fashion brands.",
    bg: "bg-catalog-bg",
  },
  {
    icon: "generate",
    title: "Try-on that feels realistic",
    description:
      "AI-powered visuals that help you understand fit and style on you.",
    bg: "bg-weather-pill-bg",
  },
];

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    number: "01",
    icon: "generate",
    title: "Tell us about your body and style",
    subtitle: "Quick setup, takes less than a minute",
  },
  {
    number: "02",
    icon: "apparel",
    title: "Build and explore outfits",
    subtitle: "Try different combinations effortlessly",
  },
  {
    number: "03",
    icon: "checkroom",
    title: "Style with confidence",
    subtitle: "Use tokens to generate outfits anytime",
  },
];

export const PROBLEMS: ProblemItem[] = [
  { icon: "layers", text: "Too many clothes, nothing to wear" },
  { icon: "ruler", text: "Unsure what actually suits your body" },
  { icon: "clock-alert", text: "Wasting time trying combinations that don't work" },
  { icon: "shirt", text: "Buying items that never get worn" },
];

export const SOLUTIONS: SolutionItem[] = [
  {
    icon: "message-circle-question",
    text: "Personalized outfit suggestions",
    highlight: "No more guessing",
  },
  {
    icon: "swatch-book",
    text: "Style based on your body & taste",
    highlight: "Outfits that feel right",
  },
  {
    icon: "puzzle",
    text: "Try combinations before wearing",
    highlight: "Save time & effort",
  },
  {
    icon: "sparkles",
    text: "Suggestions for every occasion",
    highlight: "Always dressed right",
  },
];

export const PRICING_PACKS: PricingPack[] = [
  {
    name: "Starter Pack",
    subtitle: "Perfect for trying premium features",
    price: "4.99",
    priceNote: "One-time purchase",
    tokens: 100,
    tokenLabel: "100 Tokens",
    features: ["Tokens never expire", "Use anytime"],
    badge: "Free once signed up",
    buttonLabel: "Try it Free",
  },
  {
    name: "Popular Pack",
    subtitle: "Most Popular choice for regular users",
    price: "14.99",
    priceNote: "One-time purchase",
    tokens: 330,
    tokenLabel: "330 Tokens",
    features: [
      "300 base + 30 bonus tokens",
      "Tokens never expire",
      "Use anytime",
    ],
    highlightFeature: "Save 10% vs standard",
    discountBadge: "10%",
    buttonLabel: "Buy Now",
    featured: true,
  },
  {
    name: "Value Pack",
    subtitle: "Best value for money",
    price: "34.99",
    priceNote: "One-time purchase",
    tokens: 800,
    tokenLabel: "800 Tokens",
    features: [
      "700 base + 100 bonus tokens",
      "Tokens never expire",
      "Use anytime",
    ],
    highlightFeature: "Save 14% vs standard",
    discountBadge: "14%",
    buttonLabel: "Buy Now",
    featured: true,
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is PrimeStyleAI?",
    answer:
      "PrimeStyleAI is a digital fashion decision-support platform designed to help you visualize outfits and make confident purchase decisions. We do not sell clothing directly — all purchases are made on the retailer's website.",
  },
  {
    question: "Do I need an account?",
    answer:
      "Yes, a free account is required to save your preferences, body profile, and generated outfits. Sign up takes less than a minute.",
  },
  {
    question: "Can I buy clothes from PrimeStyleAI?",
    answer:
      "We don't sell clothing directly. Instead, we link you to trusted retailers where you can purchase the items featured in your outfits.",
  },
  {
    question: "How is my data protected?",
    answer:
      "We use industry-standard encryption and never share your personal data with third parties. Your photos and body measurements are stored securely and can be deleted at any time.",
  },
  {
    question: "Do you sell personal information?",
    answer:
      "No. We never sell, rent, or share your personal information with third parties for marketing purposes.",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "PrimeStyleAI has completely transformed how I approach styling. The AI recommendations are incredibly accurate and have introduced me to combinations I never would have thought of.",
    avatar: "/images/landing/avatar-sarah.png",
    name: "Sarah Chen",
    role: "Fashion Blogger",
  },
  {
    quote:
      "The color coordination suggestions are spot-on. I used to struggle with matching colors, but now I feel confident in my outfit choices every day.",
    avatar: "/images/landing/avatar-david.png",
    name: "David Kim",
    role: "Entrepreneur",
  },
  {
    quote:
      "As someone with limited time for shopping, this app is a game-changer. The outfit suggestions are professional and stylish, perfect for my corporate lifestyle.",
    avatar: "/images/landing/avatar-marcus.png",
    name: "Marcus Johnson",
    role: "Business Executive",
  },
  {
    quote:
      "The virtual try-on feature is amazing! It's so convenient to visualize outfits before purchasing. I've saved so much money avoiding pieces that wouldn't work for me.",
    avatar: "/images/landing/avatar-elena.png",
    name: "Elena Rodriguez",
    role: "Creative Director",
  },
];

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Product",
    links: [
      "Outfit Builder",
      "Virtual Try-On",
      "Style Quiz",
      "Pricing",
      "Premium Features",
      "Mobile App",
    ],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Press Kit", "Blog", "Contact"],
  },
  {
    title: "Support",
    links: ["Help Center", "Size Guide", "Returns", "Shipping info", "FAQ"],
  },
  {
    title: "Legal",
    links: [
      "Privacy Policy",
      "Terms of Service",
      "Cookie Policy",
      "GDPR Compliance",
    ],
  },
];

export const BRAND_LOGOS = [
  { src: "/images/landing/brand-lole.svg", alt: "Lole", width: 66, height: 24 },
  { src: "/images/landing/brand-bloomingdales.svg", alt: "Bloomingdale's", width: 160, height: 25 },
  { src: "/images/landing/brand-davids-bridal.svg", alt: "David's Bridal", width: 52, height: 24 },
  { src: "/images/landing/brand-logo2.svg", alt: "Brand", width: 48, height: 24 },
  { src: "/images/landing/brand-huk.svg", alt: "HUK", width: 87, height: 24 },
  { src: "/images/landing/brand-fdm.svg", alt: "Fleur Du Mal", width: 200, height: 18 },
  { src: "/images/landing/brand-patbo.svg", alt: "PatBo", width: 120, height: 48 },
  { src: "/images/landing/brand-greg-norman.svg", alt: "Greg Norman", width: 102, height: 60 },
  { src: "/images/landing/brand-shopsimon.svg", alt: "ShopSimon", width: 240, height: 17 },
  { src: "/images/landing/brand-mens-wearhouse.svg", alt: "Men's Wearhouse", width: 300, height: 17 },
];

export const MEDIA_LOGOS = [
  { src: "/images/landing/logo-cbs.png", alt: "CBS" },
  { src: "/images/landing/logo-nbc.png", alt: "NBC" },
  { src: "/images/landing/logo-fox.svg", alt: "FOX" },
  { src: "/images/landing/logo-abc.png", alt: "ABC" },
];
