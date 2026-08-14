import {
  ArrowUpRight,
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
          <p>
            {t("Meet any")} <strong>{t("one")}</strong> {t("benchmark each month.")}
          </p>
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
            <span>{t("Choose any one")}</span>
            <h3>
              {t("One clear benchmark keeps your creator account active and free.")}
            </h3>
          </div>
          <button type="button" onClick={onCtaClick}>
            {t("Join the early-access waitlist")}{" "}
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
              <p>{t(label)}</p>
              <small>{t("per month")}</small>
            </article>
          ))}
        </div>
      </div>

      <p className={styles.accessFinePrint}>
        {t("*Starter content is subject to approval, eligible products, and staged unlocks. Qualified activity excludes bots, self-generated, duplicate, incentivized, or manipulated traffic. A qualifying purchase must be attributed to the creator and not canceled, returned, or charged back. Earnings are not guaranteed.")}
      </p>
    </section>
  );
}
