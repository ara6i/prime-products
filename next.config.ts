import type { NextConfig } from "next";

const PREVIEW = "https://preview.myaifitting.com";

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
      { source: "/login", destination: `${PREVIEW}/developer/login`, permanent: false },
    ];
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
