import { BarChart3, Bot, Gauge, Ruler, Shirt, ShoppingBag, Sparkles } from "lucide-react";
import type { BlogTopic } from "../types";

interface TopicChipsProps {
  topics: BlogTopic[];
}

export function TopicChips({ topics }: TopicChipsProps) {
  const iconByName = {
    ruler: Ruler,
    sparkles: Sparkles,
    "shopping-bag": ShoppingBag,
    gauge: Gauge,
    shirt: Shirt,
    "bar-chart": BarChart3,
    bot: Bot,
  };

  return (
    <section className="mx-auto w-full max-w-[980px] border-t border-brand-blue/10 px-5 py-8 text-center md:px-8">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.26em] text-text-hint">
        Explore trending topics
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {topics.map((topic) => {
          const Icon = iconByName[topic.iconName];

          return (
            <button
              key={topic.key}
              type="button"
              className="flex h-9 items-center gap-2 rounded-full border border-brand-blue/10 bg-white px-4 text-xs font-bold text-text-primary shadow-sm shadow-brand-blue/5 transition hover:border-brand-blue/30 hover:bg-surface-blue-pale hover:text-brand-blue"
            >
              <Icon size={14} className="text-brand-blue" />
              {topic.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
