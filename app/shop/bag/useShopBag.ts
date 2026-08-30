"use client";

import { useSyncExternalStore } from "react";
import { createShopBagStore, SHOP_BAG_STORAGE_KEY } from "./shopBag.store";

const store = createShopBagStore(() => window.localStorage);
let subscribers = 0;

function handleStorage(event: StorageEvent) {
  if (event.key === SHOP_BAG_STORAGE_KEY || event.key === null) store.syncFromStorage();
}

function subscribe(listener: () => void) {
  if (subscribers++ === 0) window.addEventListener("storage", handleStorage);
  const unsubscribe = store.subscribe(listener);
  return () => {
    unsubscribe();
    if (--subscribers === 0) window.removeEventListener("storage", handleStorage);
  };
}

export function useShopBag() {
  const snapshot = useSyncExternalStore(subscribe, store.getSnapshot, store.getServerSnapshot);
  return {
    ...snapshot,
    bagCount: snapshot.items.reduce((count, item) => count + item.quantity, 0),
    add: store.add,
    setOpen: store.setOpen,
    changeQuantity: store.changeQuantity,
    remove: store.remove,
  };
}
