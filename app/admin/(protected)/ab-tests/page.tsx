import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { ComingSoonCard } from "@/app/admin/shared/components/ComingSoonCard";

export const dynamic = "force-dynamic";

export default function AdminABTestsPage() {
  return (
    <AdminShell title="A/B Tests" subtitle="Named experiments with statistical significance">
      <ComingSoonCard title="A/B test framework" />
    </AdminShell>
  );
}
