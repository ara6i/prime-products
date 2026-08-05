import { PdpStudioLoginForm } from "../../../login/components/PdpStudioLoginForm";

export function PdpStudioWorkspaceAuthGate() {
  return (
    <div
      data-pdp-auth-gate
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-studio-auth-title"
      className="fixed inset-0 z-[var(--z-pdp-modal)] grid place-items-center overflow-y-auto bg-[var(--color-pdp-paper)] p-3 sm:p-6"
    >
      <div className="w-full max-w-[31rem] rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-4 py-8 shadow-[var(--shadow-pdp-popover)] sm:px-10 sm:py-10">
        <div className="text-center">
          <h2
            id="pdp-studio-auth-title"
            className="min-w-0 text-[var(--text-pdp-lg)] font-medium leading-tight text-[var(--color-pdp-ink)] [overflow-wrap:anywhere]"
          >
            Create product-ready images
          </h2>
          <p className="mt-[var(--space-pdp-sm)] text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
            Log in or sign up to continue using the studio
          </p>
        </div>

        <div className="mt-[var(--space-pdp-lg)]">
          <PdpStudioLoginForm compact />
        </div>
      </div>
    </div>
  );
}
