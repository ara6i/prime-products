import { Toaster } from "sonner";
import { TabNav } from "../components/TabNav";
import { CapacityLabPage } from "./CapacityLabPage";

export const metadata = {
  title: "Capacity Lab — PrimeStyleAI",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TabNav />
      <CapacityLabPage />
      <Toaster richColors position="top-right" />
    </div>
  );
}
