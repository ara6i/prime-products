import { Sparkle } from "@phosphor-icons/react";
import styles from "./categoryCatalog.module.css";

type CategoryTickerProps = {
  items: string[];
};

function TickerRail({ items }: CategoryTickerProps) {
  return (
    <div className={styles.tickerRail}>
      {[...items, ...items].map((item, index) => (
        <span key={`${item}-${index}`}>
          <Sparkle size={18} weight="fill" /> {item}
        </span>
      ))}
    </div>
  );
}

export function CategoryTicker({ items }: CategoryTickerProps) {
  return (
    <div className={styles.ticker} aria-label={items.join(", ")}>
      <div className={styles.tickerTop}>
        <TickerRail items={items} />
      </div>
      <div className={styles.tickerBottom}>
        <TickerRail items={[...items].reverse()} />
      </div>
    </div>
  );
}
