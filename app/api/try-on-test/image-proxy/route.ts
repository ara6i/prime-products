import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS = new Set([
  "res.cloudinary.com",
  "cdn.shopify.com",
  "cdn-images.farfetch-contents.com",
  "image.menswearhouse.com",
  "images.bloomingdalesassets.com",
  "images.asos-media.com",
  "shopcdnpro.grainajz.com",
]);

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ message: "Missing image URL" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ message: "Invalid image URL" }, { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(target.hostname)) {
    return NextResponse.json({ message: "Image host is not allowed" }, { status: 400 });
  }

  const response = await fetch(target, { redirect: "follow", cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ message: `Image fetch failed (${response.status})` }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ message: "URL did not return an image" }, { status: 415 });
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ message: "Image is too large" }, { status: 413 });
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ message: "Image is too large" }, { status: 413 });
  }

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
