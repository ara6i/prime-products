import {
  ArrowUpRight,
  CreditCard,
  CursorClick,
  Eye,
  ShoppingBagOpen,
  Sparkle,
} from "@phosphor-icons/react";
import styles from "./influencerLanding.module.css";
import { useCreatorLanguage } from "../../i18n/CreatorLanguageProvider";

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
  const { t } = useCreatorLanguage();

  return (
    <section
      id="creator-access"
      className={styles.creatorAccess}
      aria-labelledby="creator-access-title"
    >
      <div className={styles.accessIntro}>
        <div>
          <span>{t("Early creator access · minimum activity")}</span>
          <h2 id="creator-access-title">
            {t("Keep your full account")} <em>{t("free.")}</em>
          </h2>
          <p>{t("Your full account stays free when all three monthly benchmarks are met.")}</p>
        </div>

        <aside
          className={styles.starterPortfolio}
          aria-label={t("Early-creator starter portfolio")}
        >
          <span>
            <Sparkle size={18} weight="fill" /> {t("Early-creator starter portfolio")}
          </span>
          <strong>{t("Up to 10 AI try-on images + 4 AI fashion videos*")}</strong>
          <small>
            {t("Starter content unlocks in stages and remains subject to approval.")}
          </small>
        </aside>
      </div>

      <div className={styles.accessBenchmarkPanel}>
        <header>
          <div>
            <span>{t("Three milestones · one free account")}</span>
            <h3>
              {t("Your creator account remains active and free when all three monthly milestones are reached.")}
            </h3>
          </div>
          <button type="button" onClick={onCtaClick}>
            {t("Join the early-access waitlist")}{" "}
            <ArrowUpRight size={18} weight="bold" />
          </button>
        </header>

        <div className={styles.accessBenchmarkGrid}>
          {ACCESS_BENCHMARKS.map(({ value, label, icon: Icon, tone }, index) => (
            <article key={label} data-tone={tone}>
              {index > 0 ? (
                <b className={styles.accessBenchmarkJoin} aria-hidden="true">+</b>
              ) : null}
              <span>
                <Icon size={22} weight="bold" />
              </span>
              <strong>{value}</strong>
              <p>{t(label)}</p>
              <small>{t("per month")}</small>
            </article>
          ))}
        </div>

        <aside
          className={styles.accessBillingNotice}
          aria-label={t("monthly account fee")}
        >
          <div className={styles.accessBillingAmount}>
            <span>
              <CreditCard size={17} weight="bold" /> {t("Once activity begins")}
            </span>
            <strong>$4.99</strong>
            <small>{t("monthly account fee")}</small>
          </div>
          <div className={styles.accessBillingCopy}>
            <h4>
              {t("If one milestone isn’t reached, your account continues for $4.99 that month.")}
            </h4>
            <p>
              {t("Your monthly activity period begins with your first qualified impression or product click. When all three milestones are reached during that period, your full account stays free.")}
            </p>
          </div>
        </aside>
      </div>

      <p className={styles.accessFinePrint}>
        {t("*Starter content is subject to approval, eligible products, and staged unlocks. Qualified activity excludes bots, self-generated, duplicate, incentivized, or manipulated traffic. A qualifying purchase must be attributed to the creator and not canceled, returned, or charged back. Earnings are not guaranteed.")}
      </p>
    </section>
  );
}
