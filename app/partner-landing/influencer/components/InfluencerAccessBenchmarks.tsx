import {
  ArrowUpRight,
  CursorClick,
  Eye,
  ShoppingBagOpen,
  Sparkle,
} from "@phosphor-icons/react";
import styles from "./influencerLanding.module.css";

const ACCESS_BENCHMARKS = [
  {
    value: "500",
    label: "Qualified creator-page visitors",
    icon: Eye,
    tone: "blue",
  },
  {
    value: "100",
    label: "Product clicks",
    icon: CursorClick,
    tone: "peach",
  },
  {
    value: "5",
    label: "Qualifying purchases",
    icon: ShoppingBagOpen,
    tone: "mint",
  },
] as const;

export function InfluencerAccessBenchmarks({
  onCtaClick,
}: {
  onCtaClick: () => void;
}) {
  return (
    <section
      id="creator-access"
      className={styles.creatorAccess}
      aria-labelledby="creator-access-title"
    >
      <div className={styles.accessIntro}>
        <div>
          <span>Early creator access · minimum activity</span>
          <h2 id="creator-access-title">
            Keep your full account <em>free.</em>
          </h2>
          <p>
            Meet any <strong>one</strong> benchmark each month.
          </p>
        </div>

        <aside
          className={styles.starterPortfolio}
          aria-label="Early-creator starter portfolio"
        >
          <span>
            <Sparkle size={18} weight="fill" /> Early-creator starter portfolio
          </span>
          <strong>Up to 10 AI try-on images + 4 AI fashion videos*</strong>
          <small>
            Starter content unlocks in stages and remains subject to approval.
          </small>
        </aside>
      </div>

      <div className={styles.accessBenchmarkPanel}>
        <header>
          <div>
            <span>Choose any one</span>
            <h3>
              One clear benchmark keeps your creator account active and free.
            </h3>
          </div>
          <button type="button" onClick={onCtaClick}>
            Join the early-access waitlist{" "}
            <ArrowUpRight size={18} weight="bold" />
          </button>
        </header>

        <div className={styles.accessBenchmarkGrid}>
          {ACCESS_BENCHMARKS.map(({ value, label, icon: Icon, tone }) => (
            <article key={label} data-tone={tone}>
              <span>
                <Icon size={22} weight="bold" />
              </span>
              <strong>{value}</strong>
              <p>{label}</p>
              <small>per month</small>
            </article>
          ))}
        </div>
      </div>

      <p className={styles.accessFinePrint}>
        *Starter content is subject to approval, eligible products, and staged
        unlocks. Qualified activity excludes bots, self-generated, duplicate,
        incentivized, or manipulated traffic. A qualifying purchase must be
        attributed to the creator and not canceled, returned, or charged back.
        Earnings are not guaranteed.
      </p>
    </section>
  );
}
