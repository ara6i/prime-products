import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { ComingSoonCard } from "@/app/admin/shared/components/ComingSoonCard";

export const dynamic = "force-dynamic";

export default function AdminReportsPage() {
  return (
    <AdminShell
      title="Reports"
      subtitle="Exportable summaries and scheduled email digests"
    >
      <ComingSoonCard title="Reports builder" />
    </AdminShell>
  );
}
