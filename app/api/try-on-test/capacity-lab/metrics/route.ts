import { NextResponse, type NextRequest } from "next/server";
import type { CapacityTargetId } from "@/app/try-on-test/capacity-lab/types";
import { hasCapacityLabAccess } from "../_lib/auth";
import { readHostMetrics } from "../_lib/hostMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTargetId(value: string | null): CapacityTargetId {
  return value === "local" || value === "live" || value === "test" || value === "capacity" ? value : "capacity";
}

export async function GET(request: NextRequest) {
  if (!(await hasCapacityLabAccess(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const targetId = parseTargetId(request.nextUrl.searchParams.get("targetId"));
  const metrics = await readHostMetrics(targetId);
  return NextResponse.json(metrics, { status: 200 });
}
