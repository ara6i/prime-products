import { notFound, redirect } from "next/navigation";
import { MerchantOnboardingClient } from "./components/MerchantOnboardingClient";
import { mapMerchantOnboarding } from "./mappers/onboardingMapper";
import { getMerchantOnboarding } from "./services/onboardingService";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";

export const dynamic = "force-dynamic";

export default async function MerchantOnboardingPage() {
  const me = await getCustomerMe();
  if (!me) redirect("/customer/login");
  if (me.role !== "merchant") notFound();
  if (await isCustomerOnboardingCompleted(me.username)) redirect("/customer/dashboard");

  const data = await getMerchantOnboarding();
  const onboarding = mapMerchantOnboarding(data);

  return <MerchantOnboardingClient onboarding={onboarding} />;
}
