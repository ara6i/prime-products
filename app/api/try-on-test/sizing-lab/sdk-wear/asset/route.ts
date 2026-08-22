import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) return new NextResponse("Private Test Lab only", { status: 403 });
  const scanId = new URL(request.url).searchParams.get("scanId") ?? "";
  if (!/^[A-Z]{2}-\d{4}-A$/.test(scanId)) return new NextResponse("Invalid scan", { status: 400 });
  try {
    const index = JSON.parse(await readFile(path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", "index.json"), "utf8")) as { people: Array<{ scanId: string; imagePath: string | null; role: string }> };
    const person = index.people.find((candidate) => candidate.scanId === scanId && candidate.role === "test");
    if (!person?.imagePath) return new NextResponse("Asset unavailable", { status: 404 });
    const image = await readFile(path.join(process.cwd(), person.imagePath));
    return new NextResponse(image, { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new NextResponse("Asset unavailable", { status: 404 });
  }
}
