import type { Metadata } from "next";
import { DressingRoomExperience } from "./components/DressingRoomExperience";

export const metadata: Metadata = {
  title: "Dressing Room · PrimeStyleAI Shop",
  description:
    "Build, arrange, and refine a complete look on the PrimeStyleAI infinite dressing canvas.",
};

export default function DressingRoomPage() {
  return <DressingRoomExperience />;
}
