import {
  BookOpen,
  Zap,
  Key,
  Code2,
  Puzzle,
  BookMarked,
  CreditCard,
  LifeBuoy,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { NavSection } from "../types";

export const docsNavigation: NavSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    icon: BookOpen,
  },
  {
    id: "quick-start",
    title: "Quick Start",
    icon: Zap,
  },
  {
    id: "authentication",
    title: "Authentication",
    icon: Key,
    children: [
      { id: "auth-api-keys", title: "API Keys", parentId: "authentication" },
      { id: "auth-balance", title: "Try-On Balance", parentId: "authentication" },
    ],
  },
  {
    id: "api-reference",
    title: "API Reference",
    icon: Code2,
    children: [
      { id: "api-tryon-create", title: "POST /v1/tryon", parentId: "api-reference" },
      { id: "api-tryon-status", title: "GET /v1/tryon/status/:id", parentId: "api-reference" },
      { id: "api-tryon-stream", title: "SSE Stream", parentId: "api-reference" },
      { id: "api-upload", title: "Upload Image", parentId: "api-reference" },
      { id: "api-sizing-recommend", title: "POST /v1/sizing/recommend", parentId: "api-reference" },
      { id: "api-sizing-sizeguide", title: "POST /v1/sizing/sizeguide", parentId: "api-reference" },
      { id: "api-error-codes", title: "Error Codes", parentId: "api-reference" },
    ],
  },
  {
    id: "sdk",
    title: "React SDK",
    icon: Puzzle,
    children: [
      { id: "sdk-installation", title: "Installation", parentId: "sdk" },
      { id: "sdk-component", title: "Component & Props", parentId: "sdk" },
      { id: "sdk-customization", title: "Customization", parentId: "sdk" },
      { id: "sdk-callbacks", title: "Callbacks", parentId: "sdk" },
      { id: "sdk-env", title: "Environment Variables", parentId: "sdk" },
      { id: "sdk-i18n", title: "Internationalization (i18n)", parentId: "sdk" },
    ],
  },
  {
    id: "guides",
    title: "Guides",
    icon: BookMarked,
    children: [
      { id: "guide-shopify-app", title: "Shopify App", parentId: "guides" },
      { id: "guide-images", title: "Image Best Practices", parentId: "guides" },
      { id: "guide-loading", title: "Loading States", parentId: "guides" },
    ],
  },
  {
    id: "pricing",
    title: "Pricing",
    icon: CreditCard,
  },
  {
    id: "support",
    title: "Support",
    icon: LifeBuoy,
  },
  {
    id: "legal",
    title: "Legal",
    icon: Scale,
    children: [
      { id: "legal-tos", title: "Terms of Service", parentId: "legal" },
      { id: "legal-privacy", title: "Privacy Policy", parentId: "legal" },
      { id: "legal-cookies", title: "Cookie Policy", parentId: "legal" },
      { id: "legal-gdpr", title: "GDPR Compliance", parentId: "legal" },
    ],
  },
  {
    id: "dpa",
    title: "Data Processing",
    icon: ShieldCheck,
    children: [
      { id: "dpa-scope", title: "Roles & Scope", parentId: "dpa" },
      { id: "dpa-processing", title: "Details of Processing", parentId: "dpa" },
      { id: "dpa-obligations", title: "Processor Obligations", parentId: "dpa" },
      { id: "dpa-security", title: "Security Measures", parentId: "dpa" },
      { id: "dpa-subprocessors", title: "Subprocessors", parentId: "dpa" },
      { id: "dpa-transfers", title: "International Transfers", parentId: "dpa" },
      { id: "dpa-breach", title: "Data Breach", parentId: "dpa" },
      { id: "dpa-deletion", title: "Deletion & Return", parentId: "dpa" },
      { id: "dpa-audits", title: "Audits", parentId: "dpa" },
    ],
  },
];

export function getAllSectionIds(): string[] {
  const ids: string[] = [];
  for (const section of docsNavigation) {
    ids.push(section.id);
    if (section.children) {
      for (const child of section.children) {
        ids.push(child.id);
      }
    }
  }
  return ids;
}
