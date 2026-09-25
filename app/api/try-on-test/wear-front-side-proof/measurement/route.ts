import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { wearSideCatalogPerson } from "@/app/api/try-on-test/wear-side-selector/_lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR measurements are private Test Lab only." }, { status: 403 });
  }
  const scanId = new URL(request.url).searchParams.get("scan")?.trim().toUpperCase() ?? "";
  const person = await wearSideCatalogPerson(scanId);
  if (!person) return NextResponse.json({ error: "Choose a valid WEAR person." }, { status: 404 });
  return NextResponse.json({
    ok: true,
    person: {
      scanId: person.scanId,
      gender: person.gender,
      heightCm: person.heightCm,
      weightKg: person.weightKg,
      rows: Object.fromEntries(["waist", "hips"].flatMap((part) => {
        const row = person.rows[part as "waist" | "hips"];
        return row ? [[part, {
          frontWidthCm: row.frontWidthCm,
          sideDepthCm: row.sideDepthCm,
          tapeCm: row.tapeCm,
        }]] : [];
      })),
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
