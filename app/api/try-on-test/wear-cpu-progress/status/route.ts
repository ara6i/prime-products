import type { NextRequest } from "next/server";
import { hasCapacityLabAccess } from "@/app/api/try-on-test/capacity-lab/_lib/auth";
import { getWearCpuStatus } from "@/app/try-on-test/wear-cpu-progress/wearCpuProgress.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await hasCapacityLabAccess(request))) return new Response(null, { status: 404 });
  try {
    return Response.json(await getWearCpuStatus(), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not read the CPU worker status.",
    }, { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
}
