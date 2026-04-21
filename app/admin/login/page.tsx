import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminMe } from "@/app/admin/shared/services/adminAuthService";
import { LoginForm } from "./components/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const me = await getAdminMe();
  if (me) redirect("/admin");

  return (
    <div className="min-h-screen bg-admin-surface-page flex items-center justify-center px-[var(--spacing-admin-content-x)] py-[var(--spacing-admin-content-y)] max-lg:px-4 max-lg:py-8">
      <div className="w-full max-w-[24vw] max-lg:max-w-sm flex flex-col items-center">
        <Image
          src="/images/landing/logo-navbar-transparent.png"
          alt="PrimeStyleAI"
          width={95}
          height={89}
          className="object-contain w-[3.333vw] h-[3.125vw] mb-[var(--spacing-admin-gap-md)] max-lg:w-14 max-lg:h-[52px] max-lg:mb-4"
          priority
        />

        <div className="w-full bg-admin-surface-card rounded-[var(--radius-admin-card)] shadow-admin-elevated p-[1.667vw] max-lg:rounded-2xl max-lg:p-6">
          <div className="flex flex-col items-center mb-[var(--spacing-admin-gap-lg)] max-lg:mb-5">
            <span className="text-[0.625vw] font-semibold tracking-[0.12em] text-brand-blue uppercase max-lg:text-[11px]">
              Admin
            </span>
            <h1 className="mt-[0.313vw] text-admin-lg font-semibold text-text-primary tracking-tight max-lg:mt-1 max-lg:text-xl">
              Sign in to continue
            </h1>
            <p className="mt-[0.313vw] text-admin-sm text-text-body text-center max-lg:mt-1.5 max-lg:text-sm">
              Restricted area for PrimeStyle operators.
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-[var(--spacing-admin-gap-md)] text-admin-xs text-text-hint max-lg:mt-4 max-lg:text-xs">
          Need access? Contact the PrimeStyle team.
        </p>
      </div>
    </div>
  );
}
