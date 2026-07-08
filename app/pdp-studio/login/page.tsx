import { redirect } from "next/navigation";
import { getPdpStudioMe } from "@/app/pdp-studio/shared/pdpStudioAuthService";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PDP Studio Login - PrimeStyleAI",
};

export default async function PdpStudioLoginPage() {
  const me = await getPdpStudioMe();
  redirect(me ? "/pdp-studio" : "/pdp-studio");
}
