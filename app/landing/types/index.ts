export interface StatCard {
  number: string;
  label: string;
  description: string;
}

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
  bg: string;
}

export interface HowItWorksStep {
  number: string;
  icon: string;
  title: string;
  subtitle: string;
}

export interface ProblemItem {
  icon: string;
  text: string;
}

export interface SolutionItem {
  icon: string;
  text: string;
  highlight: string;
}

export interface PricingPack {
  name: string;
  subtitle: string;
  price: string;
  priceNote: string;
  tokens: number;
  tokenLabel: string;
  features: string[];
  highlightFeature?: string;
  badge?: string;
  discountBadge?: string;
  buttonLabel: string;
  featured?: boolean;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  quote: string;
  avatar: string;
  name: string;
  role: string;
}

export interface FooterLinkGroup {
  title: string;
  links: string[];
}
