import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { MerchantOnboardingClient } from "./components/MerchantOnboardingClient";
import { mapMerchantOnboarding } from "./mappers/onboardingMapper";
import { getMerchantOnboarding } from "./services/onboardingService";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";

export const dynamic = "force-dynamic";

export default async function MerchantOnboardingPage() {
  const me = await getCustomerMe();
  if (!me) redirect("/customer/login");
  if (me.role !== "merchant") redirect("/customer/login");
  if (await isCustomerOnboardingCompleted(me.username)) redirect("/customer/dashboard");

  const data = await getMerchantOnboarding();
  const onboarding = mapMerchantOnboarding(data);

  return (
    <>
      <MerchantOnboardingClient onboarding={onboarding} />
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          className: "rounded-2xl",
          style: {
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(33,84,239,0.22)",
            boxShadow: "0 16px 44px rgba(33,84,239,0.16)",
            width: "min(92vw, 420px)",
          },
        }}
      />
    </>
  );
}
