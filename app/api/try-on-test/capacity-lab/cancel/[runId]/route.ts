import { NextResponse, type NextRequest } from "next/server";
import { hasCapacityLabAccess } from "../../_lib/auth";
import { cancelCapacityRun } from "../../_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ runId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await hasCapacityLabAccess(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await context.params;
  const snapshot = cancelCapacityRun(runId);
  if (!snapshot) return NextResponse.json({ message: "Run not found" }, { status: 404 });
  return NextResponse.json(snapshot, { status: 200 });
}
