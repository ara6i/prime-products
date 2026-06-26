import { SectionHeading } from "../components/SectionHeading";
import { CodeBlock, TabbedCodeBlock } from "../components/CodeBlock";
import { EndpointBlock } from "../components/EndpointBlock";
import { ParamTable } from "../components/ParamTable";
import type { CodeExample } from "../types";
import Link from "next/link";
import {
  ArrowRight,
  Terminal,
  Palette,
  Mail,
  MapPin,
  Package,
  Code2,
  Globe,
  HardDrive,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// Section: Introduction
// ═══════════════════════════════════════════════════════════

export function IntroductionSection() {
  return (
    <section id="introduction">
      <SectionHeading id="introduction">Introduction</SectionHeading>

      <p className="text-gray-700 text-lg leading-relaxed mb-6">
        PrimeStyle gives shoppers photorealistic virtual try-on and AI-powered size
        recommendations on any product page. Try-on results are generated in 15-20 seconds
        from a single customer photo plus a garment image. Sizing uses a small user profile
        (height, weight, and a few body-shape answers) to recommend a size for your product.
      </p>

      <p className="text-gray-700 text-lg leading-relaxed mb-8">
        There are three ways to integrate, in order of how much work you want to do:
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Palette className="size-5 text-purple-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Drop-in React component</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            <code className="font-mono text-xs">{`<PrimeStyleTryon />`}</code> renders
            a launch button and a modal that handles photo upload, sizing, and try-on
            end-to-end. Fastest path to ship.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#2154EF]/10">
              <Code2 className="size-5 text-[#2154EF]" />
            </div>
            <h3 className="font-semibold text-gray-900">Headless sizing hook</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            <code className="font-mono text-xs">usePrimeStyleSize()</code> and
            <code className="font-mono text-xs"> recommendForProduct()</code> return
            a recommended size for your own UI. No modal.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Terminal className="size-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Raw HTTP API</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Call <code className="font-mono text-xs">POST /api/v1/tryon</code> and
            <code className="font-mono text-xs"> /api/v1/sizing/*</code> from any server
            or client. Full control over UI and flow.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#2154EF]/20 bg-[#2154EF]/5 p-5 mb-8">
        <p className="text-sm text-gray-800 leading-relaxed">
          <strong className="font-semibold">Profiles can be stored locally and synced
          through PrimeStyleAI profile services.</strong> Signed-in shoppers can reuse
          their profile photo and measurements across supported storefronts for sizing
          recommendations and virtual try-on.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-[#FFFFFF] p-6">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          End-to-end flow
        </h4>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-gray-200">
            <span className="text-[#2154EF] font-mono font-bold">1</span>
            <span className="text-gray-700">User fills out a short profile or uploads a body photo</span>
          </div>
          <ArrowRight className="size-4 text-gray-500 hidden sm:block" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-gray-200">
            <span className="text-[#2154EF] font-mono font-bold">2</span>
            <span className="text-gray-700">SDK picks a size and (optionally) generates a try-on image</span>
          </div>
          <ArrowRight className="size-4 text-gray-500 hidden sm:block" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-gray-200">
            <span className="text-[#2154EF] font-mono font-bold">3</span>
            <span className="text-gray-700">Result is cached in localStorage for that profile + product</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: Quick Start
// ═══════════════════════════════════════════════════════════

const QUICK_START_INSTALL: CodeExample[] = [
  {
    language: "bash",
    label: "npm",
    code: `npm install @primestyleai/tryon`,
  },
  {
    language: "bash",
    label: "yarn",
    code: `yarn add @primestyleai/tryon`,
  },
  {
    language: "bash",
    label: "pnpm",
    code: `pnpm add @primestyleai/tryon`,
  },
];

const QUICK_START_REACT = `import { PrimeStyleTryon } from "@primestyleai/tryon/react";

export default function ProductPage() {
  return (
    <PrimeStyleTryon
      productImage="https://cdn.example.com/products/shirt-front.jpg"
      productTitle="Linen Oxford Shirt"
      productId="sku-12345"
      apiUrl="https://api.primestyleai.com"
      onComplete={(result) => {
        console.log("Try-on ready:", result.imageUrl);
      }}
      onError={(err) => {
        console.error("Try-on failed:", err.message);
      }}
    />
  );
}`;

export function QuickStartSection() {
  return (
    <section id="quick-start">
      <SectionHeading id="quick-start">Quick Start</SectionHeading>

      <p className="text-gray-700 text-lg leading-relaxed mb-8">
        Get a working virtual try-on button on your product page in under five minutes.
      </p>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Install the SDK</h3>
          <p className="text-sm text-gray-600 mb-3">
            The package ships both the React component and the plain-JS web component.
          </p>
          <TabbedCodeBlock examples={QUICK_START_INSTALL} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Get an API key</h3>
          <p className="text-sm text-gray-600">
            Create a key in the{" "}
            <Link
              href="/customer/dashboard/docs#auth-api-keys"
              className="text-[#2154EF] hover:underline font-medium"
            >
              customer dashboard
            </Link>
            . Every authenticated request needs{" "}
            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              Authorization: Bearer &lt;apiKey&gt;
            </code>
            . The React component reads the key from the API URL it calls; keep the
            raw key out of your client bundle and proxy through your own server when
            possible.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            3. Drop the component on a product page
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Pass at minimum a <code className="font-mono text-xs">productImage</code>.
            Everything else is optional.
          </p>
          <CodeBlock code={QUICK_START_REACT} language="typescript" filename="ProductPage.tsx" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. What the user sees</h3>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>A &quot;Try it on&quot; button renders next to your product.</li>
            <li>Clicking opens a modal that walks the user through profile setup or photo upload.</li>
            <li>The SDK requests a size recommendation and a try-on image from the API.</li>
            <li>Within ~20 seconds the modal shows the try-on photo and recommended size.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: Authentication
// ═══════════════════════════════════════════════════════════

const AUTH_CURL = `curl -X POST https://api.primestyleai.com/api/v1/tryon \\
  -H "Authorization: Bearer ps_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "modelImage": "https://example.com/user.jpg",
    "garmentImage": "https://example.com/shirt.jpg"
  }'`;

const AUTH_SSE = `const es = new EventSource(
  "https://api.primestyleai.com/api/v1/tryon/stream?key=ps_live_your_key_here"
);
es.addEventListener("completed", (e) => {
  const payload = JSON.parse(e.data);
  console.log("image ready:", payload.imageUrl);
});`;

export function AuthenticationSection() {
  return (
    <section id="authentication">
      <SectionHeading id="authentication">Authentication</SectionHeading>

      <p className="text-gray-700 text-lg leading-relaxed mb-10">
        Every authenticated endpoint requires a PrimeStyle API key. Keys are issued and
        revoked from the developer dashboard; they carry your try-on token balance and
        your rate limit.
      </p>

      <div id="auth-api-keys" className="scroll-mt-14 lg:scroll-mt-24">
        <SectionHeading id="auth-api-keys" level={3}>
          API Keys
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          Create a key from your{" "}
          <Link
            href="/customer/dashboard/docs#auth-api-keys"
            className="text-[#2154EF] hover:underline font-medium"
          >
            dashboard
          </Link>
          . Treat keys like any other secret &mdash; do not commit them and rotate them
          periodically.
        </p>

        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mt-8 mb-3">
          Passing the key
        </h4>

        <ul className="space-y-2 text-sm text-gray-700 mb-4">
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              <strong className="text-gray-900">HTTP API:</strong> send the header{" "}
              <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                Authorization: Bearer &lt;apiKey&gt;
              </code>
              {" "}on every request.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              <strong className="text-gray-900">SSE stream:</strong> you may pass the
              key either in the <code className="font-mono text-xs">Authorization</code>{" "}
              header or as <code className="font-mono text-xs">?key=</code> on the URL
              (EventSource does not support custom headers in the browser).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              <strong className="text-gray-900">SDK:</strong> the React component calls
              an <code className="font-mono text-xs">apiUrl</code> you control. If you
              do not pass one, the SDK reads{" "}
              <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                NEXT_PUBLIC_PRIMESTYLE_API_URL
              </code>
              {" "}at build time. Proxy the real key through your backend so it never
              ships to the browser.
            </span>
          </li>
        </ul>

        <CodeBlock code={AUTH_CURL} language="bash" filename="Authenticated request" />
        <CodeBlock code={AUTH_SSE} language="javascript" filename="Authenticated SSE" />
      </div>

      <div id="auth-balance" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="auth-balance" level={3}>
          Try-On Balance &amp; Rate Limits
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          Each successful try-on deducts one token from your account. Sizing endpoints
          are currently free and metered only by rate limits. Every{" "}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
            POST /api/v1/tryon
          </code>
          {" "}response includes <code className="font-mono text-xs">tryOnsUsed</code>{" "}
          and <code className="font-mono text-xs">newBalance</code> so your dashboard can
          show the running total.
        </p>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            402 Insufficient tokens
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            If your balance is 0 we return HTTP <code className="font-mono text-xs">402</code>{" "}
            with a body of{" "}
            <code className="font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded">
              {`{ error, currentBalance, required }`}
            </code>
            . Top up from the billing page or fall back to showing the size recommendation
            without the visual try-on.
          </p>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 mt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            401 Unauthorized
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            Returned when the key is missing, malformed, expired, or revoked. Rotate and
            try again.
          </p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: API Reference
// ═══════════════════════════════════════════════════════════

// ── POST /api/v1/tryon ──

const TRYON_CREATE_CURL = `curl -X POST https://api.primestyleai.com/api/v1/tryon \\
  -H "Authorization: Bearer $PRIMESTYLE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "modelImage": "https://cdn.example.com/user.jpg",
    "garmentImage": "https://cdn.example.com/shirt.jpg",
    "fitInfo": [
      { "area": "Chest", "fit": "a-bit-tight", "userValue": 102, "garmentRange": "96-100" }
    ]
  }'`;

const TRYON_CREATE_NODE = `import fetch from "node-fetch";

const res = await fetch("https://api.primestyleai.com/api/v1/tryon", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.PRIMESTYLE_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    modelImage: "https://cdn.example.com/user.jpg",
    garmentImage: "https://cdn.example.com/shirt.jpg",
  }),
});

const { galleryId, status, newBalance } = await res.json();
console.log(galleryId, status, newBalance);`;

const TRYON_CREATE_PYTHON = `import os, requests

res = requests.post(
    "https://api.primestyleai.com/api/v1/tryon",
    headers={"Authorization": f"Bearer {os.environ['PRIMESTYLE_API_KEY']}"},
    json={
        "modelImage": "https://cdn.example.com/user.jpg",
        "garmentImage": "https://cdn.example.com/shirt.jpg",
    },
)
data = res.json()
print(data["galleryId"], data["status"], data["newBalance"])`;

const TRYON_CREATE_RESPONSE = `{
  "galleryId": "65c8d1a4e2b4f5d3c8a91234",
  "status": "processing",
  "message": "VTO job started. Poll /api/v1/tryon/status/:galleryId to check progress",
  "tokensDeducted": 1,
  "newBalance": 958
}`;

// ── GET /api/v1/tryon/status/:galleryId ──

const TRYON_STATUS_CURL = `curl https://api.primestyleai.com/api/v1/tryon/status/65c8d1a4e2b4f5d3c8a91234 \\
  -H "Authorization: Bearer $PRIMESTYLE_API_KEY"`;

const TRYON_STATUS_NODE = `const jobRes = await fetch(
  \`https://api.primestyleai.com/api/v1/tryon/status/\${galleryId}\`,
  { headers: { Authorization: \`Bearer \${apiKey}\` } }
);
const job = await jobRes.json();
if (job.status === "completed") {
  showImage(job.imageUrl);
}`;

const TRYON_STATUS_PYTHON = `res = requests.get(
    f"https://api.primestyleai.com/api/v1/tryon/status/{gallery_id}",
    headers={"Authorization": f"Bearer {api_key}"},
)
job = res.json()
if job["status"] == "completed":
    show_image(job["imageUrl"])`;

const TRYON_STATUS_RESPONSE = `{
  "galleryId": "65c8d1a4e2b4f5d3c8a91234",
  "status": "completed",
  "imageUrl": "https://res.cloudinary.com/.../result.jpg",
  "message": "Try-on ready"
}`;

// ── GET /api/v1/tryon/stream ──

const TRYON_STREAM_CURL = `curl -N "https://api.primestyleai.com/api/v1/tryon/stream?key=$PRIMESTYLE_API_KEY"`;

const TRYON_STREAM_JS = `const es = new EventSource(
  \`https://api.primestyleai.com/api/v1/tryon/stream?key=\${apiKey}\`
);

es.addEventListener("completed", (e) => {
  const { galleryId, imageUrl } = JSON.parse(e.data);
  console.log("done", galleryId, imageUrl);
  es.close();
});

es.addEventListener("failed", (e) => {
  const { galleryId, error } = JSON.parse(e.data);
  console.error("failed", galleryId, error);
  es.close();
});`;

// ── POST /api/v1/sizing/recommend ──

const SIZING_RECOMMEND_CURL = `curl -X POST https://api.primestyleai.com/api/v1/sizing/recommend \\
  -H "Authorization: Bearer $PRIMESTYLE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "method": "exact",
    "sizingUnit": "cm",
    "product": {
      "title": "Linen Oxford Shirt",
      "description": "Regular fit, 100% linen."
    },
    "measurements": {
      "chest": 102,
      "waist": 86,
      "height": 180,
      "weight": 78
    }
  }'`;

const SIZING_RECOMMEND_NODE = `const res = await fetch(
  "https://api.primestyleai.com/api/v1/sizing/recommend",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: "exact",
      sizingUnit: "cm",
      product: { title, description },
      measurements: { chest: 102, waist: 86, height: 180, weight: 78 },
    }),
  }
);
const rec = await res.json();
console.log(rec.recommendedSize, rec.confidence);`;

const SIZING_RECOMMEND_PYTHON = `res = requests.post(
    "https://api.primestyleai.com/api/v1/sizing/recommend",
    headers={"Authorization": f"Bearer {api_key}"},
    json={
        "method": "exact",
        "sizingUnit": "cm",
        "product": {"title": title, "description": description},
        "measurements": {"chest": 102, "waist": 86, "height": 180, "weight": 78},
    },
)
rec = res.json()
print(rec["recommendedSize"], rec["confidence"])`;

const SIZING_RECOMMEND_RESPONSE = `{
  "recommendedSize": "M",
  "tightSize": "S",
  "looseSize": "L",
  "confidence": "high",
  "reasoning": "Chest 102cm falls in the middle of the M band (100-104cm).",
  "internationalSizes": { "US": "M", "EU": "50", "UK": "M" },
  "unit": "cm"
}`;

// ── POST /api/v1/sizing/estimate ──

const SIZING_ESTIMATE_CURL = `# Normal mode — estimate from height/weight/gender + optional shape answers
curl -X POST https://api.primestyleai.com/api/v1/sizing/estimate \\
  -H "Authorization: Bearer $PRIMESTYLE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "height": 180,
    "weight": 78,
    "heightUnit": "cm",
    "weightUnit": "kg",
    "gender": "male",
    "age": 32,
    "bodyType": "average",
    "chestProfile": "average",
    "midsectionProfile": "flat",
    "hipProfile": "average",
    "requiredFields": ["chest", "waist", "hips", "shoulderWidth"]
  }'

# Snap mode — estimate from a body photo alone
curl -X POST https://api.primestyleai.com/api/v1/sizing/estimate \\
  -H "Authorization: Bearer $PRIMESTYLE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "snapMode": true,
    "bodyImage": "https://cdn.example.com/body.jpg",
    "requiredFields": ["chest", "waist", "hips"]
  }'`;

const SIZING_ESTIMATE_NODE = `const res = await fetch(
  "https://api.primestyleai.com/api/v1/sizing/estimate",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      height: 180,
      weight: 78,
      heightUnit: "cm",
      weightUnit: "kg",
      gender: "male",
      requiredFields: ["chest", "waist", "hips"],
    }),
  }
);
const { estimates, method, unit } = await res.json();`;

const SIZING_ESTIMATE_PYTHON = `res = requests.post(
    "https://api.primestyleai.com/api/v1/sizing/estimate",
    headers={"Authorization": f"Bearer {api_key}"},
    json={
        "height": 180,
        "weight": 78,
        "heightUnit": "cm",
        "weightUnit": "kg",
        "gender": "male",
        "requiredFields": ["chest", "waist", "hips"],
    },
)
data = res.json()
print(data["estimates"], data["method"])`;

const SIZING_ESTIMATE_RESPONSE = `{
  "estimates": {
    "chest": 102,
    "waist": 86,
    "hips": 98,
    "shoulderWidth": 46
  },
  "method": "llm",
  "unit": "cm",
  "detectedGender": "male"
}`;

// ── POST /api/v1/sizing/sizeguide ──

const SIZEGUIDE_CURL = `# 1. Raw HTML — backend parses it with an LLM
curl -X POST https://api.primestyleai.com/api/v1/sizing/sizeguide \\
  -H "Authorization: Bearer $PRIMESTYLE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product": { "title": "Linen Oxford Shirt" },
    "sizeGuideRaw": "<table>...</table>"
  }'

# 2. Pre-structured JSON — no parsing needed
curl -X POST https://api.primestyleai.com/api/v1/sizing/sizeguide \\
  -H "Authorization: Bearer $PRIMESTYLE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product": { "title": "Linen Oxford Shirt" },
    "sizeGuideData": {
      "headers": ["Size", "Chest (cm)", "Waist (cm)"],
      "rows": [["S","92-96","76-80"], ["M","100-104","84-88"]]
    }
  }'

# 3. Image URLs only — backend uses vision to extract the table
curl -X POST https://api.primestyleai.com/api/v1/sizing/sizeguide \\
  -H "Authorization: Bearer $PRIMESTYLE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product": { "title": "Linen Oxford Shirt" },
    "sizeChartImages": [
      "https://cdn.example.com/size-chart-men.jpg"
    ]
  }'`;

const SIZEGUIDE_NODE = `const res = await fetch(
  "https://api.primestyleai.com/api/v1/sizing/sizeguide",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product: { title },
      sizeGuideRaw: rawHtml,
    }),
  }
);
const guide = await res.json();
if (guide.found) useGuide(guide.headers, guide.rows);`;

const SIZEGUIDE_RESPONSE = `{
  "found": true,
  "title": "Men's Shirt Size Guide",
  "headers": ["Size", "Chest (cm)", "Waist (cm)"],
  "rows": [
    ["S",  "92-96",  "76-80"],
    ["M",  "100-104","84-88"],
    ["L",  "108-112","92-96"]
  ],
  "sections": []
}`;

// ── Guest (public) try-on ──

const GUEST_TRYON_CURL = `curl -X POST https://api.primestyleai.com/api/public/tryon \\
  -H "Content-Type: application/json" \\
  -d '{
    "modelImage": "https://cdn.example.com/user.jpg",
    "garmentImage": "https://cdn.example.com/shirt.jpg"
  }'`;

export function ApiReferenceSection() {
  return (
    <section id="api-reference">
      <SectionHeading id="api-reference">API Reference</SectionHeading>

      <p className="text-gray-700 text-lg leading-relaxed mb-4">
        The PrimeStyle HTTP API lives at{" "}
        <code className="font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded">
          https://api.primestyleai.com
        </code>
        . All authenticated endpoints accept JSON and require a bearer token.
      </p>

      <p className="text-gray-600 text-sm leading-relaxed mb-10">
        There is no HTTP surface for managing user profiles &mdash; profiles are kept in
        localStorage by the SDK. Your backend never needs to store them.
      </p>

      {/* ── POST /api/v1/tryon ── */}
      <div id="api-tryon-create" className="scroll-mt-14 lg:scroll-mt-24">
        <SectionHeading id="api-tryon-create" level={3}>
          Create a Try-On Job
        </SectionHeading>

        <EndpointBlock
          method="POST"
          path="/api/v1/tryon"
          description="Submit a new try-on job. Returns immediately with a galleryId you can stream or poll. One try-on token is deducted per successful job (failed jobs are refunded)."
          bodyParams={[
            {
              name: "modelImage",
              type: "string (URL or data URI)",
              required: true,
              description:
                "Image of the person. Public HTTPS URL, signed URL, or base64 data URI. JPEG, PNG or WebP up to 50MB.",
            },
            {
              name: "garmentImage",
              type: "string (URL or data URI)",
              required: true,
              description:
                "Image of the product. A clean product shot works best.",
            },
            {
              name: "fitInfo",
              type: "FitAreaInfo[]",
              required: false,
              description:
                "Optional per-area fit hints. Each entry has { area, fit, userValue?, garmentRange? } where fit is one of good, tight, loose, a-bit-tight, a-bit-loose, too-tight, too-loose. When any fit is imperfect the backend does a two-pass render to adjust that area. Not stored server-side.",
            },
          ]}
          codeExamples={[
            { language: "bash", label: "cURL", code: TRYON_CREATE_CURL },
            { language: "javascript", label: "Node.js", code: TRYON_CREATE_NODE },
            { language: "python", label: "Python", code: TRYON_CREATE_PYTHON },
          ]}
          responseExample={TRYON_CREATE_RESPONSE}
          responseStatus={202}
        />
      </div>

      {/* ── GET /api/v1/tryon/status/:galleryId ── */}
      <div id="api-tryon-status" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="api-tryon-status" level={3}>
          Poll Try-On Status
        </SectionHeading>

        <EndpointBlock
          method="GET"
          path="/api/v1/tryon/status/:galleryId"
          description="Returns the current state of a try-on job. Poll every ~3 seconds as a fallback to the SSE stream. Note: the URL param is the galleryId returned from POST /api/v1/tryon — some SDK code still calls this value 'jobId' for backwards compatibility."
          pathParams={[
            {
              name: "galleryId",
              type: "string (24-char MongoDB ObjectId)",
              required: true,
              description: "The galleryId returned from POST /api/v1/tryon. Example: 65c8d1a4e2b4f5d3c8a91234.",
            },
          ]}
          codeExamples={[
            { language: "bash", label: "cURL", code: TRYON_STATUS_CURL },
            { language: "javascript", label: "Node.js", code: TRYON_STATUS_NODE },
            { language: "python", label: "Python", code: TRYON_STATUS_PYTHON },
          ]}
          responseExample={TRYON_STATUS_RESPONSE}
        />

        <p className="text-sm text-gray-600 leading-relaxed mt-2">
          <code className="font-mono text-xs">status</code> is one of{" "}
          <code className="font-mono text-xs">processing</code>,{" "}
          <code className="font-mono text-xs">completed</code>, or{" "}
          <code className="font-mono text-xs">failed</code>. The{" "}
          <code className="font-mono text-xs">imageUrl</code> is populated only when the
          job completes successfully.
        </p>
      </div>

      {/* ── GET /api/v1/tryon/stream ── */}
      <div id="api-tryon-stream" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="api-tryon-stream" level={3}>
          Server-Sent Events Stream
        </SectionHeading>

        <EndpointBlock
          method="GET"
          path="/api/v1/tryon/stream"
          description="Subscribe to real-time job events. You receive 'completed' and 'failed' events for any job submitted by your API key while the connection is open. Use this instead of polling when you can keep a connection open."
          queryParams={[
            {
              name: "key",
              type: "string",
              required: false,
              description:
                "API key, passed on the URL because browser EventSource does not support custom headers. You may use the Authorization header from server-side clients instead.",
            },
          ]}
          codeExamples={[
            { language: "bash", label: "cURL", code: TRYON_STREAM_CURL },
            { language: "javascript", label: "Browser", code: TRYON_STREAM_JS },
          ]}
        />
      </div>

      {/* ── Upload Image (note) ── */}
      <div id="api-upload" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="api-upload" level={3}>
          Uploading Images
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          The try-on endpoint does not require a separate upload step. Pass images either
          as a public URL that PrimeStyle can fetch, or as a{" "}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
            data:image/jpeg;base64,&hellip;
          </code>
          {" "}URI. The SDK helpers{" "}
          <code className="font-mono text-xs">compressImage</code> and{" "}
          <code className="font-mono text-xs">isValidImageFile</code> can prepare a user
          file before posting.
        </p>

        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Accepted formats: JPEG, PNG, WebP.</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Max payload: 50MB per image.</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Input images (your photo + the garment) are forwarded to the rendering backend in memory for the duration of the request.</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>The generated result is delivered back to your application; we do not maintain a long-term copy on your behalf.</li>
          </ul>
        </div>
      </div>

      {/* ── POST /api/v1/sizing/recommend ── */}
      <div id="api-sizing-recommend" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="api-sizing-recommend" level={3}>
          Recommend a Size
        </SectionHeading>

        <EndpointBlock
          method="POST"
          path="/api/v1/sizing/recommend"
          description="Given a user profile and a product (optionally with its size guide), returns a recommended size, a confidence level, and human-readable reasoning."
          bodyParams={[
            {
              name: "method",
              type: '"exact" | "quick" | "photo"',
              required: true,
              description:
                "How the user's measurements were obtained. 'exact' means the user entered them directly, 'quick' means they came from height + weight + body-shape answers, 'photo' means they were derived from BlazePose landmarks on a body photo.",
            },
            {
              name: "product",
              type: "{ title, description?, variants? }",
              required: true,
              description:
                "Product context used to match the right size chart. Title is required; description and variants improve accuracy.",
            },
            {
              name: "measurements",
              type: "object",
              required: false,
              description:
                "Keyed by body part. Common keys: gender, heightCm, chest, bust, waist, hips, shoulderWidth, sleeveLength, inseam, neckCircumference. For footwear: shoeEU, shoeUS, shoeUK. Required when method is 'exact' or 'photo'. Extra keys are accepted and forwarded.",
            },
            {
              name: "quickEstimate",
              type: "object",
              required: false,
              description:
                "Height/weight/gender/age/body-shape inputs used when method is 'quick'.",
            },
            {
              name: "sizeGuide",
              type: "object",
              required: false,
              description:
                "A normalized size guide, typically the response from /api/v1/sizing/sizeguide.",
            },
            {
              name: "bodyImage",
              type: "string",
              required: false,
              description: "Body photo (URL or data URI) used when method is 'photo'.",
            },
            {
              name: "bodyLandmarks",
              type: "object",
              required: false,
              description: "MediaPipe BlazePose landmarks extracted in the browser.",
            },
            {
              name: "sizingUnit",
              type: '"cm" | "in"',
              required: false,
              description: "Preferred unit in the response. Defaults to cm.",
            },
            {
              name: "locale",
              type: "string",
              required: false,
              description: "BCP-47 locale used to generate the reasoning text.",
            },
          ]}
          codeExamples={[
            { language: "bash", label: "cURL", code: SIZING_RECOMMEND_CURL },
            { language: "javascript", label: "Node.js", code: SIZING_RECOMMEND_NODE },
            { language: "python", label: "Python", code: SIZING_RECOMMEND_PYTHON },
          ]}
          responseExample={SIZING_RECOMMEND_RESPONSE}
        />

        <ParamTable
          title="Response Fields"
          params={[
            { name: "recommendedSize", type: "string", required: true, description: "The size we recommend for this user + product." },
            { name: "tightSize", type: "string", required: false, description: "The next size down, if a tighter fit is possible." },
            { name: "looseSize", type: "string", required: false, description: "The next size up." },
            { name: "recommendedLength", type: "string", required: false, description: "For multi-length products (e.g. Short / Regular / Long inseam)." },
            { name: "confidence", type: '"high" | "medium" | "low"', required: true, description: "How certain the model is in the recommendation." },
            { name: "reasoning", type: "string", required: true, description: "Short explanation suitable to show to the end user." },
            { name: "internationalSizes", type: "Record<string, string>", required: false, description: "Localized size labels (US, EU, UK, JP, etc.)." },
            { name: "sections", type: "object[]", required: false, description: "Per-section recommendations for products with multiple sizing sections (e.g. top + bottom)." },
            { name: "unit", type: '"cm" | "in"', required: false, description: "Unit echoed from the request." },
          ]}
        />
      </div>

      {/* ── POST /api/v1/sizing/estimate ── */}
      <div className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="api-sizing-estimate" level={3}>
          Estimate Body Measurements
        </SectionHeading>

        <EndpointBlock
          method="POST"
          path="/api/v1/sizing/estimate"
          description="Estimate body measurements from either a short text profile (height, weight, gender, body-shape answers) or a body photo with MediaPipe BlazePose landmarks."
          bodyParams={[
            { name: "snapMode", type: "boolean", required: false, description: "Switches between two request shapes: normal (text profile) or snap (photo-only). When true, only bodyImage and requiredFields are used; gender/demographics are inferred from the photo." },
            { name: "bodyImage", type: "string", required: false, description: "Body photo as URL or data URI. Required when snapMode is true; optional in normal mode to enhance accuracy." },
            { name: "bodyLandmarks", type: "object", required: false, description: "MediaPipe BlazePose landmarks extracted in the browser. Improves accuracy when bodyImage is used." },
            { name: "requiredFields", type: "string[]", required: true, description: "1–20 measurement names you want back (e.g. ['chest', 'waist', 'hips']). Required in normal mode; optional in snap mode." },
            { name: "height", type: "number", required: false, description: "Height in heightUnit. 20–300. Used in normal mode." },
            { name: "weight", type: "number", required: false, description: "Weight in weightUnit. 20–700. Used in normal mode." },
            { name: "heightCm", type: "number", required: false, description: "Alternative to height+heightUnit — explicit centimeters, 36–250." },
            { name: "weightKg", type: "number", required: false, description: "Alternative to weight+weightUnit — explicit kilograms, 30–660." },
            { name: "heightUnit", type: '"cm" | "in" | "ft"', required: false, description: "Unit of the supplied height. Default 'cm'. 'ft' is a legacy alias for 'in'." },
            { name: "weightUnit", type: '"kg" | "lbs"', required: false, description: "Unit of the supplied weight. Default 'kg'." },
            { name: "gender", type: '"male" | "female" | "unisex"', required: true, description: "Required in normal mode. Inferred from the photo in snap mode." },
            { name: "age", type: "number", required: false, description: "13–100. Improves accuracy slightly." },
            { name: "bodyType", type: '"slim" | "athletic" | "average" | "stocky" | "plus"', required: false, description: "Self-assessed overall build." },
            { name: "chestProfile", type: '"narrow" | "average" | "broad"', required: false, description: "Shape hint for the chest/bust." },
            { name: "midsectionProfile", type: '"flat" | "average" | "round"', required: false, description: "Shape hint for the midsection." },
            { name: "hipProfile", type: '"narrow" | "average" | "full"', required: false, description: "Shape hint for the hips." },
            { name: "unit", type: '"cm" | "in"', required: false, description: "Preferred unit for the returned estimates." },
          ]}
          codeExamples={[
            { language: "bash", label: "cURL", code: SIZING_ESTIMATE_CURL },
            { language: "javascript", label: "Node.js", code: SIZING_ESTIMATE_NODE },
            { language: "python", label: "Python", code: SIZING_ESTIMATE_PYTHON },
          ]}
          responseExample={SIZING_ESTIMATE_RESPONSE}
        />
      </div>

      {/* ── POST /api/v1/sizing/sizeguide ── */}
      <div id="api-sizing-sizeguide" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="api-sizing-sizeguide" level={3}>
          Parse a Size Guide
        </SectionHeading>

        <EndpointBlock
          method="POST"
          path="/api/v1/sizing/sizeguide"
          description="Normalize a raw size guide (HTML, JSON, or chart images) into a structured table of sizes that /api/v1/sizing/recommend can consume. Useful once per product page load; cache the result alongside your product."
          bodyParams={[
            { name: "product", type: "{ title?, description?, category?, subcategory?, gender? }", required: false, description: "Product context used to disambiguate the chart. Category/subcategory/gender help pick the right chart when the merchant serves multiple." },
            { name: "sizeGuideData", type: "unknown", required: false, description: "A pre-structured guide (headers + rows, or your own shape). Skips parsing on the backend." },
            { name: "sizeGuideRaw", type: "string", required: false, description: "Raw HTML or plain text (for instance the innerHTML of a size-guide panel). The backend will normalize it with an LLM." },
            { name: "sizeChartImages", type: "string[]", required: false, description: "Array of image URLs of size charts. Used when the merchant only has screenshots or PDFs — the backend uses vision to extract the table." },
          ]}
          codeExamples={[
            { language: "bash", label: "cURL", code: SIZEGUIDE_CURL },
            { language: "javascript", label: "Node.js", code: SIZEGUIDE_NODE },
          ]}
          responseExample={SIZEGUIDE_RESPONSE}
        />
      </div>

      {/* ── Error Codes ── */}
      <div id="api-error-codes" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="api-error-codes" level={3}>
          Error Codes
        </SectionHeading>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-200">
                <th className="text-left px-5 py-3 text-gray-600 font-medium w-24">HTTP</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: "400", desc: "Malformed JSON, missing required fields, or an image the renderer could not decode." },
                { code: "401", desc: "Missing, malformed, expired, or revoked API key." },
                { code: "402", desc: "Try-on balance is 0. Body includes currentBalance and required." },
                { code: "404", desc: "Gallery id not found (for /status/:galleryId)." },
                { code: "422", desc: "Input passed validation but cannot be sized (e.g. no pose detected in the photo)." },
                { code: "429", desc: "Rate limit exceeded. Retry with exponential backoff." },
                { code: "500", desc: "Unexpected server error. Failed jobs are automatically refunded." },
              ].map((row) => (
                <tr key={row.code} className="border-b border-gray-200/50 last:border-0">
                  <td className="px-5 py-3">
                    <code className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{row.code}</code>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Guest / public endpoint ── */}
      <div className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="api-public-tryon" level={3}>
          Guest Try-On (no auth)
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          For marketing demos and landing pages, a public endpoint accepts one free
          try-on per IP address without an API key. It is otherwise identical to the
          authenticated version. There is a matching{" "}
          <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
            GET /api/public/tryon/status/:jobId
          </code>
          .
        </p>

        <EndpointBlock
          method="POST"
          path="/api/public/tryon"
          auth={false}
          description="Submit one free guest try-on. Rate-limited per IP. Not intended for production integrations."
          codeExamples={[{ language: "bash", label: "cURL", code: GUEST_TRYON_CURL }]}
        />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: SDK
// ═══════════════════════════════════════════════════════════

const SDK_REACT_FULL = `import { PrimeStyleTryon } from "@primestyleai/tryon/react";

export function ProductTryOnButton({ product }) {
  return (
    <PrimeStyleTryon
      productImage={product.image}
      productTitle={product.title}
      productId={product.sku}
      buttonText="See it on you"
      apiUrl={process.env.NEXT_PUBLIC_PRIMESTYLE_API_URL}
      locale="en"
      showPoweredBy
      onOpen={() => track("tryon_open", { sku: product.sku })}
      onUpload={(file) => track("tryon_upload", { size: file.size })}
      onProcessing={(jobId) => track("tryon_processing", { jobId })}
      onComplete={({ jobId, imageUrl }) => {
        track("tryon_complete", { jobId });
        analytics.setResult(imageUrl);
      }}
      onError={(err) => track("tryon_error", err)}
    />
  );
}`;

const SDK_HEADLESS_HOOK = `import { usePrimeStyleSize } from "@primestyleai/tryon/react";

function SizeRecommendation({ product }) {
  const { data, loading, error } = usePrimeStyleSize({
    product: { title: product.title, description: product.description },
    sizingUnit: "cm",
  });

  if (loading) return <p>Measuring&hellip;</p>;
  if (error) return <p>Couldn&apos;t compute a size.</p>;
  if (!data) return <p>Set up your profile to see a size.</p>;

  return (
    <div>
      <strong>Recommended: {data.recommendedSize}</strong>
      <p>{data.reasoning}</p>
    </div>
  );
}`;

const SDK_RECOMMEND_FOR_PRODUCT = `import { recommendForProduct } from "@primestyleai/tryon";

const rec = await recommendForProduct({
  apiUrl: "https://api.primestyleai.com",
  product: {
    title: "Linen Oxford Shirt",
    description: "Regular fit, 100% linen.",
  },
  sizingUnit: "cm",
});

if (rec) {
  console.log(rec.recommendedSize, rec.confidence, rec.reasoning);
}`;

const SDK_ESTIMATE = `import { estimateFullMeasurements } from "@primestyleai/tryon";

const result = await estimateFullMeasurements({
  apiUrl: "https://api.primestyleai.com",
  height: 180,
  weight: 78,
  heightUnit: "cm",
  weightUnit: "kg",
  gender: "male",
  requiredFields: ["chest", "waist", "hips"],
});

console.log(result?.estimates, result?.unit);`;

const SDK_PROFILE_STORAGE = `import {
  getProfiles,
  getActiveProfile,
  getActiveProfileId,
  setActiveProfileId,
  saveProfiles,
  updateProfile,
  updateProfileMeasurements,
  addSizeToHistory,
  getCachedSize,
} from "@primestyleai/tryon";

// Read the current active profile (or null).
const profile = getActiveProfile();

// Switch profiles.
setActiveProfileId("profile-2");

// Update measurements after the user edits them.
updateProfileMeasurements(profile.id, {
  chest: 104,
  waist: 88,
}, "cm");

// Look up a cached size recommendation for a product.
const cached = getCachedSize(profile, "sku-12345");`;

export function SdkSection() {
  return (
    <section id="sdk">
      <SectionHeading id="sdk">SDK</SectionHeading>

      <p className="text-gray-700 text-lg leading-relaxed mb-10">
        The <code className="font-mono text-base bg-gray-100 px-1.5 py-0.5 rounded">
          @primestyleai/tryon
        </code>{" "}
        package exposes four surfaces: a React component, a set of headless functions
        and a React hook for sizing, a browser web component, and a handful of
        localStorage helpers for managing user profiles client-side.
      </p>

      {/* ── Installation ── */}
      <div id="sdk-installation" className="scroll-mt-14 lg:scroll-mt-24">
        <SectionHeading id="sdk-installation" level={3}>
          Installation
        </SectionHeading>

        <TabbedCodeBlock examples={QUICK_START_INSTALL} />

        <p className="text-sm text-gray-600 leading-relaxed">
          The package has no peer dependencies beyond React 18+ (React 19 supported).
          The web component is registered automatically by importing the top-level
          package (<code className="font-mono text-xs">import &quot;@primestyleai/tryon&quot;</code>).
        </p>
      </div>

      {/* ── Component & Props ── */}
      <div id="sdk-component" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="sdk-component" level={3}>
          {`React Component: <PrimeStyleTryon />`}
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          The React component renders a launch button and, when clicked, a full-screen
          modal that walks the user through profile creation, sizing, and try-on. A
          single prop &mdash; <code className="font-mono text-xs">productImage</code>{" "}
          &mdash; is enough to ship.
        </p>

        <CodeBlock
          code={`import { PrimeStyleTryon } from "@primestyleai/tryon/react";`}
          language="typescript"
        />

        <ParamTable
          title="Props"
          params={[
            { name: "productImage", type: "string", required: true, description: "Public URL of the product image to try on." },
            { name: "productTitle", type: "string", required: false, description: "Shown in the modal header and used to improve sizing accuracy." },
            { name: "productId", type: "string", required: false, description: "Your SKU. Used as the cache key for size recommendations and try-on results per profile." },
            { name: "buttonText", type: "string", required: false, description: "Button label. Defaults to the localized 'Try it on'." },
            { name: "apiUrl", type: "string", required: false, description: "PrimeStyle API base URL. Defaults to NEXT_PUBLIC_PRIMESTYLE_API_URL or https://api.primestyleai.com." },
            { name: "showPoweredBy", type: "boolean", required: false, description: "Show the 'Powered by PrimeStyle' badge in the modal footer." },
            { name: "showIcon", type: "boolean", required: false, description: "Show the sparkle icon on the button." },
            { name: "buttonIcon", type: "React.ReactNode", required: false, description: "Custom icon replacing the default sparkle." },
            { name: "locale", type: "string", required: false, description: "BCP-47 locale code (e.g. 'en', 'fr', 'es-MX'). See the i18n section." },
            { name: "buttonStyles", type: "ButtonStyles", required: false, description: "Override colors, padding, border, radius, font, and hover state." },
            { name: "modalStyles", type: "ModalStyles", required: false, description: "Override modal colors, shadow, and accent." },
            { name: "classNames", type: "PrimeStyleClassNames", required: false, description: "Map of className overrides for internal modal slots." },
            { name: "className", type: "string", required: false, description: "Class applied to the root launch button." },
            { name: "style", type: "CSSProperties", required: false, description: "Inline styles on the launch button." },
            { name: "sizeGuideData", type: "unknown", required: false, description: "Pre-parsed size guide to skip the /sizing/sizeguide call. See 'Using your own size guide' in Guides." },
            { name: "onOpen", type: "() => void", required: false, description: "Fires when the modal opens." },
            { name: "onClose", type: "() => void", required: false, description: "Fires when the modal closes." },
            { name: "onUpload", type: "(file: File) => void", required: false, description: "Fires when the user selects a photo." },
            { name: "onProcessing", type: "(jobId: string) => void", required: false, description: "Fires once we have a jobId from the API." },
            { name: "onComplete", type: "(r: { jobId, imageUrl }) => void", required: false, description: "Fires when the try-on image is ready." },
            { name: "onError", type: "(e: { message, code? }) => void", required: false, description: "Fires on any error surfaced to the user." },
          ]}
        />

        <CodeBlock code={SDK_REACT_FULL} language="typescript" filename="Full example" />
      </div>

      {/* ── Customization ── */}
      <div id="sdk-customization" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="sdk-customization" level={3}>
          Customization
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          Three layers, in order of precedence (top wins):
        </p>

        <ul className="space-y-2 text-sm text-gray-700 mb-4">
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              <code className="font-mono text-xs">classNames</code> &mdash; map of
              Tailwind/CSS classes for specific slots (button, modal, footer, etc.).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              <code className="font-mono text-xs">buttonStyles</code> and{" "}
              <code className="font-mono text-xs">modalStyles</code> &mdash; typed
              objects for the common tweaks (colors, border, radius, hover).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              <code className="font-mono text-xs">className</code> +{" "}
              <code className="font-mono text-xs">style</code> &mdash; last-resort
              overrides on the launch button.
            </span>
          </li>
        </ul>

        <CodeBlock
          code={`<PrimeStyleTryon
  productImage={product.image}
  buttonStyles={{
    background: "#111",
    color: "#fff",
    borderRadius: 0,
    hoverBackground: "#2154EF",
  }}
  modalStyles={{ accent: "#2154EF" }}
  classNames={{ launchButton: "font-serif uppercase tracking-widest" }}
/>`}
          language="typescript"
        />
      </div>

      {/* ── Callbacks ── */}
      <div id="sdk-callbacks" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="sdk-callbacks" level={3}>
          Callbacks
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          All callbacks are optional and fire in this order during a successful flow:
        </p>

        <div className="rounded-lg border border-gray-200 bg-[#EFF5FF] px-4 py-3 mb-4 text-xs text-gray-700">
          <strong className="font-semibold text-gray-900">Naming note:</strong> the SDK exposes the try-on identifier as{" "}
          <code className="font-mono bg-white/70 px-1 py-0.5 rounded">jobId</code>. The raw HTTP API calls the same value{" "}
          <code className="font-mono bg-white/70 px-1 py-0.5 rounded">galleryId</code>. They are interchangeable; the SDK
          translates at the boundary.
        </div>

        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5">
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li><code className="font-mono text-xs">onOpen()</code> &mdash; user clicks the launch button.</li>
            <li><code className="font-mono text-xs">onUpload(file)</code> &mdash; user selects a body photo.</li>
            <li><code className="font-mono text-xs">onProcessing(jobId)</code> &mdash; the API has accepted the job.</li>
            <li><code className="font-mono text-xs">onComplete(&#123; jobId, imageUrl &#125;)</code> &mdash; the try-on image is ready.</li>
            <li><code className="font-mono text-xs">onClose()</code> &mdash; user dismisses the modal.</li>
          </ol>
          <p className="text-sm text-gray-600 leading-relaxed mt-4">
            <code className="font-mono text-xs">onError(&#123; message, code? &#125;)</code>{" "}
            fires whenever a recoverable error surfaces to the user (bad image, safety
            filter block, 402 insufficient balance, etc.).
          </p>
        </div>
      </div>

      {/* ── Headless sizing ── */}
      <div className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="sdk-headless" level={3}>
          Headless Sizing
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          If you don&apos;t want the bundled modal, three primitives let you build your
          own UI on top of the same sizing engine. All of them are pure client-side
          calls against the PrimeStyle API and use whatever profile is currently active
          in localStorage.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="size-4 text-[#2154EF]" />
              <code className="font-mono text-sm font-semibold text-gray-900">
                recommendForProduct()
              </code>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              One-shot async function. Returns{" "}
              <code className="font-mono text-[11px]">RecommendForProductResult | null</code>.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="size-4 text-[#2154EF]" />
              <code className="font-mono text-sm font-semibold text-gray-900">
                estimateFullMeasurements()
              </code>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              One-shot async function. Returns estimates + unit + detected gender.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="size-4 text-[#2154EF]" />
              <code className="font-mono text-sm font-semibold text-gray-900">
                usePrimeStyleSize()
              </code>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              React hook wrapper around{" "}
              <code className="font-mono text-[11px]">recommendForProduct</code>.
              Returns <code className="font-mono text-[11px]">{`{ data, loading, error }`}</code>.
            </p>
          </div>
        </div>

        <CodeBlock code={SDK_RECOMMEND_FOR_PRODUCT} language="typescript" filename="recommendForProduct" />
        <CodeBlock code={SDK_ESTIMATE} language="typescript" filename="estimateFullMeasurements" />
        <CodeBlock code={SDK_HEADLESS_HOOK} language="typescript" filename="usePrimeStyleSize" />
      </div>

      {/* ── Web component ── */}
      <div className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="sdk-web-component" level={3}>
          Web Component (Coming Soon)
        </SectionHeading>

        <div className="rounded-xl border border-[#2154EF]/20 bg-[#2154EF]/5 p-5">
          <div className="flex items-start gap-3">
            <Globe className="size-5 text-[#2154EF] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Drop-in <code className="font-mono text-xs">&lt;primestyle-tryon&gt;</code> tag and CDN script coming soon
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                A framework-agnostic custom element you can drop into any HTML page with a
                single script tag is in development. For now, use the React component or
                the raw HTTP API directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile storage ── */}
      <div className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="sdk-profiles" level={3}>
          Profile Storage (localStorage)
        </SectionHeading>

        <div className="rounded-xl border border-[#2154EF]/20 bg-[#2154EF]/5 p-5 mb-4">
          <div className="flex items-start gap-3">
            <HardDrive className="size-5 text-[#2154EF] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-800 leading-relaxed">
              These helpers read and write{" "}
              <code className="font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded">
                localStorage
              </code>
              {" "}directly. There is no network I/O and no server-side profile store.
              Safe to call client-side on any render.
            </p>
          </div>
        </div>

        <ParamTable
          title="Exports"
          params={[
            { name: "getProfiles()", type: "() => Profile[]", required: false, description: "All stored profiles on this browser." },
            { name: "saveProfiles(profiles)", type: "(profiles: Profile[]) => void", required: false, description: "Replace the entire profile list." },
            { name: "getActiveProfile()", type: "() => Profile | null", required: false, description: "The currently active profile, or null." },
            { name: "getActiveProfileId()", type: "() => string | null", required: false, description: "Id of the currently active profile." },
            { name: "setActiveProfileId(id)", type: "(id: string) => void", required: false, description: "Switch the active profile." },
            { name: "updateProfile(id, patch)", type: "(id, patch) => void", required: false, description: "Merge-update a profile by id." },
            { name: "updateProfileMeasurements(id, m, unit?)", type: "function", required: false, description: "Update only the measurements object for a profile." },
            { name: "addSizeToHistory(profileId, entry)", type: "function", required: false, description: "Remember a recommended size for later lookups." },
            { name: "getCachedSize(profile, productId)", type: "(profile, productId) => string | null", required: false, description: "Return a previously cached recommendation for (profile, product), or null." },
          ]}
        />

        <CodeBlock code={SDK_PROFILE_STORAGE} language="typescript" filename="Profile helpers" />
      </div>

      {/* ── Environment ── */}
      <div id="sdk-env" className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="sdk-env" level={3}>
          Environment Variables
        </SectionHeading>

        <ParamTable
          title="Build-time variables"
          params={[
            {
              name: "NEXT_PUBLIC_PRIMESTYLE_API_URL",
              type: "string",
              required: false,
              description:
                "Base URL the SDK calls when no apiUrl prop is passed. Defaults to https://api.primestyleai.com. Exposed to the browser at build time by Next.js.",
            },
          ]}
        />

        <p className="text-sm text-gray-600 leading-relaxed">
          The SDK itself does not read the API key from any env var; it hits whatever
          URL you point it at. Proxy the key through your backend so end users never
          see it.
        </p>
      </div>

      {/* ── i18n ── */}
      <div id="sdk-i18n" className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="sdk-i18n" level={3}>
          Internationalization (i18n)
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          Pass a locale via the <code className="font-mono text-xs">locale</code> prop
          (or <code className="font-mono text-xs">locale</code> attribute on the web
          component). The SDK ships with a set of built-in translations and will fall
          back to English for missing keys.
        </p>

        <ParamTable
          title="i18n utilities"
          params={[
            { name: "SUPPORTED_LOCALES", type: "readonly string[]", required: false, description: "Locale codes that ship out of the box." },
            { name: "TRANSLATION_KEYS", type: "readonly string[]", required: false, description: "All keys used inside the modal. Useful for validation in custom translations." },
            { name: "registerLocale(locale, dict)", type: "function", required: false, description: "Register or override a locale at runtime." },
            { name: "createT(locale)", type: "(locale: string) => (key: string) => string", required: false, description: "Build a translation function for a specific locale. Useful for your own UI built around the headless hook." },
            { name: "detectLanguage()", type: "() => string", required: false, description: "Detect the user's language from the browser (navigator.language)." },
          ]}
        />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: Guides
// ═══════════════════════════════════════════════════════════

const GUIDE_SIZE_GUIDE_HTML = `import { PrimeStyleTryon } from "@primestyleai/tryon/react";

export function ProductButton({ product }) {
  return (
    <PrimeStyleTryon
      productImage={product.image}
      productTitle={product.title}
      productId={product.sku}
      sizeGuideData={{
        headers: ["Size", "Chest (cm)", "Waist (cm)"],
        rows: [
          ["S",  "92-96",   "76-80"],
          ["M",  "100-104", "84-88"],
          ["L",  "108-112", "92-96"],
        ],
      }}
    />
  );
}`;

const GUIDE_SIZE_GUIDE_API = `// 1. Normalize raw HTML once, cache the result on your product.
const guide = await fetch(
  "https://api.primestyleai.com/api/v1/sizing/sizeguide",
  {
    method: "POST",
    headers: { Authorization: \`Bearer \${apiKey}\`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product: { title: product.title },
      sizeGuideRaw: product.sizeGuideHtml,
    }),
  },
).then((r) => r.json());

// 2. Pass the normalized guide back to PrimeStyleTryon:
<PrimeStyleTryon
  productImage={product.image}
  productTitle={product.title}
  sizeGuideData={guide}
/>`;

const GUIDE_EVENTS = `<PrimeStyleTryon
  productImage={product.image}
  productTitle={product.title}
  productId={product.sku}
  onOpen={() => analytics.track("tryon_open")}
  onUpload={(file) =>
    analytics.track("tryon_upload", { size: file.size, type: file.type })
  }
  onProcessing={(jobId) => analytics.track("tryon_processing", { jobId })}
  onComplete={({ jobId, imageUrl }) => {
    analytics.track("tryon_complete", { jobId });
    setResultImage(imageUrl);
  }}
  onError={({ message, code }) =>
    analytics.track("tryon_error", { message, code })
  }
/>`;

const GUIDE_IMAGES = `// Accepted image sources for modelImage / garmentImage:
// - Public HTTPS URL:
"https://cdn.example.com/products/shirt.jpg"

// - Data URI (base64):
"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."

// - Helpers for browser-side files:
import { compressImage, isValidImageFile } from "@primestyleai/tryon";

if (!isValidImageFile(file)) throw new Error("Unsupported image");
const compressed = await compressImage(file, { maxDimension: 1600 });`;

export function GuidesSection() {
  return (
    <section id="guides">
      <SectionHeading id="guides">Guides</SectionHeading>

      <p className="text-gray-700 text-lg leading-relaxed mb-10">
        Short, copy-and-paste guides for the integrations our partners ask about the
        most.
      </p>

      {/* ── Shopify ── */}
      <div id="guide-shopify-app" className="scroll-mt-14 lg:scroll-mt-24">
        <SectionHeading id="guide-shopify-app" level={3}>
          Shopify App
        </SectionHeading>

        <div className="rounded-xl border border-[#2154EF]/20 bg-[#2154EF]/5 p-5 flex items-start gap-3">
          <svg viewBox="0 0 256 292" width="32" height="32" aria-hidden="true" className="flex-shrink-0 mt-0.5">
            <path d="M223.774 57.34c-.201-1.46-1.48-2.268-2.537-2.357-1.055-.088-23.383-1.743-23.383-1.743s-15.507-15.395-17.209-17.099c-1.703-1.703-5.029-1.185-6.32-.805-.19.056-3.388 1.043-8.678 2.68-5.18-14.906-14.322-28.604-30.405-28.604-.444 0-.901.018-1.358.044C129.31 3.407 123.644 1 118.75 1c-37.465 0-55.364 46.835-60.976 70.635-14.558 4.511-24.9 7.718-26.221 8.133-8.126 2.549-8.383 2.805-9.45 10.462C21.3 95.977 0 260.494 0 260.494l165.845 31.075 89.855-19.443S223.973 58.8 223.774 57.34zM156.354 40.795l-14.009 4.34c.003-.98.01-1.944.01-2.998 0-9.186-1.276-16.577-3.32-22.436 8.213 1.03 13.688 10.374 17.319 21.094zm-27.72-19.257c2.281 5.715 3.762 13.916 3.762 24.986 0 .567-.005 1.087-.01 1.61-9.108 2.82-19.003 5.888-28.93 8.963 5.571-21.495 16.015-31.878 25.178-35.559zm-11.167-10.57c1.622 0 3.256.549 4.822 1.614-12.04 5.666-24.945 19.932-30.394 48.421L69.03 67.142c6.366-21.68 21.47-56.174 48.438-56.174z" fill="#95BF47"/>
            <path d="M221.237 54.983c-1.055-.088-23.383-1.743-23.383-1.743s-15.507-15.395-17.209-17.099c-.636-.634-1.493-.959-2.394-1.099l-12.54 256.233 89.855-19.444S223.972 58.8 223.774 57.34c-.2-1.46-1.48-2.268-2.537-2.357z" fill="#5E8E3E"/>
            <path d="M135.242 104.585l-11.083 32.926s-9.568-5.023-21.311-5.023c-17.217 0-18.083 10.732-18.083 13.428 0 14.713 38.368 20.361 38.368 54.83 0 27.113-17.29 44.561-40.58 44.561-27.952 0-42.246-17.4-42.246-17.4l7.48-24.71s14.695 12.617 27.093 12.617c8.098 0 11.393-6.376 11.393-11.034 0-19.194-31.489-20.056-31.489-51.594 0-26.543 19.048-52.234 57.52-52.234 14.884 0 22.938 4.633 22.938 4.633z" fill="#FFF"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Official Shopify app is live
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              PrimeStyleAI is available on the Shopify App Store with product detection,
              size-guide parsing, per-variant recommendations, and no-code storefront
              install.
              <a
                href="https://apps.shopify.com/primestyleai"
                className="ml-1 font-semibold text-[#2154EF] hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Install on Shopify
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* ── Own size guide ── */}
      <div className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="guide-own-size-guide" level={3}>
          Using Your Own Size Guide
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          If you already have structured size data, pass it directly to{" "}
          <code className="font-mono text-xs">sizeGuideData</code>. The SDK will skip
          the call to <code className="font-mono text-xs">/api/v1/sizing/sizeguide</code>{" "}
          and feed your table straight into the recommender.
        </p>

        <CodeBlock code={GUIDE_SIZE_GUIDE_HTML} language="typescript" filename="Inline size guide" />

        <p className="text-gray-700 text-sm leading-relaxed mt-6 mb-4">
          If all you have is raw HTML (for example, the innerHTML of a merchant&apos;s
          existing size-guide panel), call the parser endpoint once at build time and
          cache the normalized structure with your product:
        </p>

        <CodeBlock code={GUIDE_SIZE_GUIDE_API} language="typescript" filename="Parsed once, cached forever" />
      </div>

      {/* ── Listening to events ── */}
      <div className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="guide-events" level={3}>
          Listening to Try-On Events
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          Wire the component&apos;s callbacks into your analytics to understand the
          funnel (opens &rarr; uploads &rarr; completes) and to react to the final
          image (cache it, show a &quot;looks great&quot; prompt, etc.).
        </p>

        <CodeBlock code={GUIDE_EVENTS} language="typescript" filename="Analytics wiring" />
      </div>

      {/* ── Images ── */}
      <div id="guide-images" className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="guide-images" level={3}>
          Image Best Practices
        </SectionHeading>

        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5 mb-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Product images: clean, well-lit, front-facing, preferably on a plain background.</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Body photos: one person, full torso visible, arms slightly away from the body.</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Max 50MB per image; compress to ~1600px on the longest side before posting.</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Use JPEG for photos and PNG only when you need alpha.</li>
          </ul>
        </div>

        <CodeBlock code={GUIDE_IMAGES} language="typescript" filename="Image inputs" />
      </div>

      {/* ── Loading states ── */}
      <div id="guide-loading" className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="guide-loading" level={3}>
          Loading States
        </SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          Try-ons typically complete in 15-20 seconds. To keep the UI responsive:
        </p>

        <ul className="space-y-2 text-sm text-gray-700 mb-4">
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              Show an optimistic state as soon as{" "}
              <code className="font-mono text-xs">onProcessing(jobId)</code> fires.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              Prefer <code className="font-mono text-xs">/api/v1/tryon/stream</code>{" "}
              (SSE) over polling; it typically shaves 1-3 seconds off the perceived
              latency.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              Fall back to polling <code className="font-mono text-xs">/status/:jobId</code>{" "}
              every 3 seconds if SSE is blocked (some corporate proxies strip it).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#2154EF] mt-1">&bull;</span>
            <span>
              On <code className="font-mono text-xs">failed</code>, show a short retry
              affordance &mdash; failed jobs are refunded automatically.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: Pricing
// ═══════════════════════════════════════════════════════════

export function PricingSection() {
  return (
    <section id="pricing">
      <SectionHeading id="pricing">Pricing</SectionHeading>

      <p className="text-gray-700 leading-relaxed mb-8">
        Simple pricing based on try-on generations. Subscribe for volume discounts.
        You are only charged for successful try-ons &mdash; failed jobs are refunded
        automatically. Sizing endpoints are currently free and metered only by rate
        limits.
      </p>

      <div className="rounded-xl border border-gray-200 overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-200">
              <th className="text-left px-5 py-4 text-gray-600 font-medium">Plan</th>
              <th className="text-left px-5 py-4 text-gray-600 font-medium">Price</th>
              <th className="text-left px-5 py-4 text-gray-600 font-medium">Try-Ons</th>
              <th className="text-left px-5 py-4 text-gray-600 font-medium hidden sm:table-cell">Per try-on</th>
            </tr>
          </thead>
          <tbody>
            {[
              { plan: "Tier I", price: "$299/mo", tryOns: "600", per: "$0.50", highlight: false },
              { plan: "Tier II", price: "$999/mo", tryOns: "2,500", per: "$0.40", highlight: true },
              { plan: "Tier III", price: "$2,999/mo", tryOns: "10,000", per: "$0.30", highlight: false },
            ].map((row) => (
              <tr
                key={row.plan}
                className={`border-b border-gray-200/50 last:border-0 ${row.highlight ? "bg-[#2154EF]/5" : ""}`}
              >
                <td className="px-5 py-4">
                  <span className={`font-semibold ${row.highlight ? "text-[#2154EF]" : "text-gray-900"}`}>
                    {row.plan}
                  </span>
                  {row.highlight && (
                    <span className="ml-2 text-xs bg-[#2154EF]/20 text-[#2154EF] px-2 py-0.5 rounded-full">Popular</span>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-900 font-semibold">{row.price}</td>
                <td className="px-5 py-4 text-gray-700">{row.tryOns}</td>
                <td className="px-5 py-4 text-gray-600 hidden sm:table-cell">{row.per}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5 text-center">
          <p className="text-2xl font-bold text-gray-900 mb-1">~15s</p>
          <p className="text-sm text-gray-600">Average processing time</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5 text-center">
          <p className="text-2xl font-bold text-gray-900 mb-1">$0</p>
          <p className="text-sm text-gray-600">Failed jobs are free</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5 text-center">
          <p className="text-2xl font-bold text-gray-900 mb-1">Auto</p>
          <p className="text-sm text-gray-600">Refund on failed jobs</p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: Support
// ═══════════════════════════════════════════════════════════

export function SupportSection() {
  return (
    <section id="support">
      <SectionHeading id="support">Support</SectionHeading>

      <p className="text-gray-700 leading-relaxed mb-8">
        We&apos;re here to help you integrate. Reach out through any of these channels:
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <a
          href="mailto:support@primestyleai.com"
          className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6 hover:border-[#2154EF]/30 transition-colors group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-[#2154EF] transition-colors mb-2">
            Email Support
          </h3>
          <p className="text-sm text-gray-600">support@primestyleai.com</p>
          <p className="text-xs text-gray-500 mt-2">Response within 24 hours</p>
        </a>

        <Link
          href="/customer/dashboard/docs#support"
          className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6 hover:border-[#2154EF]/30 transition-colors group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-[#2154EF] transition-colors mb-2">
            Enterprise
          </h3>
          <p className="text-sm text-gray-600">Custom integrations, SLA, dedicated support</p>
          <p className="text-xs text-gray-500 mt-2">Contact us for a demo</p>
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6 mt-4">
        <h3 className="font-semibold text-gray-900 mb-3">Frequently Asked</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-900 font-medium">What image formats are supported?</p>
            <p className="text-sm text-gray-600 mt-1">JPEG, PNG, and WebP. Both URLs and base64 data URIs. Max 50MB per file.</p>
          </div>
          <div>
            <p className="text-sm text-gray-900 font-medium">Where are user profiles stored?</p>
            <p className="text-sm text-gray-600 mt-1">
              Profiles can be stored in the browser and synced through PrimeStyleAI
              profile services when shoppers sign in. Profile photos and measurements
              are used to provide cross-site sizing recommendations and virtual try-on.
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-900 font-medium">Do you store customer photos or try-on results?</p>
            <p className="text-sm text-gray-600 mt-1">Input photos are forwarded in memory to the rendering backend and dropped after the request completes. Generated results are returned to your application. See the Privacy Policy for retention details.</p>
          </div>
          <div>
            <p className="text-sm text-gray-900 font-medium">What happens if a try-on fails?</p>
            <p className="text-sm text-gray-600 mt-1">
              Failed try-ons are not counted against your balance. Common causes: safety
              filter blocks or invalid images. Listen for <code className="font-mono text-xs bg-white/5 px-1 py-0.5 rounded">failed</code>{" "}
              on the SSE stream or check <code className="font-mono text-xs bg-white/5 px-1 py-0.5 rounded">/status/:jobId</code>.
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-900 font-medium">How long does processing take?</p>
            <p className="text-sm text-gray-600 mt-1">
              Typically 15-20 seconds. Use the SSE stream to receive the result the
              instant it&apos;s ready, or poll the status endpoint every 3 seconds as a
              fallback.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: Legal
// ═══════════════════════════════════════════════════════════

function LegalContactBlock() {
  return (
    <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-6 mt-8">
      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Contact</h4>
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="mailto:admin@PrimeStyleAI.com"
          className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#2154EF] transition-colors"
        >
          <Mail className="size-4 text-[#2154EF]" />
          admin@PrimeStyleAI.com
        </a>
        <span className="flex items-center gap-3 text-sm text-gray-600">
          <MapPin className="size-4 text-[#2154EF] flex-shrink-0" />
          28171 Westfield Drive, Laguna Niguel, CA 92677, USA
        </span>
      </div>
    </div>
  );
}

export function LegalSection() {
  return (
    <section id="legal">
      <SectionHeading id="legal">Legal</SectionHeading>

      <p className="text-gray-700 text-lg leading-relaxed mb-4">
        These policies govern PrimeStyleAI&apos;s business-to-business API/SDK services
        available at{" "}
        <a href="https://primestyleai.com" className="text-[#2154EF] hover:underline">
          primestyleai.com
        </a>.
      </p>
      <p className="text-gray-600 text-sm leading-relaxed mb-10">
        Certain provisions also anticipate future optional end-user features; however,
        end users are not intended customers of the Services unless explicitly stated
        in a separate agreement.
      </p>

      {/* ── Terms of Service ── */}
      <div id="legal-tos" className="scroll-mt-14 lg:scroll-mt-24">
        <SectionHeading id="legal-tos" level={3}>Terms of Service</SectionHeading>

        <div className="space-y-8">
          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.1 Definitions</h4>
            <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5">
              <dl className="space-y-3 text-sm">
                {[
                  ["\u201CCompany,\u201D \u201Cwe,\u201D \u201Cus,\u201D \u201Cour\u201D", "PrimeStyleAI."],
                  ["\u201CCustomer\u201D", "The business entity (e.g., retailer/merchant) that creates an account or is issued API credentials."],
                  ["\u201CAuthorized User\u201D", "Customer\u2019s employees/contractors authorized to access the Services."],
                  ["\u201CEnd User\u201D", "Customer\u2019s customers or site/app visitors interacting with Customer\u2019s properties."],
                  ["\u201CServices\u201D", "The PrimeStyleAI API, SDK, developer portal, documentation, and related tools."],
                  ["\u201COutput\u201D", "AI-generated images/visualizations or other results produced by the Services."],
                  ["\u201CCustomer Data\u201D", "Data submitted by Customer or End Users through Customer (including product images and user-uploaded images)."],
                ].map(([term, def]) => (
                  <div key={term} className="flex flex-col sm:flex-row sm:gap-4">
                    <dt className="font-medium text-gray-900 min-w-[200px] flex-shrink-0">{term}</dt>
                    <dd className="text-gray-600">{def}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.2 Eligibility and Authority</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              The Services are offered strictly for business use. By registering or using the Services, you represent and warrant that you are at least 18 years old and have authority to bind the Customer to these Terms. If you use the Services on behalf of Customer, you do so as Customer&apos;s agent, and Customer is responsible for your acts and omissions.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.3 Account Registration; Credentials; Security</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Customer is responsible for all activity under its account and credentials, including API keys.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Customer must protect credentials using industry-standard practices, including access controls, secret management, and rotation.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Customer must promptly notify us of any suspected unauthorized access or security incident.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.4 License and Use of the Services</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              Subject to these Terms and any applicable order form or pilot agreement, PrimeStyleAI grants Customer a limited, non-exclusive, non-transferable, revocable license during the applicable term to access and use the Services solely for Customer&apos;s internal business purposes and solely as integrated into Customer&apos;s owned/controlled digital properties.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.5 Acceptable Use and Prohibited Activities</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>No unlawful use; no use that violates privacy, consumer protection, advertising, or intellectual property laws.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>No reverse engineering, decompiling, scraping, or attempting to extract source code, model weights, prompts, or underlying system design.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>No circumvention of rate limits, access controls, or safety filters.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>No submission of content involving minors, explicit sexual content, or illegal/violent/hate content.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>No use to create deepfakes of real persons without authorization or in a misleading manner.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.6 AI Output Disclaimer; No Sizing or Fit Guarantee</h4>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-gray-700 text-sm leading-relaxed">
                Outputs are simulated AI-generated representations. Outputs may not accurately reflect real-world garment fit, sizing, drape, color, texture, pattern alignment, lighting, or other attributes. The Services do not provide professional fitting, tailoring, medical, or biometric services. Customer remains solely responsible for product information, sizing charts, advertising claims, and all customer-facing representations.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.7 No Performance Guarantees; No Reliance</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              We do not guarantee any business outcome, including conversion lift, revenue impact, return reduction, or customer satisfaction. Any projections, examples, or pilot modeling are illustrative only. Customer agrees not to rely on the Services or Outputs for any purpose other than evaluation and permitted business use and assumes all risk of use.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.8 Beta Features; Availability; Third-Party Dependencies</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              Some features may be labeled beta/preview and are provided as-is. Service performance may vary and may be affected by third-party infrastructure and AI providers. We may modify, suspend, or discontinue features at any time.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.9 Fees; Usage; Taxes</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              Fees (if any) are governed by an order form, pilot agreement, or separate commercial agreement. Unless otherwise specified, fees are non-refundable. Customer is responsible for applicable taxes, duties, and similar governmental assessments, excluding taxes on our income.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.10 Intellectual Property; Feedback</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>We retain all right, title, and interest in the Services, including all software, models, algorithms, documentation, and improvements.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Customer retains rights in Customer Data. Customer grants us a limited license to process Customer Data to provide the Services.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>If Customer provides feedback, Customer grants us a perpetual, worldwide, royalty-free license to use and incorporate feedback without obligation.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.11 Confidentiality</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              Each party may receive the other&apos;s Confidential Information. Each party will protect the other&apos;s Confidential Information using reasonable care and will use it only to perform under these Terms or the applicable agreement. Obligations do not apply to information that is public without breach, independently developed, or lawfully obtained from a third party.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.12 Suspension and Termination</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>We may suspend or terminate access immediately for violation of these Terms, suspected abuse, security risk, or legal compliance reasons.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Upon termination, Customer must stop using the Services and delete stored credentials and any non-public documentation we provided (except as required for records).</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.13 Disclaimer of Warranties</h4>
            <div className="rounded-xl border border-gray-200 bg-[#FFFFFF] p-5">
              <p className="text-gray-600 text-xs leading-relaxed uppercase tracking-wide">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICES AND OUTPUTS ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE,&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ACCURACY OR RELIABILITY OF OUTPUTS.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.14 Limitation of Liability</h4>
            <div className="rounded-xl border border-gray-200 bg-[#FFFFFF] p-5">
              <p className="text-gray-600 text-xs leading-relaxed uppercase tracking-wide">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW: (A) IN NO EVENT WILL PRIMESTYLEAI BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST REVENUE, BUSINESS INTERRUPTION, OR LOSS OF GOODWILL; AND (B) PRIMESTYLEAI&apos;S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THE SERVICES OR THESE TERMS WILL NOT EXCEED THE GREATER OF (I) USD $100 OR (II) THE FEES PAID BY CUSTOMER TO PRIMESTYLEAI FOR THE SERVICES IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.15 Indemnification by Customer</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              Customer will defend, indemnify, and hold harmless PrimeStyleAI and its officers, directors, employees, and agents from and against any third-party claims, damages, liabilities, and expenses (including reasonable attorneys&apos; fees) arising from: (a) Customer Data; (b) Customer&apos;s products, sizing, descriptions, marketing claims, or sales practices; (c) Customer&apos;s relationship with End Users (including returns/refunds); (d) Customer&apos;s violation of applicable law; or (e) Customer&apos;s misuse of the Services.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.16 Compliance; Export; Sanctions</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              Customer will comply with all applicable laws. Customer represents it is not subject to sanctions and will not use or permit use of the Services in violation of U.S. export controls or sanctions laws, including by providing access to restricted parties or jurisdictions.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.17 Governing Law; Arbitration; Class Action Waiver</h4>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              These Terms are governed by the laws of the State of California, USA, without regard to conflict-of-law rules. Any dispute arising out of or relating to these Terms or the Services shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) in Orange County, California, in English, before a single arbitrator.
            </p>
            <div className="rounded-xl border border-gray-200 bg-[#FFFFFF] p-5">
              <p className="text-gray-600 text-xs leading-relaxed uppercase tracking-wide">
                EACH PARTY WAIVES THE RIGHT TO A JURY TRIAL AND AGREES THAT CLAIMS MAY BE BROUGHT ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.
              </p>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mt-3">
              Notwithstanding the foregoing, either party may seek injunctive relief to protect its Confidential Information or intellectual property.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">1.18 Changes to the Terms</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              We may update these Terms from time to time. If changes are material, we will post the updated Terms with a new &ldquo;Last Updated&rdquo; date. Continued use of the Services after changes become effective constitutes acceptance.
            </p>
          </div>
        </div>

        <LegalContactBlock />
      </div>

      <div className="border-t border-gray-200/50 mt-12" />

      {/* ── Privacy Policy ── */}
      <div id="legal-privacy" className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="legal-privacy" level={3}>Privacy Policy</SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-8">
          This Privacy Policy describes how PrimeStyleAI processes information in connection with the Services.
          In most cases, Customer is the data controller for End User data collected on Customer&apos;s properties,
          and PrimeStyleAI acts as a data processor solely to generate Outputs and operate the Services.
        </p>

        <div className="space-y-8">
          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.1 Data We Process</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Product images and product metadata provided by Customer.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>User-uploaded images and associated request metadata submitted through Customer&apos;s integration (processed transiently).</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Technical logs and usage data (e.g., API calls, timestamps, error logs, IP address, device/browser information) for security and performance.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Account and billing data for Authorized Users (name, business email, role) as needed to operate the developer portal.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.2 How We Use Data</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Provide and operate the Services (render Outputs, authenticate sessions, prevent abuse).</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Maintain security, rate limiting, and fraud prevention.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Monitor reliability and improve performance (aggregated analytics).</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Comply with legal obligations and enforce our Terms.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.3 Legal Bases (GDPR/UK GDPR)</h4>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { basis: "Contractual Necessity", article: "Art. 6(1)(b)", desc: "Customer account administration and providing the Services." },
                { basis: "Legitimate Interests", article: "Art. 6(1)(f)", desc: "Security, abuse prevention, and service improvement." },
                { basis: "Legal Obligation", article: "Art. 6(1)(c)", desc: "Where applicable by law." },
              ].map((item) => (
                <div key={item.article} className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-4">
                  <p className="text-xs text-[#2154EF] font-mono mb-1">{item.article}</p>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{item.basis}</p>
                  <p className="text-xs text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.4 Data Retention</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              User-uploaded images are intended to be processed transiently for rendering and are not stored persistently by default. We retain technical logs for a limited period necessary for security, troubleshooting, and compliance (typical range: 30&ndash;180 days), unless a longer period is required by law or agreed in writing. Customer may request details of current retention settings.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.5 Sharing and Subprocessors</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              We may share data with service providers (subprocessors) that help us provide the Services, such as cloud hosting providers and AI infrastructure providers. We require subprocessors to protect data through contractual obligations. A current list of subprocessors may be provided upon request or via a DPA exhibit.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.6 International Transfers</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              We are based in the United States and may process data in the U.S. and other jurisdictions where we or our subprocessors operate. Where required for transfers from the EEA/UK/Switzerland, we will use appropriate safeguards such as Standard Contractual Clauses (SCCs) and supplementary measures, typically through a Data Processing Addendum (DPA).
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.7 Security</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              We implement reasonable administrative, technical, and organizational measures designed to protect data, including encryption in transit (HTTPS), access controls, and monitoring. No security measure is perfect; therefore, we cannot guarantee absolute security.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.8 End User Rights</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              Because Customer is typically the controller, End Users should direct privacy requests to the Customer. Where PrimeStyleAI is directly responsible under applicable law, data subjects may request access, correction, deletion, restriction, or portability.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.9 California Privacy (CCPA/CPRA)</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              PrimeStyleAI does not sell personal information as defined under CCPA/CPRA. California residents may have rights to know, delete, and correct personal information. Because PrimeStyleAI generally acts as a service provider/processor for Customer, requests should be submitted to the Customer first. Authorized Users may contact us for account-related data requests.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">2.10 Children&apos;s Data</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              The Services are intended for business use and are not directed to children. Customer must not knowingly submit personal data of children to the Services.
            </p>
          </div>
        </div>

        <LegalContactBlock />
      </div>

      <div className="border-t border-gray-200/50 mt-12" />

      {/* ── Cookie Policy ── */}
      <div id="legal-cookies" className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="legal-cookies" level={3}>Cookie Policy</SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-6">
          PrimeStyleAI uses cookies and similar technologies primarily to operate the developer portal and maintain security.
        </p>

        <div className="space-y-8">
          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">3.1 Types of Cookies We Use</h4>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { type: "Essential", desc: "Required for authentication, session management, and security.", required: true },
                { type: "Functional", desc: "Remember preferences (if enabled).", required: false },
                { type: "Analytics", desc: "May be used in the future to understand portal usage (optional and configurable).", required: false },
              ].map((cookie) => (
                <div key={cookie.type} className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900">{cookie.type}</p>
                    {cookie.required && (
                      <span className="text-[10px] bg-[#2154EF]/20 text-[#2154EF] px-2 py-0.5 rounded-full">Required</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{cookie.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">3.2 How to Control Cookies</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              You can control cookies through your browser settings. Disabling essential cookies may prevent the developer portal from functioning properly.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200/50 mt-12" />

      {/* ── GDPR Compliance ── */}
      <div id="legal-gdpr" className="scroll-mt-14 lg:scroll-mt-24 mt-12">
        <SectionHeading id="legal-gdpr" level={3}>GDPR Compliance</SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed mb-6">
          PrimeStyleAI is designed with privacy-by-design principles. In most cases, Customer is the data controller and PrimeStyleAI acts as a processor. We support execution of a Data Processing Addendum (DPA), including Standard Contractual Clauses where appropriate.
        </p>

        <div>
          <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">4.1 Processor Commitments</h4>
          <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5">
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Process personal data only on Customer&apos;s documented instructions.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Implement reasonable security measures.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Assist Customer with data subject rights requests as applicable.</li>
              <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Notify Customer without undue delay upon becoming aware of a confirmed personal data breach.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// Section: Data Processing Addendum (DPA)
// ═══════════════════════════════════════════════════════════

export function DpaSection() {
  return (
    <section id="dpa">
      <SectionHeading id="dpa">Data Processing Addendum</SectionHeading>

      <p className="text-gray-700 text-lg leading-relaxed mb-4">
        This Data Processing Addendum (&ldquo;DPA&rdquo;) forms part of the agreement between
        PrimeStyleAI (&ldquo;Processor&rdquo;) and the Customer (&ldquo;Controller&rdquo;) for the provision of the Services.
      </p>
      <p className="text-gray-600 text-sm leading-relaxed mb-10">
        If there is a conflict between the DPA and the main agreement, the DPA controls for data protection matters.
      </p>

      {/* ── 1. Roles & Scope ── */}
      <div id="dpa-scope" className="scroll-mt-14 lg:scroll-mt-24">
        <SectionHeading id="dpa-scope" level={3}>1. Roles &amp; Scope</SectionHeading>

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            <strong className="text-gray-900">1.1 Controller and Processor.</strong> Customer is the Controller of personal data processed via the Services. PrimeStyleAI acts as the Processor.
          </p>
          <p>
            <strong className="text-gray-900">1.2 Purpose.</strong> Processor will process personal data only to provide the Services (render Outputs, secure the platform, and operate the developer portal).
          </p>
          <p>
            <strong className="text-gray-900">1.3 Instructions.</strong> Customer instructs Processor to process personal data as necessary to provide the Services and as documented in the API/SDK documentation and this DPA.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 2. Details of Processing ── */}
      <div id="dpa-processing" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="dpa-processing" level={3}>2. Details of Processing</SectionHeading>

        <p className="text-gray-600 text-sm mb-4">Annex 1 describes the subject matter, duration, nature and purpose of processing, types of personal data, and categories of data subjects.</p>

        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Annex 1</h4>
          <dl className="space-y-3 text-sm">
            {[
              ["Subject matter", "AI-powered image rendering for virtual try-on outputs."],
              ["Duration", "For the term of the agreement and as needed for transient processing."],
              ["Nature of processing", "Receiving, transforming, and generating image outputs; logging for security and performance."],
              ["Purpose", "Provide the Services; prevent abuse; ensure reliability."],
              ["Data subjects", "Customer\u2019s end users and Customer\u2019s authorized users."],
              ["Types of data", "User-uploaded images; product images; technical identifiers; account emails; logs."],
            ].map(([term, def]) => (
              <div key={term} className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-medium text-[#2154EF] min-w-[180px] flex-shrink-0">{term}</dt>
                <dd className="text-gray-600">{def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 3. Processor Obligations ── */}
      <div id="dpa-obligations" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="dpa-obligations" level={3}>3. Processor Obligations</SectionHeading>

        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Process personal data only on documented instructions from Customer, unless required by law.</li>
          <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Ensure persons authorized to process personal data are bound by confidentiality obligations.</li>
          <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Implement appropriate technical and organizational measures to protect personal data.</li>
          <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Assist Customer with responding to data subject requests, taking into account the nature of processing.</li>
          <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Assist Customer with DPIAs and consultations with regulators to the extent required and reasonably available.</li>
        </ul>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 4. Security Measures ── */}
      <div id="dpa-security" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="dpa-security" level={3}>4. Security Measures</SectionHeading>

        <p className="text-gray-600 text-sm mb-4">Processor maintains reasonable measures appropriate to the risk. Annex 2 lists baseline controls.</p>

        <div className="rounded-xl border border-gray-200 bg-[#F9FAFB] p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Annex 2 &mdash; Baseline Security Controls</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Encryption in transit (HTTPS/TLS).</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Access controls and least-privilege administrative access.</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Credential and key management practices (rotation recommended).</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Monitoring, logging, and abuse prevention controls.</li>
            <li className="flex gap-2"><span className="text-[#2154EF] mt-1">&bull;</span>Separation of environments where feasible (e.g., dev/prod).</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 5. Subprocessors ── */}
      <div id="dpa-subprocessors" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="dpa-subprocessors" level={3}>5. Subprocessors</SectionHeading>

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Customer authorizes Processor to engage subprocessors to provide the Services (e.g., cloud hosting and AI infrastructure providers). Processor will impose data protection obligations on subprocessors consistent with this DPA and remains responsible for subprocessors&apos; performance.
          </p>
          <p>
            Processor will provide an up-to-date list of subprocessors upon request or via an attached schedule. Customer may object to a new subprocessor on reasonable data protection grounds by providing written notice within ten (10) days of notice.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 6. International Transfers ── */}
      <div id="dpa-transfers" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="dpa-transfers" level={3}>6. International Transfers</SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed">
          Where personal data originating in the EEA/UK/Switzerland is transferred to a country without an adequacy decision, the Parties will implement appropriate safeguards, such as the EU Standard Contractual Clauses (SCCs) and/or the UK Addendum, typically incorporated by reference through this DPA or an exhibit.
        </p>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 7. Personal Data Breach ── */}
      <div id="dpa-breach" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="dpa-breach" level={3}>7. Personal Data Breach</SectionHeading>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-gray-700 text-sm leading-relaxed">
            Processor will notify Customer without undue delay after becoming aware of a confirmed personal data breach affecting the Services. Processor will provide information reasonably necessary for Customer to meet any breach notification obligations.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 8. Deletion & Return ── */}
      <div id="dpa-deletion" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="dpa-deletion" level={3}>8. Deletion &amp; Return</SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed">
          Upon termination of the Services, Processor will delete or return personal data as requested by Customer, subject to applicable law and reasonable backups/archival practices. Transient user images are not intended to be stored persistently by default.
        </p>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 9. Audits ── */}
      <div id="dpa-audits" className="scroll-mt-14 lg:scroll-mt-24 mt-10">
        <SectionHeading id="dpa-audits" level={3}>9. Audits</SectionHeading>

        <p className="text-gray-700 text-sm leading-relaxed">
          Upon reasonable prior notice and no more than once annually, Customer may audit Processor&apos;s compliance with this DPA to the extent necessary and proportionate, subject to confidentiality and security constraints. Processor may satisfy audit requests by providing summaries of controls, third-party reports (if available), or other reasonable evidence of compliance.
        </p>
      </div>

      <div className="border-t border-gray-200/50 mt-10" />

      {/* ── 10. Liability ── */}
      <div className="mt-10">
        <h4 className="text-sm font-semibold text-[#2154EF] uppercase tracking-wide mb-3">10. Liability</h4>
        <p className="text-gray-700 text-sm leading-relaxed">
          Each Party&apos;s liability under this DPA is subject to the limitations of liability in the main agreement, unless prohibited by applicable law.
        </p>
      </div>

      <LegalContactBlock />
    </section>
  );
}
