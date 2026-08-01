import type { InfluencerLandingViewModel } from "../types";

export const INFLUENCER_LANDING_CONTENT: InfluencerLandingViewModel = {
  hero: {
    eyebrow: "For fashion creators",
    titleLead: "Make every look",
    titleAccent: "shoppable.",
    body: "Choose approved fashion products, add fit confidence, publish a tracked look, and earn when your audience completes an eligible purchase.",
    primaryCta: "Start earning",
    secondaryCta: "See the creator journey",
    annotation: "Your style. Your link. Your credit.",
    video: "/media/partner-landing/influencer-runway.mp4",
    poster: "/media/partner-landing/influencer-runway-poster.jpg",
  },
  features: [
    {
      number: "01",
      icon: "profile",
      title: "Activate your creator profile",
      description: "Verify the channels where you create and unlock the merchants and campaigns approved for your audience.",
      note: "One creator ID across every qualified referral.",
    },
    {
      number: "02",
      icon: "bag",
      title: "Choose approved products",
      description: "See the products, links, assets, commission conditions, and promotion rules you are cleared to use.",
      note: "Current offers, not mystery rates.",
    },
    {
      number: "03",
      icon: "sparkle",
      title: "Create with fit confidence",
      description: "Use validated size guidance and product-specific virtual try-on whenever the merchant has authorized it.",
      note: "Helpful estimates, clearly explained.",
    },
    {
      number: "04",
      icon: "link",
      title: "Publish a tracked look",
      description: "Your link preserves the creator, merchant, product, campaign, and applicable attribution window.",
      note: "Your influence stays attached to the journey.",
    },
  ],
  journey: [
    {
      number: "01",
      title: "Share the approved story",
      description: "Create in your own voice, add a clear material-connection disclosure, and use the product link assigned to you.",
    },
    {
      number: "02",
      title: "Help them choose",
      description: "The shopper sees permitted sizing and try-on help, then confirms the exact size and color they want.",
    },
    {
      number: "03",
      title: "Send them to the seller",
      description: "The tracked merchant product page and cart remain the source of truth for price, stock, checkout, and returns.",
    },
    {
      number: "04",
      title: "Get validated and paid",
      description: "Eligible sales move from pending to validated, paid, adjusted, or reversed before appearing on your statement.",
    },
  ],
  commissionLabels: ["Fixed rate", "Variable rate", "Conditional rate"],
  interest: {
    title: "Turn your next look into income.",
    body: "Tell us where you create. We will send the next creator-access details.",
  },
};
