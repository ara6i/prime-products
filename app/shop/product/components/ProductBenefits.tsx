import { CheckIcon } from "@/app/shared/components/icons";
import styles from "./productDetail.module.css";

const benefits = [
  ["AI fit match", "Size guidance built around your profile"],
  ["Connected checkout", "One bag across the merchant network"],
  ["Tracked delivery", "Order status available after checkout"],
] as const;

export function ProductBenefits() {
  return (
    <section className={styles.benefits} aria-label="Shopping benefits">
      {benefits.map(([title, copy]) => (
        <div key={title}>
          <CheckIcon />
          <span>
            <strong>{title}</strong>
            <small>{copy}</small>
          </span>
        </div>
      ))}
    </section>
  );
}
