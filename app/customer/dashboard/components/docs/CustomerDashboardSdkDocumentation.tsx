import { CodeBlock, TabbedCodeBlock } from "../../docs/reference/components/CodeBlock";
import { ParamTable } from "../../docs/reference/components/ParamTable";
import { SectionHeading } from "../../docs/reference/components/SectionHeading";

const INSTALL_EXAMPLES = [
  {
    label: "npm",
    language: "bash",
    code: "npm install @primestyleai/tryon",
  },
  {
    label: "pnpm",
    language: "bash",
    code: "pnpm add @primestyleai/tryon",
  },
  {
    label: "yarn",
    language: "bash",
    code: "yarn add @primestyleai/tryon",
  },
];

const QUICK_START_REACT = `import { PrimeStyleTryon } from "@primestyleai/tryon/react";
import "@primestyleai/tryon/styles.css";

export function ProductTryOnButton({ product }) {
  return (
    <PrimeStyleTryon
      productImage={product.imageUrl}
      productTitle={product.title}
      productId={product.sku}
      buttonText="Try it on"
    />
  );
}`;

const CUSTOM_STYLES_EXAMPLE = `<PrimeStyleTryon
  productImage={product.imageUrl}
  productTitle={product.title}
  productId={product.sku}
  buttonStyles={{
    background: "#2154EF",
    color: "#fff",
    borderRadius: 999,
    hoverBackground: "#193EDC",
  }}
  modalStyles={{ accent: "#2154EF" }}
  classNames={{ launchButton: "font-semibold shadow-lg" }}
/>`;

const CALLBACKS_EXAMPLE = `<PrimeStyleTryon
  productImage={product.imageUrl}
  productTitle={product.title}
  productId={product.sku}
  onOpen={() => analytics.track("tryon_open")}
  onUpload={(file) => analytics.track("tryon_upload", { size: file.size })}
  onProcessing={(jobId) => analytics.track("tryon_processing", { jobId })}
  onComplete={({ jobId, imageUrl }) => {
    analytics.track("tryon_complete", { jobId });
    setTryOnImage(imageUrl);
  }}
  onError={({ message, code }) => {
    analytics.track("tryon_error", { message, code });
  }}
/>`;

const ADD_TO_CART_EXAMPLE = `import { PrimeStyleTryon } from "@primestyleai/tryon/react";

export function ProductTryOnButton({ product, addToCart }) {
  return (
    <PrimeStyleTryon
      productImage={product.imageUrl}
      productTitle={product.title}
      productId={product.sku}
      productUrl={product.url}
      sizeGuideData={product.sizeGuideData}
      addToBagLabel="Add recommended size to cart"
      onAddToBag={async ({
        productId,
        recommendedSize,
        selectedSizes,
        resultImageUrl,
      }) => {
        const selectedSize =
          selectedSizes?.find((item) => item.selectedSize)?.selectedSize ??
          recommendedSize;

        if (!selectedSize) {
          throw new Error("Select a size before adding to cart");
        }

        await addToCart({
          productId,
          size: selectedSize,
          metadata: {
            primeStyleResultImage: resultImageUrl,
          },
        });
      }}
    />
  );
}`;

const HEADLESS_EXAMPLE = `import { recommendForProduct, usePrimeStyleSize } from "@primestyleai/tryon";

const result = await recommendForProduct({
  profile,
  product: {
    id: product.sku,
    title: product.title,
    image: product.imageUrl,
    variants: product.variants,
  },
});

function SizeBadge({ profile, product }) {
  const { data, loading, error } = usePrimeStyleSize({ profile, product });

  if (loading) return <span>Checking fit...</span>;
  if (error || !data) return null;

  return <span>Recommended size: {data.recommendedSize}</span>;
}`;

const PROFILE_STORAGE_EXAMPLE = `import {
  getProfiles,
  getActiveProfile,
  setActiveProfileId,
  updateProfileMeasurements,
  addSizeToHistory,
  getCachedSize,
} from "@primestyleai/tryon";

const profiles = getProfiles();
const profile = getActiveProfile();

setActiveProfileId("profile-2");

updateProfileMeasurements(profile.id, {
  chest: 104,
  waist: 88,
}, "cm");

addSizeToHistory(profile.id, {
  productId: product.sku,
  size: "M",
  createdAt: new Date().toISOString(),
});

const cachedSize = getCachedSize(profile, product.sku);`;

const IMAGE_HELPERS_EXAMPLE = `import { compressImage, isValidImageFile } from "@primestyleai/tryon";

if (!isValidImageFile(file)) {
  throw new Error("Invalid image");
}

const compressed = await compressImage(file, {
  maxDimension: 1600,
  quality: 0.9,
});`;

const I18N_EXAMPLE = `import { registerLocale } from "@primestyleai/tryon";

registerLocale("fr", {
  tryOnButton: "Essayer",
  uploadPhoto: "Importer une photo",
  processing: "Generation en cours...",
});

<PrimeStyleTryon
  productImage={product.imageUrl}
  locale="fr"
/>`;

export function CustomerDashboardSdkDocumentation() {
  return (
    <>
      <section id="introduction">
        <SectionHeading id="introduction">Introduction</SectionHeading>

        <p className="mb-6 text-lg leading-relaxed text-gray-700">
          The PrimeStyleAI SDK adds virtual try-on and size guidance to a product page
          with a drop-in React component. It handles the launch button, shopper photo
          flow, size recommendation, generated result view, add-to-cart handoff,
          callbacks, styling, and local profile helpers.
        </p>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6">
            <h3 className="mb-2 font-semibold text-gray-900">Drop-in component</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              Render <code className="font-mono text-xs">{`<PrimeStyleTryon />`}</code>
              beside your product actions.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6">
            <h3 className="mb-2 font-semibold text-gray-900">Headless sizing</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              Use the sizing hook and helper functions when you want your own UI.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6">
            <h3 className="mb-2 font-semibold text-gray-900">Local profiles</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              Store shopper measurements and cached size recommendations in the browser.
            </p>
          </div>
        </div>
      </section>

      <section id="quick-start">
        <SectionHeading id="quick-start">Quick Start</SectionHeading>

        <div className="space-y-8">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">1. Install the SDK</h3>
            <TabbedCodeBlock examples={INSTALL_EXAMPLES} />
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">2. Create production access</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              Open Settings, create a production key, and connect your storefront to
              PrimeStyleAI through your server-side integration. Do not expose raw
              secrets in browser code.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">3. Render the component</h3>
            <p className="mb-3 text-sm leading-relaxed text-gray-600">
              Pass a product image. Add title and product id for better caching,
              analytics, and recommendations.
            </p>
            <CodeBlock code={QUICK_START_REACT} language="typescript" filename="ProductTryOnButton.tsx" />
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">4. Shopper flow</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
              <li>The launch button opens the PrimeStyleAI modal.</li>
              <li>The shopper uploads a photo or reuses a saved local profile.</li>
              <li>The SDK calculates fit and prepares the try-on result.</li>
              <li>The modal shows the generated image and recommended size.</li>
              <li>Your add-to-cart handler can add the selected or recommended size to the cart.</li>
            </ol>
          </div>
        </div>
      </section>

      <section id="sdk">
        <SectionHeading id="sdk">React SDK</SectionHeading>

        <p className="mb-10 text-lg leading-relaxed text-gray-700">
          Use the React component for the full modal experience, or use the headless
          helpers when you want to build your own interface.
        </p>

        <div id="sdk-installation" className="scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="sdk-installation" level={3}>Installation</SectionHeading>
          <TabbedCodeBlock examples={INSTALL_EXAMPLES} />
        </div>

        <div id="sdk-component" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="sdk-component" level={3}>{`<PrimeStyleTryon />`}</SectionHeading>
          <ParamTable
            title="Core props"
            params={[
              { name: "productImage", type: "string", required: true, description: "Public product image URL." },
              { name: "productTitle", type: "string", required: false, description: "Product title shown in the modal and used for fit context." },
              { name: "productId", type: "string", required: false, description: "Stable SKU or product id used for caching per profile." },
              { name: "buttonText", type: "string", required: false, description: "Launch button label." },
              { name: "showPoweredBy", type: "boolean", required: false, description: "Show or hide the powered-by badge." },
              { name: "showIcon", type: "boolean", required: false, description: "Show or hide the default button icon." },
              { name: "locale", type: "string", required: false, description: "Locale code for SDK text." },
              { name: "sizeGuideData", type: "unknown", required: false, description: "Structured size guide data passed directly to the recommender." },
              { name: "onAddToBag", type: "(payload) => void | Promise<void>", required: false, description: "Called when the shopper clicks the SDK result-screen add-to-cart button." },
              { name: "addToBagLabel", type: "string", required: false, description: "Custom label for the result-screen add-to-cart button." },
              { name: "continueShoppingLabel", type: "string", required: false, description: "Custom label for the continue-shopping action." },
            ]}
          />
        </div>

        <div id="sdk-customization" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="sdk-customization" level={3}>Customization</SectionHeading>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            Use typed style props for common visual changes and class names for deeper
            slot-level styling.
          </p>
          <CodeBlock code={CUSTOM_STYLES_EXAMPLE} language="typescript" filename="Custom styling" />
        </div>

        <div id="sdk-callbacks" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="sdk-callbacks" level={3}>Callbacks</SectionHeading>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            Use callbacks to track opens, uploads, processing, completion, errors, and
            modal close behavior.
          </p>
          <CodeBlock code={CALLBACKS_EXAMPLE} language="typescript" filename="Callbacks" />
        </div>

        <div id="sdk-add-to-cart" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="sdk-add-to-cart" level={3}>Add to Cart</SectionHeading>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            Pass <code className="font-mono text-xs">onAddToBag</code> to show an add-to-cart CTA
            on the SDK result screen. The callback receives the product id, recommended size,
            shopper-selected size data, result image URL, and sizing result. Use it to call your
            own cart function and return a promise so the SDK can show loading and error states.
          </p>
          <CodeBlock code={ADD_TO_CART_EXAMPLE} language="typescript" filename="Add to cart" />
        </div>

        <div id="sdk-headless" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="sdk-headless" level={3}>Headless Sizing</SectionHeading>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            Build your own size UI with the same recommendation logic used by the modal.
          </p>
          <CodeBlock code={HEADLESS_EXAMPLE} language="typescript" filename="Headless sizing" />
        </div>

        <div id="sdk-profiles" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="sdk-profiles" level={3}>Profile Storage</SectionHeading>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            Profile helpers read and write browser localStorage. They are client-side
            only and useful for saved measurements, active profiles, and cached sizes.
          </p>
          <CodeBlock code={PROFILE_STORAGE_EXAMPLE} language="typescript" filename="Profile helpers" />
        </div>

        <div id="sdk-i18n" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="sdk-i18n" level={3}>Internationalization</SectionHeading>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            Pass a locale or register your own labels for SDK text.
          </p>
          <CodeBlock code={I18N_EXAMPLE} language="typescript" filename="i18n" />
        </div>
      </section>

      <section id="guides">
        <SectionHeading id="guides">SDK Guides</SectionHeading>

        <div id="guide-own-size-guide" className="scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="guide-own-size-guide" level={3}>Using Your Own Size Guide</SectionHeading>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            If you already have structured size data, pass it directly through
            <code className="font-mono text-xs"> sizeGuideData</code>.
          </p>
          <CodeBlock code={QUICK_START_REACT} language="typescript" filename="With product data" />
        </div>

        <div id="guide-events" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="guide-events" level={3}>SDK Events</SectionHeading>
          <CodeBlock code={CALLBACKS_EXAMPLE} language="typescript" filename="Event tracking" />
        </div>

        <div id="guide-images" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="guide-images" level={3}>Image Best Practices</SectionHeading>
          <ul className="mb-4 space-y-2 text-sm text-gray-700">
            <li>Use clean, front-facing product photos.</li>
            <li>Ask shoppers for one-person photos with the torso visible.</li>
            <li>Compress large uploads before passing them into the SDK.</li>
          </ul>
          <CodeBlock code={IMAGE_HELPERS_EXAMPLE} language="typescript" filename="Image helpers" />
        </div>

        <div id="guide-loading" className="mt-10 scroll-mt-14 lg:scroll-mt-24">
          <SectionHeading id="guide-loading" level={3}>Loading States</SectionHeading>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Show immediate feedback when the modal opens.</li>
            <li>Use <code className="font-mono text-xs">onProcessing</code> for the in-progress state.</li>
            <li>Use <code className="font-mono text-xs">onComplete</code> to replace the loader with the result image.</li>
            <li>Use <code className="font-mono text-xs">onError</code> for retry messaging.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
