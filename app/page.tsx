import { headers } from "next/headers";
import { DeviceSwitch } from "@/app/shared/components/DeviceSwitch";
import { DeveloperLanding } from "./components/DeveloperLanding";
import { MobileDeveloperLanding } from "./components/MobileDeveloperLanding";

const MOBILE_UA_REGEX = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i;

export const metadata = {
  title: "PrimeStyle AI · The Decision Engine for fit",
  description:
    "AI sizing by photo, virtual try-on, and smart size recommendations — trained on your own size chart. Built for Shopify.",
};

export default async function DeveloperPage() {
  const headersList = await headers();
  const initialIsMobile = MOBILE_UA_REGEX.test(headersList.get("user-agent") ?? "");

  return (
    <DeviceSwitch
      initialIsMobile={initialIsMobile}
      desktop={<DeveloperLanding />}
      mobile={<MobileDeveloperLanding />}
    />
  );
}
