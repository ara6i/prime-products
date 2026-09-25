import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { loadLatestCommercialReport, COMMERCIAL_WORKBOOK } from "../_lib/commercialSizingReport";
import { isTestLabAvailableForHost, normalizeHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function localOnly(request: Request) {
  const host = request.headers.get("host");
  return isTestLabAvailableForHost(host) && ["localhost", "127.0.0.1", "::1"].includes(normalizeHost(host));
}

export async function GET(request: Request) {
  if (!localOnly(request)) return NextResponse.json({ ok: false, error: "This private report is available only in the local Test Lab." }, { status: 403, headers: PRIVATE_HEADERS });
  try {
    const loaded = await loadLatestCommercialReport();
    if (!loaded) return NextResponse.json({ ok: false, error: "No finalized 100-decision report is installed on the WEAR USB." }, { status: 404, headers: PRIVATE_HEADERS });
    const format = new URL(request.url).searchParams.get("format");
    if (format === "xlsx") {
      return new Response(await readFile(loaded.workbookPath), {
        headers: {
          ...PRIVATE_HEADERS,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${path.basename(COMMERCIAL_WORKBOOK)}"`,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return NextResponse.json({ ok: true, report: loaded.report, workbookFileName: COMMERCIAL_WORKBOOK }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Commercial report unavailable." }, { status: 409, headers: PRIVATE_HEADERS });
  }
}
