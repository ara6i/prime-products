import { Handbag } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import styles from "./productDetail.module.css";

interface ProductShopHeaderProps {
  bagCount: number;
  onOpenBag: () => void;
}

export function ProductShopHeader({
  bagCount,
  onOpenBag,
}: ProductShopHeaderProps) {
  return (
    <header className={styles.header}>
      <Link
        className={styles.headerBrand}
        href="/shop"
        aria-label="PrimeStyleAI shop home"
      >
        <Image
          src="/media/partner-landing/primestyleai-commerce-gateway-mark.png"
          alt="PrimeStyleAI"
          width={1200}
          height={942}
          sizes="46px"
          priority
        />
        <span>
          <strong>PrimeStyleAI</strong>
          <small>Global shop</small>
        </span>
      </Link>

      <div className={styles.headerActions}>
        <button
          className={styles.bagButton}
          type="button"
          aria-label={`Saved look with ${bagCount} ${bagCount === 1 ? "item" : "items"}`}
          aria-haspopup="dialog"
          onClick={onOpenBag}
        >
          <Handbag size={26} weight="regular" />
          <span>{bagCount}</span>
        </button>
      </div>
    </header>
  );
}
