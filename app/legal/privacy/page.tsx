export const metadata = {
  title: "Privacy Policy | PrimeStyleAI",
  description:
    "Privacy policy for PrimeStyleAI, including the Shopify virtual try-on app.",
};

const sections = [
  {
    title: "Information We Process",
    body: [
      "Shopify merchant data: shop domain, shop name, store email, currency, timezone, products, product titles, product images, theme configuration, size charts, app settings, subscription status, and recent order/refund events needed for analytics.",
      "Buyer storefront data: anonymous session ID, product viewed, size recommendation events, cart-add events, device/browser hints, country derived from request metadata, body measurements entered by the buyer, and photos uploaded for virtual try-on.",
      "We do not intentionally collect buyer names, emails, addresses, or payment details for the virtual try-on flow. Order analytics are minimized to order ID, totals, currency, line items, product/variant IDs, quantities, selected size, recommended size, paid status, and refund totals.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use merchant data to install and operate the Shopify app, configure the theme app extension, process billing status, and show analytics inside the embedded Shopify admin.",
      "We use buyer measurements and uploaded photos to generate size recommendations and virtual try-on previews. Photos are processed transiently for the requested result.",
      "We use anonymous storefront analytics to help merchants understand try-on usage, size recommendation acceptance, revenue attribution, and return impact.",
    ],
  },
  {
    title: "Retention",
    body: [
      "Uploaded buyer photo bytes are processed transiently and are not intended to be persisted by PrimeStyleAI after the request completes.",
      "Anonymous sizing profiles and storefront session data may be retained for up to 12 months unless deleted earlier.",
      "Merchant analytics events and order attribution records may be retained for up to 24 months unless deletion is requested or required by Shopify compliance webhooks.",
    ],
  },
  {
    title: "Subprocessors",
    body: [
      "PrimeStyleAI may use infrastructure and AI providers such as MongoDB Atlas, Cloudinary, Google Cloud/Gemini, and hosting/CDN providers to operate the service.",
      "Subprocessors are used only to provide the app functionality, security, storage, image processing, analytics, and support.",
    ],
  },
  {
    title: "Shopify Compliance Webhooks",
    body: [
      "PrimeStyleAI responds to Shopify's mandatory customers/data_request, customers/redact, and shop/redact webhooks.",
      "When Shopify sends shop/redact after uninstall, PrimeStyleAI deletes the merchant shop record, app configuration, size charts, store profile, try-on events, and order attribution records associated with that shop.",
    ],
  },
  {
    title: "Choices And Contact",
    body: [
      "Merchants can uninstall the Shopify app from Shopify admin. Storefront buyers can choose not to upload a photo and can use merchant-provided sizing information instead.",
      "For privacy requests, contact support@primestyleai.com.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F7F4ED] px-6 py-16 text-[#151515]">
      <article className="mx-auto max-w-4xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2154EF]">
          PrimeStyleAI
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-black/60">Last updated: May 14, 2026</p>
        <p className="mt-8 text-lg leading-8 text-black/75">
          This Privacy Policy explains how PrimeStyleAI processes information for
          its website, APIs, SDKs, and Shopify virtual try-on app.
        </p>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                {section.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {section.body.map((item) => (
                  <li key={item} className="leading-7 text-black/72">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
