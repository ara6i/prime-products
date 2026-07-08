import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const DATASET_ROOT = "/Users/arashsn/Downloads/Body Measurements Image Dataset";
const KAGGLE_OUTPUT_ROOT = "/Users/arashsn/Downloads/Body Shape Kaggle/output";
const ALLOWED_VIEWS = new Map([
  ["front", "front_img.jpg"],
  ["side", "side_img.jpg"],
]);

const EXTRA_IMAGES = new Map([
  ["kaggle-amanda-love", path.join(KAGGLE_OUTPUT_ROOT, "images/apple/amanda-love_2.jpg")],
  ["rustin", path.join(DATASET_ROOT, "extra/rustin/front_img.png")],
  ["arman", "/Users/arashsn/Projects/PrimeStyleAI/prime-products-capacity/public/capacity-fixtures/arman-model.jpg"],
]);

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") ?? "";
  if (source) {
    const filePath = EXTRA_IMAGES.get(source);
    if (!filePath) {
      return NextResponse.json({ message: "Invalid source" }, { status: 400 });
    }
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentTypeFor(filePath),
        "Cache-Control": "no-store",
      },
    });
  }

  const setId = request.nextUrl.searchParams.get("setId") ?? "";
  const view = request.nextUrl.searchParams.get("view") ?? "front";
  if (!/^\d+$/.test(setId)) {
    return NextResponse.json({ message: "Invalid setId" }, { status: 400 });
  }
  const fileName = ALLOWED_VIEWS.get(view);
  if (!fileName) {
    return NextResponse.json({ message: "Invalid view" }, { status: 400 });
  }

  const filePath = path.join(DATASET_ROOT, setId, fileName);
  const bytes = await readFile(filePath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
