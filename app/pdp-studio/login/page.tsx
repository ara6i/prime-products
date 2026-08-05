import { redirect } from "next/navigation";
import { getPdpStudioMe } from "@/app/pdp-studio/shared/pdpStudioAuthService";
import { PdpStudioLoginForm } from "./components/PdpStudioLoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PDP Studio Login - PrimeStyleAI",
};

export default async function PdpStudioLoginPage() {
  const me = await getPdpStudioMe();
  if (me) redirect("/pdp-studio");
  return <main className="grid min-h-screen place-items-center bg-[#f3f4f6] p-4"><section className="w-full max-w-md rounded-[20px] border border-[#dfe3ea] bg-white p-7 shadow-xl shadow-slate-900/5"><div className="mb-6"><span className="grid size-11 place-items-center rounded-full bg-[#111827] text-sm font-semibold text-white">P</span><h1 className="mt-5 text-2xl font-semibold tracking-[-.02em] text-[#111827]">Sign in to PDP Studio</h1><p className="mt-2 text-sm leading-6 text-[#64748b]">Create, review and publish product-ready images in your private Space.</p></div><PdpStudioLoginForm/></section></main>;
}
