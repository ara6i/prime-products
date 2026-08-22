import type { NextRequest } from "next/server";
import { hasCapacityLabAccess } from "@/app/api/try-on-test/capacity-lab/_lib/auth";
import { isAllowedTeacherImageKey, readTeacherImage } from "@/app/try-on-test/wear-cpu-progress/wearCpuProgress.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await hasCapacityLabAccess(request))) return new Response(null, { status: 404 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!isAllowedTeacherImageKey(key)) return new Response(null, { status: 404 });
  try {
    const image = await readTeacherImage(key);
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
