export type HeroContent = {
  eyebrow: string;
  headline: string;
  headlineEm: string;
  subhead: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  marquee: string[];
};

export type ProblemContent = {
  eyebrow: string;
  headline: string;
  body: string;
  pullquote: string;
  pullquoteFooter: string;
};

export type FeatureTab = {
  id: string;
  label: string;
  title: string;
  body: string;
  image: string;
};

export type FeaturesContent = {
  eyebrow: string;
  title: string;
  tabs: FeatureTab[];
};

export type SdkStep = {
  num: string;
  tag: string;
  title: string;
  body: string;
  label: string;
  image: string;
  badges: string[];
};

export type SdkDemoContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  flow1: { tag: string; steps: SdkStep[] };
  flow2: { tag: string; aiTag: string; steps: SdkStep[] };
};

export type ScaleCard = {
  id: string;
  icon: "customize" | "devices" | "globe" | "garment";
  title: string;
  body: string;
  flags?: string[];
};

export type ScaleContent = {
  eyebrow: string;
  title: string;
  cards: ScaleCard[];
};

export type HowStep = {
  title: string;
  description: string;
  image: string;
};

export type HowContent = {
  eyebrow: string;
  title: string;
  steps: HowStep[];
};

export type Garment = {
  label: string;
  image: string;
};

export type GarmentsContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: Garment[];
};

export type IntegrationMethod = {
  id: "sdk" | "widget" | "api" | "shopify";
  label: string;
  title: string;
  body: string;
  docsHref: string;
  badge?: string;
  comingSoon?: boolean;
};

export type IntegrationContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  methods: IntegrationMethod[];
};

export type PricingTier = {
  id: "pilot" | "starter" | "growth" | "pro" | "scale";
  name: string;
  price: string;
  priceSuffix?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
  free?: boolean;
};

export type PayAsYouGoContent = {
  title: string;
  description: string;
  price: string;
  priceSuffix: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export type PricingContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  tiers: PricingTier[];
  payg: PayAsYouGoContent;
  enterpriseNote: { label: string; href: string };
};

export type CtaBannerContent = {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  footer: string;
};

export type AskAiContent = {
  eyebrow: string;
  title: string;
  body: string;
};
