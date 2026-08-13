import Image from "next/image";
import Link from "next/link";
import {
  SearchIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui/button";
import styles from "./productDetail.module.css";

interface ProductShopHeaderProps {
  brandName: string;
  brandLogo?: string;
  bagCount: number;
}

export function ProductShopHeader({
  brandName,
  brandLogo,
  bagCount,
}: ProductShopHeaderProps) {
  return (
    <>
      <div className={styles.utilityBar}>
        <span>Global delivery</span>
        <strong>Free network shipping on orders over $150</strong>
        <span>USD · EN</span>
      </div>
      <header className={styles.header}>
        <Link className={styles.headerBrand} href="/shop">
          {brandLogo ? (
            <Image
              src={brandLogo}
              alt={`${brandName} logo`}
              fill
              sizes="10vw"
              priority
              unoptimized={brandLogo.startsWith("http")}
            />
          ) : (
            <span>{brandName}</span>
          )}
        </Link>

        <nav className={styles.headerNavigation} aria-label="Global shop">
          <Link href="/shop/category/women">Women</Link>
          <Link href="/shop/category/men">Men</Link>
          <Link href="/shop#brands">Brands</Link>
          <Link href="/shop/category/accessories">Accessories</Link>
        </nav>

        <div className={styles.headerActions}>
          <Button variant="icon" size="icon" aria-label="Search the shop">
            <SearchIcon />
          </Button>
          <Button variant="icon" size="icon" aria-label="Your account">
            <UserIcon />
          </Button>
          <Button
            className={styles.bagButton}
            variant="icon"
            size="icon"
            aria-label={`Shopping bag with ${bagCount} ${bagCount === 1 ? "item" : "items"}`}
          >
            <ShoppingBagIcon />
            {bagCount > 0 ? <span>{bagCount}</span> : null}
          </Button>
        </div>
      </header>
    </>
  );
}
