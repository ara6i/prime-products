import { PdpStudioLoginForm } from "../../../login/components/PdpStudioLoginForm";

export function PdpStudioWorkspaceAuthGate() {
  return (
    <div
      data-pdp-auth-gate
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-studio-auth-title"
      className="fixed inset-0 z-[var(--z-pdp-modal)] grid place-items-center overflow-y-auto bg-[var(--color-pdp-ink)]/25 p-[var(--space-pdp-xs)] sm:p-[var(--space-pdp-lg)]"
    >
      <div className="w-full max-w-[31rem] rounded-[var(--radius-pdp-lg)] bg-[var(--color-pdp-surface)] px-[var(--space-pdp-sm)] py-[var(--space-pdp-xl)] shadow-[var(--shadow-pdp-overlay)] sm:px-[var(--space-pdp-2xl)]">
        <div className="text-center">
          <h2
            id="pdp-studio-auth-title"
            className="min-w-0 text-[var(--text-pdp-lg)] font-bold leading-tight text-[var(--color-pdp-ink)] [overflow-wrap:anywhere]"
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
