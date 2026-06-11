import type { MetadataRoute } from "next";

const SITE_URL = "https://primestyleai.com";

const publicRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.8 },
  { path: "/demo/products", changeFrequency: "weekly", priority: 0.8 },
  { path: "/help-center", changeFrequency: "monthly", priority: 0.6 },
  { path: "/pricing-policy", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/gdpr-ccpa-compliance", changeFrequency: "yearly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
