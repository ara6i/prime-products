import { ReplaySessionsClient } from "./ReplaySessionsClient";
import type { ReplayPageViewModel } from "../types";

interface BehaviorPageProps {
  view: ReplayPageViewModel;
}

export function BehaviorPage({ view }: BehaviorPageProps) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Monitoring</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">SDK Session Replays</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body lg:text-base">
          Play captured SDK sessions to see what shoppers did inside the try-on modal, including uploaded image previews, sizing inputs, clicks, and scrolls.
        </p>
      </div>

      <ReplaySessionsClient sessions={view.sessions} />
    </section>
  );
}
