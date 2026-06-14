import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PlatformStatusViewModel } from "../types";

interface PlatformStatusPageProps {
  view: PlatformStatusViewModel;
}

export function PlatformStatusPage({ view }: PlatformStatusPageProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Monitoring</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">Platform Status</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-customer-border bg-customer-card px-4 py-2 text-sm font-semibold text-text-body">
          <Activity className="h-4 w-4 text-brand-blue" />
          Updated {view.generatedAtLabel}
        </div>
      </div>

      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          {view.services.every((service) => service.tone === "success") ? (
            <CheckCircle2 className="h-6 w-6 text-admin-status-active-text" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-[#986500]" />
          )}
          <h3 className="text-xl font-semibold text-text-primary">{view.title}</h3>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-customer-border bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="bg-customer-soft">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Service</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Detail</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {view.services.map((service) => (
                <tr key={service.id} className="border-t border-customer-border align-top">
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-text-primary">{service.name}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-text-body">{service.detail}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span
                      className={
                        service.tone === "success"
                          ? "inline-flex rounded-full bg-admin-status-active-bg px-3 py-1 text-xs font-semibold text-admin-status-active-text"
                          : "inline-flex rounded-full bg-[#fff3dc] px-3 py-1 text-xs font-semibold text-[#986500]"
                      }
                    >
                      {service.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
