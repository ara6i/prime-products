import type { MetadataRoute } from "next";

const SITE_URL = "https://primestyleai.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/customer/dashboard/",
        "/customer/onboarding/",
        "/login",
        "/try-on-test/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
