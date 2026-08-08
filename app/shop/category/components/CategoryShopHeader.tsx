import {
  Handbag,
  List,
  MagnifyingGlass,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import type { ShopCategoryId } from "../types/categoryCatalog.types";
import styles from "./categoryCatalog.module.css";

type CategoryShopHeaderProps = {
  categoryId: ShopCategoryId;
  bagCount: number;
  searchQuery: string;
  menuOpen: boolean;
  onSearchChange: (value: string) => void;
  onMenuToggle: () => void;
};

const navigation: { id: ShopCategoryId; label: string }[] = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "denim", label: "Denim" },
  { id: "accessories", label: "Accessories" },
];

export function CategoryShopHeader({
  categoryId,
  bagCount,
  searchQuery,
  menuOpen,
  onSearchChange,
  onMenuToggle,
}: CategoryShopHeaderProps) {
  return (
    <header className={styles.header}>
      <Link
        className={styles.brand}
        href="/shop"
        aria-label="PrimeStyleAI shop home"
      >
        <Image
          src="/media/partner-landing/primestyleai-new-mark.png"
          alt="PrimeStyleAI"
          width={1254}
          height={1254}
          sizes="38px"
          priority
        />
        <span>
          <strong>PrimeStyleAI</strong>
          <small>Global shop</small>
        </span>
      </Link>

      <nav className={styles.navigation} aria-label="Shop categories">
        <Link href="/shop">Home</Link>
        {navigation.map((item) => (
          <Link
            key={item.id}
            data-active={item.id === categoryId}
            href={`/shop/category/${item.id}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.headerActions}>
        <label className={styles.searchField}>
          <MagnifyingGlass size={17} />
          <span className={styles.srOnly}>Search this category</span>
          <input
            type="search"
            value={searchQuery}
            placeholder="Search"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <button type="button" aria-label="Account">
          <UserCircle size={19} />
        </button>
        <button
          type="button"
          aria-label={`Shopping bag with ${bagCount} ${bagCount === 1 ? "item" : "items"}`}
        >
          <Handbag size={19} />
          {bagCount > 0 ? <span>{bagCount}</span> : null}
        </button>
        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={onMenuToggle}
        >
          {menuOpen ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {menuOpen ? (
        <nav
          className={styles.mobileNavigation}
          aria-label="Mobile shop categories"
        >
          <Link href="/shop">Home</Link>
          {navigation.map((item) => (
            <Link key={item.id} href={`/shop/category/${item.id}`}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
