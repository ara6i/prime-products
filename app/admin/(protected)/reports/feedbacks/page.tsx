import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminFeedbacksPage() {
  redirect("/admin/customers/feedbacks");
}
