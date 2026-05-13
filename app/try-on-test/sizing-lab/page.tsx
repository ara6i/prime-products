import { Toaster } from "sonner";
import { TabNav } from "../components/TabNav";
import { SizingLabPage } from "./SizingLabPage";

export const metadata = {
  title: "AI Sizing Lab — PrimeStyleAI",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TabNav />
      <SizingLabPage />
      <Toaster richColors position="top-right" />
    </div>
  );
}
