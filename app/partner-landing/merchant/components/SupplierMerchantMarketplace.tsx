"use client";

import Image from "next/image";
import {
  ArrowRight,
  Check,
  Handshake,
  Package,
  Storefront,
  Truck,
} from "@phosphor-icons/react";
import styles from "./merchantLanding.module.css";

const sellingModes = [
  {
    number: "01",
    label: "Buy inventory",
    title: "Bulk Wholesale",
    description: "Buy at volume pricing, receive inventory, and sell through your own stores.",
    actions: "Samples · quotes · bulk orders",
    icon: Package,
  },
  {
    number: "02",
    label: "Sell without stock",
    title: "Dropshipping",
    description: "Choose approved products and prices; the supplier ships each order to your customer.",
    actions: "Import · price · route orders",
    icon: Truck,
  },
  {
    number: "03",
    label: "Sell as the retailer",
    title: "Direct-to-Consumer",
    description: "Manufacturers can list selected products directly and fulfill shopper orders themselves.",
    actions: "DTC store · creators · checkout",
    icon: Storefront,
  },
] as const;

const marketplaceRows = [
  [
    { name: "Linen Resort Set", supplier: "Atelier North", price: "$28.40", image: "/images/landing/product-cardigan-red.png" },
    { name: "Ribbed Knit Top", supplier: "Mira Studio", price: "$14.10", image: "/images/landing/product-tshirt-brown.png" },
    { name: "Satin Day Blouse", supplier: "Aster Works", price: "$19.75", image: "/images/landing/product-blouse-blue.png" },
    { name: "Soft Tailored Coat", supplier: "Form & Loom", price: "$42.00", image: "/images/catalog/product-1.png" },
    { name: "Textured Cardigan", supplier: "Knit Union", price: "$23.60", image: "/images/landing/product-cardigan-yellow.png" },
  ],
  [
    { name: "City Runner 02", supplier: "Motion Supply", price: "$31.20", image: "/media/partner-landing/merchant-network/running-shoe.webp" },
    { name: "Merino Layer", supplier: "Knit Union", price: "$17.80", image: "/media/partner-landing/merchant-network/knit-product.webp" },
    { name: "Everyday Column", supplier: "Form & Loom", price: "$26.50", image: "/images/catalog/product-2.png" },
    { name: "Modern Utility", supplier: "Aster Works", price: "$22.90", image: "/images/catalog/product-3.png" },
    { name: "Studio Essential", supplier: "Mira Studio", price: "$18.25", image: "/images/catalog/product-4.png" },
  ],
  [
    { name: "Soft Tailored Coat", supplier: "Form & Loom", price: "$84 retail", image: "/images/catalog/product-1.png" },
    { name: "Satin Day Blouse", supplier: "Aster Works", price: "$48 retail", image: "/images/landing/product-blouse-blue.png" },
    { name: "Merino Layer", supplier: "Knit Union", price: "$56 retail", image: "/media/partner-landing/merchant-network/knit-product.webp" },
    { name: "Linen Resort Set", supplier: "Atelier North", price: "$72 retail", image: "/images/landing/product-cardigan-red.png" },
    { name: "City Runner 02", supplier: "Motion Supply", price: "$96 retail", image: "/media/partner-landing/merchant-network/running-shoe.webp" },
  ],
] as const;

const rowLabels = ["Wholesale", "Dropship", "Direct-to-consumer"] as const;

type SupplierMerchantMarketplaceProps = {
  onPrimaryAction: () => void;
};

export function SupplierMerchantMarketplace({ onPrimaryAction }: SupplierMerchantMarketplaceProps) {
  const showSellingModes = () => {
    document.getElementById("supplier-selling-modes")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section
      id="supplier-marketplace"
      className={styles.supplierMarketplace}
      aria-labelledby="supplier-marketplace-title"
    >
      <div className={styles.supplierMarketplaceFrame}>
        <header className={styles.supplierMarketplaceHeader}>
          <div className={styles.supplierMarketplaceIndex}>
            <span>01</span>
            <p>
              <b>Supplier Marketplace</b>
              <small>Sourcing + sales network</small>
            </p>
          </div>
          <div className={styles.supplierMarketplaceStatus}>
            <span><Check size={13} weight="bold" /> Approved suppliers</span>
            <span>One account · 3 selling modes</span>
          </div>
        </header>

        <div className={styles.supplierMarketplaceHero}>
          <div className={styles.supplierMarketplaceCopy}>
            <p><Handshake size={16} weight="duotone" /> A smarter supplier network</p>
            <h1 id="supplier-marketplace-title">
              <span className={styles.supplierMarketplaceTitleMain}>Connect with suppliers.</span>
              <span>Choose how you sell.</span>
            </h1>
            <p className={styles.supplierMarketplaceLead}>
              Source approved products through wholesale or dropshipping—or sell direct as the manufacturer. One marketplace keeps every path connected.
            </p>
            <div className={styles.supplierMarketplaceActions}>
              <button type="button" onClick={onPrimaryAction}>
                Join the waitlist <ArrowRight size={16} weight="bold" />
              </button>
              <button type="button" onClick={showSellingModes}>See the three ways</button>
            </div>
          </div>

          <div className={styles.supplierMarketplaceMotion} aria-hidden="true">
            <div className={styles.supplierOfferRows}>
              {marketplaceRows.map((offers, rowIndex) => (
                <div className={styles.supplierOfferViewport} key={rowLabels[rowIndex]}>
                  <div className={styles.supplierOfferTrack}>
                    {[0, 1].map((copyIndex) => (
                      <div className={styles.supplierOfferGroup} key={copyIndex}>
                        {offers.map((offer) => (
                          <article className={styles.supplierOfferCard} key={`${copyIndex}-${offer.name}`}>
                            <Image src={offer.image} alt="" width={60} height={70} sizes="60px" />
                            <div>
                              <span>{rowLabels[rowIndex]}</span>
                              <strong>{offer.name}</strong>
                              <small>{offer.supplier}</small>
                            </div>
                            <b>{offer.price}</b>
                          </article>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.supplierMarketplaceHub}>
              <Image
                src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp"
                alt=""
                width={600}
                height={471}
                sizes="(max-width: 560px) 86px, 112px"
              />
            </div>
          </div>

          <div className={styles.supplierMarketplaceMetrics}>
            <span><b>Verified</b> supplier profiles</span>
            <span><b>Live</b> prices + inventory</span>
            <span><b>Flexible</b> fulfillment by product</span>
          </div>
        </div>

        <div id="supplier-selling-modes" className={styles.supplierSellingModes}>
          {sellingModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <article key={mode.title}>
                <header>
                  <span>{mode.number}</span>
                  <Icon size={23} weight="duotone" />
                </header>
                <p>{mode.label}</p>
                <h2>{mode.title}</h2>
                <p>{mode.description}</p>
                <footer>{mode.actions}</footer>
              </article>
            );
          })}
        </div>

        <div className={styles.supplierMarketplaceRule}>
          <span><Check size={15} weight="bold" /></span>
          <p>
            <strong>Enable one, two, or all three for each product.</strong>
            Prices, inventory, regions, policies, and fulfillment stay independent for every selling mode.
          </p>
        </div>
      </div>
    </section>
  );
}
