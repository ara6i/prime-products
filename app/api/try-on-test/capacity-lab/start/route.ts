import { NextResponse, type NextRequest } from "next/server";
import { hasCapacityLabAccess } from "../_lib/auth";
import { createCapacityRun } from "../_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await hasCapacityLabAccess(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const snapshot = createCapacityRun(body);
    return NextResponse.json({ runId: snapshot.runId, snapshot }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to start capacity run";
    return NextResponse.json({ message }, { status: 400 });
  }
}
