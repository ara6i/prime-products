import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Dressing Room · PrimeStyleAI Shop",
  description:
    "Build, arrange, and refine a complete look on the PrimeStyleAI infinite dressing canvas.",
};

export default function DressingRoomPage() {
  notFound();
}
