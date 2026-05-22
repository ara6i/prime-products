"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import type { CodeTab } from "../types";

interface CodePanelProps {
  productImage: string;
}

const TABS: { id: CodeTab; label: string }[] = [
  { id: "react", label: "React / Next.js" },
  { id: "npm", label: "Install" },
  { id: "script", label: "Env Setup" },
];

function getCode(tab: CodeTab, productImage: string): string {
  switch (tab) {
    case "react":
      return `import { PrimeStyleTryon } from '@primestyleai/tryon/react';

function ProductPage({ product }) {
  return (
    <div>
      <h1>{product.name}</h1>

      <PrimeStyleTryon
        productImage="${productImage}"
        buttonText="Try It On"
        buttonStyles={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: '10px',
        }}
        modalStyles={{
          backgroundColor: '#1a1a1a',
          textColor: '#ffffff',
        }}
        onComplete={(result) => {
          console.log('Result:', result.imageUrl);
        }}
      />
    </div>
  );
}`;

    case "npm":
      return `# Install the SDK
npm install @primestyleai/tryon

# or
yarn add @primestyleai/tryon

# or
pnpm add @primestyleai/tryon`;

    case "script":
      return `# No browser API key is required for the PrimeStyle demo.
# Keep PrimeStyle keys server-side only.

# Optional: custom API URL for local/staging demos
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Production uses the PrimeStyle backend configuration.`;
  }
}

export function CodePanel({ productImage }: CodePanelProps) {
  const [activeTab, setActiveTab] = useState<CodeTab>("react");
  const [copied, setCopied] = useState(false);

  const code = getCode(activeTab, productImage);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border-light bg-white overflow-hidden sticky top-8 lg:top-[1vw]">
      {/* Header */}
      <div className="px-4 py-3 lg:px-[0.8vw] lg:py-[0.5vw] border-b border-border-light">
        <h3 className="text-sm lg:text-[0.9vw] font-semibold text-text-heading">Integration Code</h3>
        <p className="text-xs lg:text-[0.7vw] text-text-hint mt-0.5">
          3 steps: install, set env, use component
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-light">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2.5 lg:px-[0.6vw] lg:py-[0.4vw] text-xs lg:text-[0.7vw] font-medium transition-colors ${
              activeTab === tab.id
                ? "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5"
                : "text-text-body hover:text-text-heading"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="relative rounded-lg mx-4 my-3 lg:mx-[0.8vw] lg:my-[0.5vw] bg-dev-code-bg border border-dev-code-border overflow-hidden">
        <pre className="p-4 lg:p-[0.8vw] text-xs lg:text-[0.7vw] font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
          <code>{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 lg:top-[0.5vw] lg:right-[0.5vw] p-2 lg:p-[0.4vw] rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
          title="Copy code"
        >
          {copied ? (
            <Check className="size-4 lg:size-[0.9vw] text-green-400" />
          ) : (
            <Copy className="size-4 lg:size-[0.9vw]" />
          )}
        </button>
      </div>

      {/* Customization info */}
      <div className="px-4 py-3 lg:px-[0.8vw] lg:py-[0.5vw] border-t border-border-light space-y-3 lg:space-y-[0.4vw]">
        <h4 className="text-xs lg:text-[0.7vw] font-semibold text-text-heading">Customization</h4>
        <div className="space-y-2 lg:space-y-[0.3vw] text-xs lg:text-[0.7vw] text-text-body">
          <p>
            Pass <code className="text-brand-blue bg-brand-blue/10 px-1 rounded">buttonStyles</code> and{" "}
            <code className="text-brand-blue bg-brand-blue/10 px-1 rounded">modalStyles</code> props to customize appearance.
          </p>
          <p>
            Listen to <code className="text-brand-blue bg-brand-blue/10 px-1 rounded">onComplete</code>,{" "}
            <code className="text-brand-blue bg-brand-blue/10 px-1 rounded">onError</code>,{" "}
            <code className="text-brand-blue bg-brand-blue/10 px-1 rounded">onProcessing</code> callbacks.
          </p>
        </div>

        <div className="pt-2">
          <a
            href="/docs"
            className="inline-flex items-center gap-1.5 lg:gap-[0.2vw] text-xs lg:text-[0.7vw] text-brand-blue hover:underline font-medium"
          >
            Full Documentation
            <ExternalLink className="size-3 lg:size-[0.7vw]" />
          </a>
        </div>
      </div>

      {/* Get API Key CTA */}
      <div className="px-4 py-4 lg:px-[0.8vw] lg:py-[0.8vw] border-t border-brand-blue/10 bg-brand-blue/5">
        <a
          href="https://preview.myaifitting.com/developer/dashboard/keys"
          className="block w-full text-center py-2.5 lg:py-[0.4vw] rounded-lg bg-brand-blue text-white font-semibold text-sm lg:text-[0.9vw] hover:bg-brand-blue-dark transition"
        >
          Get Your API Key
        </a>
      </div>
    </div>
  );
}
