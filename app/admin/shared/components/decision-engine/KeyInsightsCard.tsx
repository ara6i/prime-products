import { Card } from "@/app/admin/shared/components/Card";
import { Lightbulb, CheckCircle2, Ruler, Package, TrendingUp, Activity } from "lucide-react";
import type { DecisionInsight } from "@/app/admin/shared/types";

interface Props {
  insights: DecisionInsight[];
}

const kindIcon: Record<
  DecisionInsight["kind"],
  { Icon: typeof CheckCircle2; color: string; bg: string }
> = {
  lift: {
    Icon: TrendingUp,
    color: "text-admin-status-active-text",
    bg: "bg-admin-status-active-bg",
  },
  alignment: { Icon: Ruler, color: "text-accent-purple-text", bg: "bg-accent-purple-light" },
  returns: { Icon: Package, color: "text-brand-blue", bg: "bg-brand-blue-pale" },
  activity: { Icon: Activity, color: "text-warning-text", bg: "bg-surface-warning-light" },
};

function renderWithHighlight(body: string, highlight: string | null): React.ReactNode {
  if (!highlight) return body;
  const idx = body.indexOf(highlight);
  if (idx === -1) return body;
  return (
    <>
      {body.slice(0, idx)}
      <strong className="font-semibold text-text-primary">{highlight}</strong>
      {body.slice(idx + highlight.length)}
    </>
  );
}

export function KeyInsightsCard({ insights }: Props) {
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-[0.417vw]">
          <Lightbulb
            className="!w-[0.938vw] !h-[0.938vw] text-warning-text max-lg:!w-4 max-lg:!h-4"
            strokeWidth={1.8}
          />
          Key Insights
        </span>
      }
    >
      <ul className="flex flex-col gap-[var(--spacing-admin-gap-md)]">
        {insights.map((ins, i) => {
          const palette = kindIcon[ins.kind];
          const Icon = palette.Icon;
          return (
            <li key={i} className="flex gap-[var(--spacing-admin-gap-md)] items-start">
              <span
                className={`flex h-[1.667vw] w-[1.667vw] shrink-0 items-center justify-center rounded-full ${palette.bg} max-lg:h-8 max-lg:w-8`}
              >
                <Icon
                  className={`!w-[0.833vw] !h-[0.833vw] ${palette.color} max-lg:!w-4 max-lg:!h-4`}
                  strokeWidth={1.8}
                />
              </span>
              <p className="text-admin-sm text-text-body leading-snug max-lg:text-sm">
                {renderWithHighlight(ins.body, ins.highlight)}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
