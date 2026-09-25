import { Eye } from "lucide-react";
import type { BehaviorViewModel } from "../types";

const CLARITY_PROJECT_URL = "https://clarity.microsoft.com/projects/view";

interface BehaviorPageProps {
  projectId: string;
  view: BehaviorViewModel;
}

export function BehaviorPage({ projectId, view }: BehaviorPageProps) {
  const clarityRecordingsUrl = `${CLARITY_PROJECT_URL}/${encodeURIComponent(projectId)}/recordings`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
            Monitoring
          </p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">
            Session Recordings
          </h2>
        </div>
        <a
          href={clarityRecordingsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,89,255,0.18)] transition hover:bg-brand-blue/90"
        >
          Open Clarity
        </a>
      </div>

      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-6 shadow-sm">
        <div className="hidden overflow-x-auto rounded-2xl border border-customer-border bg-customer-card lg:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-customer-soft">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">
                  Device
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">
                  Country
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">
                  Origin
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {view.hasSessions ? (
                view.sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-t border-customer-border align-top"
                  >
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-text-primary">
                        {session.deviceLabel}
                      </p>
                      <p className="mt-1 text-xs text-customer-muted">
                        {session.lastSeenLabel}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-text-primary">
                        {session.countryLabel}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-text-primary">
                        {session.originLabel}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <a
                        href={clarityRecordingsUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={`Open Clarity and filter by ${session.tagName}: ${session.tagValue}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-customer-border px-3 py-2 text-sm font-semibold text-brand-blue transition hover:border-brand-blue/50 hover:bg-brand-blue/5"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-customer-border">
                  <td colSpan={4} className="px-4 py-10 text-center">
                    <p className="text-base font-semibold text-text-primary">
                      No sessions yet
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-customer-border overflow-hidden rounded-2xl border border-customer-border bg-customer-card lg:hidden">
          {view.hasSessions ? (
            view.sessions.map((session) => (
              <article key={session.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-text-primary">
                      {session.deviceLabel}
                    </h4>
                    <p className="mt-1 text-xs text-customer-muted">
                      {session.lastSeenLabel}
                    </p>
                  </div>
                  <a
                    href={clarityRecordingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open Clarity and filter by ${session.tagName}: ${session.tagValue}`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-customer-border px-4 text-sm font-semibold text-brand-blue"
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                    View
                  </a>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-customer-border pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-customer-muted">Country</dt>
                    <dd className="mt-1 break-words font-semibold text-text-primary">
                      {session.countryLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-customer-muted">Origin</dt>
                    <dd className="mt-1 break-words font-semibold text-text-primary">
                      {session.originLabel}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-base font-semibold text-text-primary">
                No sessions yet
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
