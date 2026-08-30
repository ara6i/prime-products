export type ShopBagProduct = {
  productId: string;
  name: string;
  brandName: string;
  image: string;
  href?: string;
  size: string;
  color: string;
  priceCents: number;
  currency: string;
};

export type ShopBagItem = ShopBagProduct & { key: string; quantity: number };
type BagSnapshot = {
  items: ShopBagItem[];
  isOpen: boolean;
  storageAvailable: boolean;
};
type BagStorage = Pick<Storage, "getItem" | "setItem">;

export const SHOP_BAG_STORAGE_KEY = "primestyleai.shop.bag.v1";
export const EMPTY_BAG: BagSnapshot = {
  items: [],
  isOpen: false,
  storageAvailable: true,
};

export function bagItemKey(product: ShopBagProduct) {
  return JSON.stringify([product.productId, product.size, product.color, product.currency]);
}

function isProduct(value: unknown): value is ShopBagProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return ["productId", "name", "brandName", "image", "size", "color"].every(
    (field) => typeof product[field] === "string",
  ) && typeof product.currency === "string" && /^[A-Z]{3}$/.test(product.currency)
    && typeof product.priceCents === "number" && Number.isSafeInteger(product.priceCents)
    && product.priceCents >= 0
    && (product.href === undefined || (typeof product.href === "string" && product.href.startsWith("/shop/")));
}

export function readBagItems(raw: string | null): ShopBagItem[] {
  if (!raw) return [];
  const data = JSON.parse(raw) as { version?: number; items?: unknown[] };
  if (data?.version !== 1 || !Array.isArray(data.items)) throw new Error("Unsupported saved bag");
  return data.items.map((value) => {
    if (!isProduct(value) || !("quantity" in value)
      || typeof value.quantity !== "number" || !Number.isSafeInteger(value.quantity)
      || value.quantity < 1 || value.quantity > 999) throw new Error("Invalid saved bag item");
    return { ...value, key: bagItemKey(value), quantity: value.quantity };
  });
}

export function bagTotals(items: ShopBagItem[]) {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.priceCents * item.quantity);
  }
  return [...totals].map(([currency, priceCents]) => ({ currency, priceCents }));
}

export function formatBagMoney(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(priceCents / 100);
}

// A single store survives route changes; only explicit item edits write to storage.
export function createShopBagStore(getStorage: () => BagStorage) {
  let snapshot = EMPTY_BAG;
  let initialized = false;
  const listeners = new Set<() => void>();
  const publish = (next: BagSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  function hydrate() {
    if (initialized) return;
    initialized = true;
    syncFromStorage();
  }

  function syncFromStorage() {
    try {
      const items = readBagItems(getStorage().getItem(SHOP_BAG_STORAGE_KEY));
      publish({ ...snapshot, items, storageAvailable: true });
    } catch {
      // Never erase an in-memory bag if browser storage becomes unavailable.
      publish({ ...snapshot, storageAvailable: false });
    }
  }

  function updateItems(update: (items: ShopBagItem[]) => ShopBagItem[]) {
    hydrate();
    // Reconcile another tab's latest additions before changing a saved bag.
    if (snapshot.storageAvailable) syncFromStorage();
    const items = update(snapshot.items);
    let storageAvailable = true;
    try {
      getStorage().setItem(SHOP_BAG_STORAGE_KEY, JSON.stringify({ version: 1, items }));
    } catch {
      storageAvailable = false;
    }
    publish({ ...snapshot, items, storageAvailable });
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_BAG,
    subscribe(listener: () => void) {
      listeners.add(listener);
      hydrate();
      return () => { listeners.delete(listener); };
    },
    syncFromStorage,
    setOpen(isOpen: boolean) {
      hydrate();
      publish({ ...snapshot, isOpen });
    },
    add(product: ShopBagProduct) {
      if (!isProduct(product)) return;
      const key = bagItemKey(product);
      updateItems((items) => {
        const existing = items.find((item) => item.key === key);
        return existing
          ? items.map((item) => item.key === key
            ? { ...product, key, quantity: Math.min(999, item.quantity + 1) } : item)
          : [...items, { ...product, key, quantity: 1 }];
      });
      publish({ ...snapshot, isOpen: true });
    },
    changeQuantity(key: string, delta: number) {
      if (!Number.isSafeInteger(delta)) return;
      updateItems((items) => items.map((item) => item.key === key
        ? { ...item, quantity: Math.min(999, Math.max(1, item.quantity + delta)) } : item));
    },
    remove(key: string) {
      updateItems((items) => items.filter((item) => item.key !== key));
    },
  };
}
