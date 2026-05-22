import { ArrowRight, Building2, Globe2, Mail, TicketCheck } from "lucide-react";

interface EnvironmentReadyPanelProps {
  storeName: string;
  domain: string;
  ownerEmail: string;
  invitationCode: string;
  onContinue: () => void;
}

export function EnvironmentReadyPanel({
  storeName,
  domain,
  ownerEmail,
  invitationCode,
  onContinue,
}: EnvironmentReadyPanelProps) {
  const details = [
    { label: "Store", value: storeName, icon: Building2 },
    { label: "Domain", value: domain, icon: Globe2 },
    { label: "Owner", value: ownerEmail, icon: Mail },
    { label: "Invite", value: invitationCode, icon: TicketCheck },
  ];

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
        Step 01
      </p>
      <h2 className="mt-4 max-w-[620px] text-[clamp(2.05rem,1.2rem+2vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-text-primary">
        Your workspace is ready.
      </h2>
      <p className="mt-4 max-w-[620px] text-base leading-[1.75] text-text-body">
        We reserved this merchant environment. Confirm the details below, then continue to domain verification.
      </p>

      <dl className="mt-9 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {details.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="min-w-0 border-b border-brand-blue/10 pb-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-hint">
                <Icon className="h-4 w-4 text-brand-blue" aria-hidden />
                {item.label}
              </dt>
              <dd className="mt-2 break-all text-sm font-semibold text-text-primary">{item.value}</dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-blue px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
        >
          Continue to DNS
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
