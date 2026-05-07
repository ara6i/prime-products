import { Toaster } from "sonner";
import { TryOnTestPage } from "./TryOnTestPage";

export const metadata = {
  title: "Try-On Test Lab — PrimeStyleAI",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TryOnTestPage />
      <Toaster richColors position="top-right" />
    </div>
  );
}
