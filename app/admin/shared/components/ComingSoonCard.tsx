import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  description?: string;
}

export function ComingSoonCard({ title, description }: Props) {
  return (
    <Card>
      <EmptyState
        icon={<Sparkles className="!w-[1.25vw] !h-[1.25vw]" strokeWidth={1.8} />}
        title={title}
        description={
          description ??
          "This page is scheduled next. The Decision Engine Overview already shows a preview of this data."
        }
      />
    </Card>
  );
}
