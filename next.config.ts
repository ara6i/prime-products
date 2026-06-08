import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const PREVIEW = "https://preview.myaifitting.com";
const siteAuthEnabled = process.env.PRIME_PRODUCTS_SITE_AUTH_ENABLED === "true";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "ali.a.yximgs.com" },
      { protocol: "https", hostname: "s15-kling.klingai.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "images.bloomingdalesassets.com" },
      { protocol: "https", hostname: "image.menswearhouse.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: `${PREVIEW}/developer/dashboard`, permanent: false },
      { source: "/dashboard/:path*", destination: `${PREVIEW}/developer/dashboard/:path*`, permanent: false },
      ...(siteAuthEnabled
        ? []
        : [{ source: "/login", destination: `${PREVIEW}/developer/login`, permanent: false }]),
    ];
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${backend}/api/:path*`,
        },
      ],
    };
  },
};

const isVercel =
  process.env.VERCEL === "1" ||
  Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_URL);
const sentryEnabled =
  (process.env.SENTRY_FRONTEND_ENABLED ?? process.env.NEXT_PUBLIC_ENABLE_FRONTEND_SENTRY) === "true" &&
  !isVercel &&
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, { silent: true, disableLogger: true })
  : nextConfig;
