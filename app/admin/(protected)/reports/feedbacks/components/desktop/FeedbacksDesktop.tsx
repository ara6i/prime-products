import type { FeedbackListItem, FeedbacksViewModel } from "../../types";
import { FeedbackStars } from "../shared/FeedbackStars";

interface FeedbacksDesktopProps {
  view: FeedbacksViewModel;
}

function EmptyState() {
  return (
    <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[3vw] text-center">
      <p className="text-[clamp(18px,1.15vw,22px)] font-semibold text-text-primary">No feedback yet</p>
      <p className="mt-[0.5vw] text-[clamp(14px,0.84vw,16px)] text-text-body">Submitted try-on ratings will appear here.</p>
    </div>
  );
}

function FeedbackRow({ item }: { item: FeedbackListItem }) {
  return (
    <article className="grid grid-cols-[15vw_8vw_minmax(18vw,1fr)_17vw_17vw] gap-[1vw] border-t border-customer-border px-[1.25vw] py-[1.05vw]">
      <div className="min-w-0">
        <p className="truncate text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary">{item.customerLabel}</p>
        <p className="mt-[0.25vw] truncate text-[clamp(12px,0.72vw,14px)] text-customer-muted">{item.customerMeta}</p>
        <p className="mt-[0.25vw] text-[clamp(12px,0.72vw,14px)] text-text-body">{item.dateLabel}</p>
      </div>

      <div className="text-[clamp(15px,0.94vw,18px)]">
        <FeedbackStars rating={item.rating} />
        <p className="mt-[0.35vw] text-[clamp(12px,0.72vw,14px)] font-semibold text-brand-blue">{item.sourceLabel}</p>
      </div>

      <p className="min-w-0 text-[clamp(14px,0.84vw,16px)] leading-relaxed text-text-body">{item.note}</p>

      <div className="min-w-0">
        <p className="line-clamp-2 text-[clamp(14px,0.84vw,16px)] font-semibold leading-snug text-text-primary">{item.productTitle}</p>
        <p className="mt-[0.25vw] line-clamp-1 text-[clamp(12px,0.72vw,14px)] text-customer-muted">{item.productMeta}</p>
        <p className="mt-[0.25vw] text-[clamp(12px,0.72vw,14px)] text-text-body">{item.sizeLabel}</p>
        {item.productUrl ? (
          <a
            href={item.productUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-[0.45vw] inline-flex text-[clamp(12px,0.72vw,14px)] font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            Open product
          </a>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="break-words text-[clamp(14px,0.84vw,16px)] font-semibold leading-snug text-text-primary">{item.visitorLabel}</p>
        <p className="mt-[0.3vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted">{item.visitorMeta}</p>
        <p className="mt-[0.3vw] text-[clamp(12px,0.72vw,14px)] text-text-body">{item.deviceLabel}</p>
      </div>
    </article>
  );
}

export function FeedbacksDesktop({ view }: FeedbacksDesktopProps) {
  return (
    <section className="space-y-[1.25vw]">
      <div>
        <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.16em] text-brand-blue">Reports</p>
        <h2 className="mt-[0.45vw] text-[clamp(30px,2vw,40px)] font-semibold leading-tight text-text-primary">Feedbacks</h2>
        <p className="mt-[0.45vw] max-w-[52vw] text-[clamp(15px,0.94vw,18px)] leading-relaxed text-text-body">
          Customer ratings, notes, product details, and anonymous visitor location when available.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-[0.833vw]">
        {view.stats.map((stat) => (
          <div key={stat.label} className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.15vw]">
            <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.08em] text-customer-muted">{stat.label}</p>
            <p className="mt-[0.55vw] text-[clamp(24px,1.55vw,31px)] font-semibold text-text-primary">{stat.value}</p>
            <p className="mt-[0.3vw] text-[clamp(13px,0.78vw,15px)] text-text-body">{stat.helper}</p>
          </div>
        ))}
      </div>

      {view.hasItems ? (
        <div className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
          <div className="grid grid-cols-[15vw_8vw_minmax(18vw,1fr)_17vw_17vw] gap-[1vw] bg-surface-light px-[1.25vw] py-[0.8vw] text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.08em] text-customer-muted">
            <span>Customer</span>
            <span>Rating</span>
            <span>Note</span>
            <span>Product</span>
            <span>Visitor</span>
          </div>
          {view.items.map((item) => (
            <FeedbackRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}
