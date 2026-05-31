import type { FeedbackListItem, FeedbacksViewModel } from "../../types";
import { FeedbackStars } from "../shared/FeedbackStars";

interface FeedbacksMobileProps {
  view: FeedbacksViewModel;
}

function MobileFeedbackCard({ item }: { item: FeedbackListItem }) {
  return (
    <article className="rounded-[5vw] border border-customer-border bg-customer-card p-[4.5vw]">
      <div className="flex items-start justify-between gap-[3vw]">
        <div className="min-w-0">
          <p className="truncate text-[4.4vw] font-semibold text-text-primary">{item.customerLabel}</p>
          <p className="mt-[1vw] text-[3.2vw] text-customer-muted">{item.customerMeta}</p>
        </div>
        <div className="shrink-0 text-right text-[4vw]">
          <FeedbackStars rating={item.rating} />
          <p className="mt-[1vw] text-[3vw] font-semibold text-brand-blue">{item.sourceLabel}</p>
        </div>
      </div>

      <p className="mt-[3.5vw] text-[3.7vw] leading-relaxed text-text-body">{item.note}</p>

      <div className="mt-[4vw] border-t border-customer-border pt-[3.5vw]">
        <p className="text-[3.4vw] font-semibold text-text-primary">{item.productTitle}</p>
        <p className="mt-[1vw] text-[3.1vw] text-customer-muted">{item.productMeta}</p>
        <p className="mt-[1vw] text-[3.2vw] text-text-body">{item.sizeLabel}</p>
        {item.productUrl ? (
          <a
            href={item.productUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-[1.8vw] inline-flex text-[3.3vw] font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            Open product
          </a>
        ) : null}
      </div>

      <div className="mt-[4vw] border-t border-customer-border pt-[3.5vw]">
        <p className="break-words text-[3.5vw] font-semibold text-text-primary">{item.visitorLabel}</p>
        <p className="mt-[1vw] text-[3.1vw] text-customer-muted">{item.visitorMeta}</p>
        <p className="mt-[1vw] text-[3.1vw] text-text-body">{item.deviceLabel}</p>
        <p className="mt-[1vw] text-[3.1vw] text-customer-muted">{item.dateLabel}</p>
      </div>
    </article>
  );
}

export function FeedbacksMobile({ view }: FeedbacksMobileProps) {
  return (
    <section className="space-y-[4.5vw]">
      <div>
        <p className="text-[3vw] font-semibold uppercase tracking-[0.16em] text-brand-blue">Customers</p>
        <h2 className="mt-[1.5vw] text-[8vw] font-semibold leading-tight text-text-primary">Feedbacks</h2>
        <p className="mt-[2vw] text-[3.7vw] leading-relaxed text-text-body">
          Ratings, notes, product details, and visitor context.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-[2.5vw]">
        {view.stats.map((stat) => (
          <div key={stat.label} className="rounded-[4.5vw] border border-customer-border bg-customer-card p-[4vw]">
            <p className="text-[2.9vw] font-semibold uppercase tracking-[0.08em] text-customer-muted">{stat.label}</p>
            <p className="mt-[1.6vw] text-[5.7vw] font-semibold text-text-primary">{stat.value}</p>
            <p className="mt-[1vw] text-[3.1vw] leading-snug text-text-body">{stat.helper}</p>
          </div>
        ))}
      </div>

      <div className="space-y-[3vw]">
        {view.hasItems ? (
          view.items.map((item) => <MobileFeedbackCard key={item.id} item={item} />)
        ) : (
          <div className="rounded-[5vw] border border-customer-border bg-customer-card p-[8vw] text-center">
            <p className="text-[4.4vw] font-semibold text-text-primary">No feedback yet</p>
            <p className="mt-[1.5vw] text-[3.4vw] text-text-body">Submitted try-on ratings will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
