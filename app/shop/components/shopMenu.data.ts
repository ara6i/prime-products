import { shopBrandProfiles } from "../brand/data/brandProfiles.data";

type MenuLink = { label: string; href: string };
type MenuSection = {
  id: string;
  label: string;
  groups: { label: string; links: MenuLink[] }[];
  features: (MenuLink & { image: string })[];
};

// Only addressable product, category, dashboard, and tool destinations belong here.
export const shopMenuSections: MenuSection[] = [
  {
    id: "shop",
    label: "Shop",
    groups: [
      { label: "Explore", links: [
        { label: "Shop landing", href: "/shop" },
        { label: "Product page · PDP", href: "/shop/product/denim-light-wide-leg" },
        { label: "AI Stylist", href: "/shop/ai-stylist" },
        { label: "Outfit canvas", href: "/shop/dressing-room" },
      ] },
      { label: "Categories", links: [
        { label: "Denim", href: "/shop/category/denim" },
      ] },
      { label: "Brands", links: shopBrandProfiles.map((brand) => ({
        label: brand.name, href: `/shop/brand/${brand.id}`,
      })) },
    ],
    features: [
      { label: "Denim edit", href: "/shop/category/denim", image: "/media/global-shop/denim-category-shoe-two-models-mobile.png" },
      { label: "The product", href: "/shop/product/denim-light-wide-leg", image: "/media/global-shop/denim-pdp/lumen-wide-leg-hero.png" },
      { label: "The canvas", href: "/shop/dressing-room", image: "/media/global-shop/dressing-room/outfit-grid-gingham-79de5e5c.webp" },
      { label: "AI styling", href: "/shop/ai-stylist", image: "/media/global-shop/product-lilac-lime-3d.webp" },
    ],
  },
  {
    id: "influencers",
    label: "Influencers",
    groups: [
      { label: "Explore", links: [
        { label: "Influencer landing", href: "/influencers" },
        { label: "Influencer dashboard", href: "/influencers/dashboard" },
        { label: "Creator storefront", href: "/influencers/maya-laurent" },
        { label: "Outfit Studio", href: "/influencers/dashboard/outfit-studio" },
      ] },
      { label: "Workspace", links: [
        { label: "Campaigns", href: "/influencers/dashboard#campaigns" },
        { label: "Products & links", href: "/influencers/dashboard#products" },
        { label: "Tracked links", href: "/influencers/dashboard#links" },
        { label: "Earnings", href: "/influencers/dashboard#earnings" },
        { label: "Transactions", href: "/influencers/dashboard#transactions" },
        { label: "Payouts", href: "/influencers/dashboard#payouts" },
      ] },
      { label: "Account", links: [
        { label: "Profile & compliance", href: "/influencers/dashboard#profile" },
        { label: "Support & claims", href: "/influencers/dashboard#support" },
      ] },
    ],
    features: [
      { label: "Meet the creators", href: "/influencers", image: "/media/partner-landing/creator-match-zoe.png" },
      { label: "Creator shop", href: "/influencers/maya-laurent", image: "/media/partner-landing/optimized/creator-match-maya.webp" },
      { label: "Create a look", href: "/influencers/dashboard/outfit-studio", image: "/media/global-shop/product-coral-black-3d.webp" },
      { label: "Your campaigns", href: "/influencers/dashboard#campaigns", image: "/media/partner-landing/creator-match-rae.png" },
    ],
  },
  {
    id: "merchants",
    label: "Merchants",
    groups: [
      { label: "Explore", links: [
        { label: "Merchant landing", href: "/merchants" },
        { label: "Merchant dashboard", href: "/merchants/dashboard" },
      ] },
      { label: "Workspace", links: [
        { label: "Products & PDPs", href: "/merchants/dashboard/products" },
        { label: "Integrations", href: "/merchants/dashboard/integrations" },
        { label: "Commerce & orders", href: "/merchants/dashboard/commerce" },
        { label: "Campaigns", href: "/merchants/dashboard/campaigns" },
        { label: "Billing & reports", href: "/merchants/dashboard/billing" },
        { label: "Account & governance", href: "/merchants/dashboard/account" },
      ] },
      { label: "PDP Studio", links: [
        { label: "PDP Studio home", href: "/pdp-studio" },
        { label: "Studio products", href: "/pdp-studio/products" },
        { label: "Designs", href: "/pdp-studio/designs" },
        { label: "Templates", href: "/pdp-studio/templates" },
        { label: "AI tools", href: "/pdp-studio/ai-tools" },
        { label: "Clothing photoshoot", href: "/pdp-studio/clothing-photoshoot" },
        { label: "Batch creation", href: "/pdp-studio/batch" },
        { label: "Brand kit", href: "/pdp-studio/brand-kit" },
        { label: "Studio preferences", href: "/pdp-studio/preferences" },
      ] },
    ],
    features: [
      { label: "The network", href: "/merchants", image: "/media/partner-landing/merchant-network/store-example/example-store-hero-model.webp" },
      { label: "Your products", href: "/merchants/dashboard/products", image: "/media/partner-landing/merchant-network/sdk-panelled-jacket.png" },
      { label: "PDP Studio", href: "/pdp-studio", image: "/media/partner-landing/merchant-network/merchant-features/pdp-tryon-model.webp" },
      { label: "AI fitting", href: "/merchants/dashboard/integrations", image: "/media/partner-landing/merchant-tryon-ai-sizing-mobile-static-4k.webp" },
    ],
  },
  {
    id: "suppliers",
    label: "Suppliers",
    groups: [
      { label: "Explore", links: [
        { label: "Supplier landing", href: "/suppliers" },
        { label: "Supplier dashboard", href: "/suppliers/dashboard" },
        { label: "Company page", href: "/suppliers/dashboard/company" },
        { label: "Product catalog", href: "/suppliers/dashboard/products" },
      ] },
      { label: "Network", links: [
        { label: "Merchant matches", href: "/suppliers/dashboard/merchant-matches" },
        { label: "Influencer matches", href: "/suppliers/dashboard/influencer-matches" },
        { label: "Merchant relationships", href: "/suppliers/dashboard/relationships" },
        { label: "Selling options", href: "/suppliers/dashboard/selling-options" },
        { label: "Influencer campaigns", href: "/suppliers/dashboard/campaigns" },
        { label: "Messages & RFQs", href: "/suppliers/dashboard/messages" },
      ] },
      { label: "Manage", links: [
        { label: "Orders", href: "/suppliers/dashboard/orders" },
        { label: "Payments & payouts", href: "/suppliers/dashboard/payments" },
        { label: "Performance", href: "/suppliers/dashboard/performance" },
        { label: "Policies", href: "/suppliers/dashboard/policies" },
        { label: "Team", href: "/suppliers/dashboard/team" },
      ] },
    ],
    features: [
      { label: "Supply the network", href: "/suppliers", image: "/media/partner-landing/supplier/supplier-merchant-hero.png" },
      { label: "Your collection", href: "/suppliers/dashboard/products", image: "/media/partner-landing/merchant-network/sdk-panelled-jacket.png" },
      { label: "Retail partners", href: "/suppliers/dashboard/merchant-matches", image: "/media/partner-landing/merchant-network/store-example/example-store-hero-model.webp" },
      { label: "Creator partners", href: "/suppliers/dashboard/influencer-matches", image: "/media/partner-landing/optimized/creator-match-maya.webp" },
    ],
  },
  {
    id: "pdp-studio",
    label: "PDP Studio",
    groups: [
      { label: "Workspace", links: [
        { label: "PDP Studio dashboard", href: "/pdp-studio" },
        { label: "Products", href: "/pdp-studio/products" },
        { label: "Designs", href: "/pdp-studio/designs" },
      ] },
      { label: "Create", links: [
        { label: "Templates", href: "/pdp-studio/templates" },
        { label: "AI tools", href: "/pdp-studio/ai-tools" },
        { label: "Clothing photoshoot", href: "/pdp-studio/clothing-photoshoot" },
        { label: "Batch creation", href: "/pdp-studio/batch" },
      ] },
      { label: "Account", links: [
        { label: "Brand kit", href: "/pdp-studio/brand-kit" },
        { label: "Preferences", href: "/pdp-studio/preferences" },
        { label: "Studio sign in", href: "/pdp-studio/login" },
      ] },
    ],
    features: [
      { label: "AI tools", href: "/pdp-studio/ai-tools", image: "/images/pdp-studio/ai-tools-v2/edit-with-ai.webp" },
      { label: "Photoshoot", href: "/pdp-studio/clothing-photoshoot", image: "/images/pdp-studio/ai-tools-v2/ai-fashion-models.webp" },
      { label: "Templates", href: "/pdp-studio/templates", image: "/images/pdp-studio/ai-tools-v2/product-staging.webp" },
      { label: "Batch edit", href: "/pdp-studio/batch", image: "/images/pdp-studio/ai-tools-v2/batch.webp" },
    ],
  },
  {
    id: "myaifitting",
    label: "MyAIFitting",
    groups: [
      { label: "Explore", links: [
        { label: "MyAIFitting landing", href: "/" },
        { label: "Features", href: "/#features" },
        { label: "Try-on demo", href: "/demo/products" },
        { label: "Integrations", href: "/#integrations" },
        { label: "Pricing", href: "/#pricing" },
      ] },
      { label: "Workspace", links: [
        { label: "MyAIFitting dashboard", href: "/customer/dashboard" },
        { label: "Products", href: "/customer/dashboard/products" },
        { label: "Analytics", href: "/customer/dashboard/analytics" },
        { label: "Plans & billing", href: "/customer/dashboard/plans" },
        { label: "Settings", href: "/customer/dashboard/settings" },
      ] },
      { label: "Resources", links: [
        { label: "SDK & API documentation", href: "/customer/dashboard/docs" },
        { label: "Blog", href: "/blog" },
        { label: "Help center", href: "/help-center" },
        { label: "Contact", href: "/#contact" },
      ] },
    ],
    features: [
      { label: "AI sizing", href: "/#features", image: "/images/landing/ps/ps-raw-01-sizing.jpg" },
      { label: "Virtual try-on", href: "/demo/products", image: "/images/landing/ps/ps-raw-06-tryon.jpg" },
      { label: "The SDK", href: "/customer/dashboard/docs", image: "/media/partner-landing/merchant-tryon-ai-sizing-mobile-static-4k.webp" },
      { label: "Your workspace", href: "/customer/dashboard", image: "/media/partner-landing/merchant-network/sdk-panelled-jacket.png" },
    ],
  },
];
