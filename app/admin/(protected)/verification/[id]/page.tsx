import { notFound } from "next/navigation";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { approveVerificationAction, rejectVerificationAction } from "../actions";
import { VerificationRequestDetailPage } from "../components/VerificationRequestDetailPage";
import { mapVerificationRequest } from "../mappers/verificationCenterMapper";
import { fetchCustomerVerification } from "../services/verificationService";
import type { VerificationRawRequest } from "../types";

export const dynamic = "force-dynamic";

interface AdminVerificationDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVerificationDetailRoute({ params }: AdminVerificationDetailRouteProps) {
  const { id } = await params;
  let request: VerificationRawRequest;

  try {
    request = await fetchCustomerVerification(id);
  } catch {
    notFound();
  }

  const item = mapVerificationRequest(request);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/verification">
        <VerificationRequestDetailPage
          item={item}
          approveAction={approveVerificationAction}
          rejectAction={rejectVerificationAction}
        />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
