import { CheckIcon } from "@/app/shared/components/icons";
import styles from "./productDetail.module.css";

const benefits = [
  ["Estimated AI fit", "Personalized guidance, not a fit guarantee"],
  ["Styled together", "Keep every piece in one coordinated look"],
  ["Saved for later", "Come back to your favorite pieces anytime"],
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
