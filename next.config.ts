import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { existsSync } from "node:fs";
import path from "node:path";

const DEVELOPER_PORTAL = "https://myaifitting.com";
const creatorHostRedirectExclusions = [
  { type: "host" as const, value: "creators\\.primestyleai\\.com" },
  { type: "host" as const, value: "creators\\.localhost(?::\\d+)?" },
];
const siteAuthEnabled = process.env.PRIME_PRODUCTS_SITE_AUTH_ENABLED === "true";
const buildDistDir = process.env.PRIME_PRODUCTS_DIST_DIR || ".next";
const isCreatorStaticExport =
  process.env.PRIME_CREATOR_STATIC_EXPORT === "true";
const localWorkspaceRoot = path.resolve(process.cwd(), "..");
const localSdkRoot = process.env.PRIME_PRODUCTS_LOCAL_SDK_ROOT
  ? path.resolve(process.env.PRIME_PRODUCTS_LOCAL_SDK_ROOT)
  : path.join(localWorkspaceRoot, "primestyleai-tryon-sdk");
const localSdkReactEntry = path.join(localSdkRoot, "src/react/index.ts");
const localSdkReactAlias = path.relative(
  localWorkspaceRoot,
  localSdkReactEntry,
);
const useLocalSdkSource =
  process.env.PRIME_PRODUCTS_USE_PACKAGED_SDK !== "true" &&
  existsSync(localSdkReactEntry);

const nextConfig: NextConfig = {
  distDir: buildDistDir,
  // The creator release exports only the statically rendered influencer page.
  // Unrelated application routes can be type-checked separately without
  // blocking this isolated artifact.
  typescript: {
    ignoreBuildErrors: isCreatorStaticExport,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.6.123"],
  serverExternalPackages: ["onnxruntime-node"],
  ...(useLocalSdkSource ? { transpilePackages: ["@primestyleai/tryon"] } : {}),
  ...(useLocalSdkSource
    ? {
        turbopack: {
          root: localWorkspaceRoot,
          resolveAlias: {
            "@primestyleai/tryon/react": localSdkReactAlias,
          },
        },
        webpack(config) {
          config.resolve = config.resolve ?? {};
          config.resolve.alias = {
            ...(config.resolve.alias ?? {}),
            "@primestyleai/tryon/react": localSdkReactEntry,
          };
          return config;
        },
      }
    : {}),
  images: {
    unoptimized: isCreatorStaticExport,
    qualities: [75, 90],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "ali.a.yximgs.com" },
      { protocol: "https", hostname: "s15-kling.klingai.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "www.judybluejeans.com" },
      { protocol: "https", hostname: "www.ezenana.com" },
      { protocol: "https", hostname: "bibiclothing.com" },
      { protocol: "https", hostname: "www.hyfve.com" },
      { protocol: "https", hostname: "heimishusa.com" },
      { protocol: "https", hostname: "bombomusa.com" },
      { protocol: "https", hostname: "www.davidani.com" },
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "images.bloomingdalesassets.com" },
      { protocol: "https", hostname: "image.menswearhouse.com" },
      { protocol: "https", hostname: "ymijeans.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },
  async headers() {
    return [
      {
        source:
          "/media/global-shop/dressing-room/outfit-grid-gingham-79de5e5c.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: `${DEVELOPER_PORTAL}/developer/dashboard?preview=1`,
        permanent: false,
        missing: creatorHostRedirectExclusions,
      },
      {
        source: "/dashboard/:path*",
        destination: `${DEVELOPER_PORTAL}/developer/dashboard/:path*?preview=1`,
        permanent: false,
        missing: creatorHostRedirectExclusions,
      },
      ...(siteAuthEnabled
        ? []
        : [
            {
              source: "/login",
              destination: `${DEVELOPER_PORTAL}/developer/login?preview=1`,
              permanent: false,
              missing: creatorHostRedirectExclusions,
            },
          ]),
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
  Boolean(
    process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_URL,
  );
const sentryEnabled =
  (process.env.SENTRY_FRONTEND_ENABLED ??
    process.env.NEXT_PUBLIC_ENABLE_FRONTEND_SENTRY) === "true" &&
  !isVercel &&
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, { silent: true, disableLogger: true })
  : nextConfig;
