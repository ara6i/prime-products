import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { TeacherProofLab } from "./TeacherProofLab";
import {
  getTeacherProofPeople,
  getTeacherProofSelection,
} from "./teacherProof.server";

export const metadata = {
  title: "WEAR 3D Teacher Proof — PrimeStyleAI Test Lab",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();
  const [people, selection] = await Promise.all([
    getTeacherProofPeople(),
    getTeacherProofSelection(),
  ]);
  return (
    <div className="min-h-screen bg-[#020617]">
      <TabNav />
      <TeacherProofLab people={people} selection={selection} />
    </div>
  );
}
