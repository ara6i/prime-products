import type { FeedbacksViewModel } from "../types";
import { FeedbacksDesktop } from "./desktop/FeedbacksDesktop";
import { FeedbacksMobile } from "./mobile/FeedbacksMobile";

interface FeedbacksPageProps {
  view: FeedbacksViewModel;
}

export function FeedbacksPage({ view }: FeedbacksPageProps) {
  return (
    <>
      <div className="hidden lg:block">
        <FeedbacksDesktop view={view} />
      </div>
      <div className="lg:hidden">
        <FeedbacksMobile view={view} />
      </div>
    </>
  );
}
