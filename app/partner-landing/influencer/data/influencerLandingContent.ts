import type { InfluencerLandingViewModel } from "../types";

export const INFLUENCER_LANDING_CONTENT: InfluencerLandingViewModel = {
  hero: {
    eyebrow: "For fashion creators",
    titleLead: "Your\ninfluence",
    titleAccent: "should\npay.",
    body: "Connect with fashion merchants, add fit confidence, publish a tracked look, and earn when your audience completes an eligible purchase.",
    primaryCta: "Join waitlist",
    secondaryCta: "See the creator journey",
    annotation: "Your style. Your link. Your credit.",
    image: "/media/partner-landing/influencer-steps-static-v2.webp",
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
      title: "Connect with merchants",
      description: "Discover merchant campaigns, products, creative assets, commission conditions, and promotion rules in one place.",
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
      title: "Share the merchant story",
      description: "Create in your own voice, add a clear material-connection disclosure, and use the product link assigned to you.",
    },
    {
      number: "02",
      title: "We help them choose",
      description: "When shoppers open your link, we help them choose with virtual try-on and AI sizing before they pick their size and color.",
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
    title: "Join the creator waitlist.",
    body: "Tell us where you create and who you reach. We will keep your creator application separate and let you know when access opens.",
  },
};
