import { NextResponse, type NextRequest } from "next/server";
import { hasCapacityLabAccess } from "../../_lib/auth";
import { getCapacityRun } from "../../_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ runId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!(await hasCapacityLabAccess(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await context.params;
  const snapshot = getCapacityRun(runId);
  if (!snapshot) return NextResponse.json({ message: "Run not found" }, { status: 404 });
  return NextResponse.json(snapshot, { status: 200 });
}
