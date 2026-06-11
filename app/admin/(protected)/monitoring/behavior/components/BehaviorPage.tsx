import { Eye, ExternalLink } from "lucide-react";
import type { BehaviorViewModel } from "../types";

const CLARITY_PROJECT_URL = "https://clarity.microsoft.com/projects/view";

interface BehaviorPageProps {
  projectId: string;
  view: BehaviorViewModel;
}

export function BehaviorPage({ projectId, view }: BehaviorPageProps) {
  const clarityDashboardUrl = `${CLARITY_PROJECT_URL}/${encodeURIComponent(projectId)}/dashboard`;
  const clarityRecordingsUrl = `${CLARITY_PROJECT_URL}/${encodeURIComponent(projectId)}/recordings`;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Monitoring</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">SDK Session Recordings</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body lg:text-base">
          Recordings are handled by Microsoft Clarity inside the SDK. We do not store replay video chunks in our database.
        </p>
      </div>

      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Clarity project</p>
            <h3 className="mt-2 text-2xl font-semibold text-text-primary">Open Microsoft Clarity</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-body">
              Open the project, go to Recordings, then filter by the SDK tags below.
            </p>
          </div>
          <a
            href={clarityRecordingsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,89,255,0.18)] transition hover:bg-brand-blue/90"
          >
            Open Clarity recordings
          </a>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-customer-border bg-white">
          <table className="w-full min-w-[1080px] border-collapse text-left">
            <thead className="bg-customer-soft">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Clarity ID</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Product</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Device</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Events</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Last activity</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {view.hasSessions ? (
                view.sessions.map((session) => (
                  <tr key={session.id} className="border-t border-customer-border align-top">
                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-blue">{session.tagName}</p>
                      <p className="mt-1 break-all font-mono text-xs text-text-primary">{session.tagValue}</p>
                      <p className="mt-2 text-xs text-customer-muted">ps_session: {session.sessionId}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-text-primary">{session.productTitle}</p>
                      <p className="mt-1 text-xs text-customer-muted">{session.productMeta}</p>
                      {session.productUrl ? (
                        <a href={session.productUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">
                          Open product <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-text-primary">{session.sourceLabel}</p>
                      <p className="mt-1 text-xs text-customer-muted">{session.deviceLabel}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-text-primary">{session.eventCountLabel} events</p>
                      <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-customer-muted">{session.eventsLabel}</p>
                      <p className="mt-2 text-xs text-customer-muted">{session.jobIdsLabel}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-body">{session.lastSeenLabel}</td>
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
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="text-base font-semibold text-text-primary">No SDK session IDs yet</p>
                    <p className="mt-2 text-sm text-text-body">Open the SDK and interact with it. The next tracked session id will appear here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-5 rounded-2xl bg-customer-soft px-4 py-3 text-sm leading-relaxed text-text-body">
          In Clarity, filter Recordings by the row's tag value. New SDK opens use <strong>ps_sdk_open_id</strong>; older rows fall back to <strong>ps_session</strong>.
          <a href={clarityDashboardUrl} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-brand-blue">Open dashboard</a>
        </p>
      </div>
    </section>
  );
}
