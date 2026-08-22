import type { NextRequest } from "next/server";
import { hasCapacityLabAccess } from "@/app/api/try-on-test/capacity-lab/_lib/auth";
import { getRandomWearTeacherCards } from "@/app/try-on-test/wear-cpu-progress/wearCpuProgress.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await hasCapacityLabAccess(request))) return new Response(null, { status: 404 });
  const requested = Number(new URL(request.url).searchParams.get("count") ?? 4);
  const count = Number.isFinite(requested) ? Math.max(1, Math.min(8, Math.round(requested))) : 4;
  try {
    const cards = await getRandomWearTeacherCards(count);
    return Response.json({ ok: true, cards }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not load random completed cards.",
    }, { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
}
