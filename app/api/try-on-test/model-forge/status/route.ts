import { getModelForgeTrainingStatus } from "@/app/try-on-test/model-forge/lib/modelForgeProgress";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getModelForgeTrainingStatus(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
