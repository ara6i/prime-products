"use client";

import { ArrowCounterClockwise, ArrowRight, Handbag, Minus, Plus, X } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useRef, useState, type ReactNode } from "react";
import { bagTotals, formatBagMoney } from "../bag/shopBag.store";
import { useShopBag } from "../bag/useShopBag";
import styles from "./shopReceiptSidebar.module.css";

function PrintingPaper({ children }: { children: ReactNode }) {
  const [motionInterrupted, setMotionInterrupted] = useState(false);

  return (
    <div
      className={styles.paperFeed}
      data-motion-interrupted={motionInterrupted || undefined}
      onFocusCapture={() => setMotionInterrupted(true)}
    >
      {children}
    </div>
  );
}

export function ShopReceiptSidebar() {
  const bag = useShopBag();
  const returnFocus = useRef<HTMLElement | null>(null);
  const [printRevision, setPrintRevision] = useState(0);
  const totals = bagTotals(bag.items);

  return (
    <Dialog.Root open={bag.isOpen} onOpenChange={bag.setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.scrim} />
        <Dialog.Content
          className={styles.sidebar}
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <header className={styles.header}>
            <div>
              <Dialog.Title className={styles.title}>Your bag <span>[ {bag.bagCount} ]</span></Dialog.Title>
              <Dialog.Description className={styles.description}>
                {bag.storageAvailable ? "Saved on this browser. Yours to come back to." : "Browser storage unavailable. Saved for this visit only."}
              </Dialog.Description>
            </div>
            <Dialog.Close className={styles.close} aria-label="Close shopping bag"><X size={21} /></Dialog.Close>
          </header>

          <div className={styles.receipt}>
            <Image className={styles.printer} src="/media/global-shop/pdp-receipt/printer-slot-reference.png" width={600} height={92} alt="" loading="eager" />
            <div className={styles.paperViewport}>
              {/* Move the whole sheet through the slot, with its torn edge leading. */}
              <PrintingPaper key={printRevision}>
                <div className={styles.paper}>
                  <div className={styles.receiptHeading}>
                    <span>PRIMESTYLEAI / GLOBAL SHOP</span>
                    <h3>BASKET RECEIPT</h3>
                    <p aria-live="polite">{bag.bagCount} {bag.bagCount === 1 ? "item" : "items"} · {bag.items.length} {bag.items.length === 1 ? "selection" : "selections"}</p>
                  </div>

                  <div className={styles.items} role="region" aria-label="Receipt items" tabIndex={0}>
                    {bag.items.length ? (
                      <ul aria-label="Products in your bag">
                        {bag.items.map((item, index) => (
                          <li className={styles.item} key={item.key}>
                            <Image
                              className={styles.productImage}
                              src={item.image}
                              width={264}
                              height={360}
                              quality={90}
                              loading={index < 2 ? "eager" : "lazy"}
                              alt={item.name}
                              unoptimized={item.image.startsWith("http")}
                            />
                            <div className={styles.itemDetails}>
                              <div className={styles.itemTopline}><span>{String(index + 1).padStart(2, "0")} / {item.brandName}</span><strong>{formatBagMoney(item.priceCents * item.quantity, item.currency)}</strong></div>
                              {item.href ? <Link className={styles.productName} href={item.href} onClick={() => bag.setOpen(false)}>{item.name}</Link> : <p className={styles.productName}>{item.name}</p>}
                              <p className={styles.variant}>Size: {item.size || "Not selected"}{item.color ? ` · ${item.color}` : ""}</p>
                              <div className={styles.itemActions}>
                                <div className={styles.quantity} role="group" aria-label={`Quantity for ${item.name}, ${item.size || "size not selected"}`}>
                                  <button type="button" disabled={item.quantity <= 1} onClick={() => bag.changeQuantity(item.key, -1)} aria-label={`Decrease quantity of ${item.name}, ${item.size || "size not selected"}`}><Minus size={12} /></button>
                                  <span aria-live="polite">{item.quantity}</span>
                                  <button type="button" disabled={item.quantity >= 999} onClick={() => bag.changeQuantity(item.key, 1)} aria-label={`Increase quantity of ${item.name}, ${item.size || "size not selected"}`}><Plus size={12} /></button>
                                </div>
                                <button className={styles.remove} type="button" onClick={() => bag.remove(item.key)} aria-label={`Remove ${item.name}, ${item.size || "size not selected"} from bag`}>Remove</button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className={styles.empty}><Handbag size={36} weight="thin" /><h3>A little room for something you love.</h3><p>Your pieces will appear here, together.</p></div>
                    )}
                  </div>

                  <footer className={styles.summary}>
                    {bag.items.length > 0 && <>
                      <div className={styles.subtotal}><span>SUBTOTAL</span><div>{totals.map((total) => <strong key={total.currency}>{formatBagMoney(total.priceCents, total.currency)}</strong>)}</div></div>
                      <p className={styles.shipping}>Shipping & taxes not included.</p>
                      <Image className={styles.barcode} src="/media/global-shop/pdp-receipt/barcode-reference.png" width={325} height={64} alt="" loading="eager" />
                      <p className={styles.checkoutNote}>Checkout isn’t connected yet. {bag.storageAvailable ? "Your bag stays saved." : "Your bag is kept for this visit."}</p>
                    </>}
                    <Dialog.Close className={styles.continue}>Continue shopping <ArrowRight size={16} /></Dialog.Close>
                  </footer>
                </div>
                <Image className={styles.edge} src="/media/global-shop/pdp-receipt/receipt-edge-reference.png" width={490} height={45} alt="" loading="eager" />
              </PrintingPaper>
            </div>
          </div>
          <div className={styles.receiptControls}>
            <p className={styles.savedNote}>Keep the pieces. Take your time.</p>
            <button className={styles.reprint} type="button" onClick={() => setPrintRevision((revision) => revision + 1)}>
              <ArrowCounterClockwise size={13} aria-hidden="true" /> Replay receipt
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
