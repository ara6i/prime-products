import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminIpLimitsRoute() {
  redirect("/admin/settings#ip-limits");
}
