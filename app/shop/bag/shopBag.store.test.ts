import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bagItemKey, bagTotals, createShopBagStore, EMPTY_BAG,
  formatBagMoney, SHOP_BAG_STORAGE_KEY, type ShopBagProduct,
} from "./shopBag.store";

const jeans: ShopBagProduct = {
  productId: "jeans", name: "Lumen Wide Leg", brandName: "Northline",
  image: "/jeans.png", href: "/shop/product/jeans", size: "24",
  color: "Light blue", priceCents: 13800, currency: "USD",
};
const shirt: ShopBagProduct = { ...jeans, productId: "shirt", name: "Shirt", size: "M", priceCents: 4599 };

function storageFixture() {
  const values = new Map<string, string>();
  let writes = 0;
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes++; values.set(key, value); },
    get writes() { return writes; },
  };
}

test("different products and sizes coexist; only the same variant increments", () => {
  const storage = storageFixture();
  const store = createShopBagStore(() => storage);
  store.add(jeans);
  store.add(shirt);
  store.add({ ...jeans, size: "26" });
  store.add(jeans);
  assert.equal(store.getSnapshot().items.length, 3);
  assert.deepEqual(store.getSnapshot().items.map((item) => [item.productId, item.size, item.quantity]), [
    ["jeans", "24", 2], ["shirt", "M", 1], ["jeans", "26", 1],
  ]);
  assert.equal(store.getSnapshot().items.reduce((sum, item) => sum + item.quantity, 0), 4);
});

test("closing and reopening never remove products or write an empty bag", () => {
  const storage = storageFixture();
  const store = createShopBagStore(() => storage);
  store.add(jeans);
  const writes = storage.writes;
  store.setOpen(false);
  store.setOpen(true);
  assert.equal(store.getSnapshot().items.length, 1);
  assert.equal(storage.writes, writes);
});

test("refresh restores every variant and quantity without overwriting storage on hydration", () => {
  const storage = storageFixture();
  const first = createShopBagStore(() => storage);
  first.add(jeans);
  first.add(shirt);
  first.add(jeans);
  const writes = storage.writes;
  const refreshed = createShopBagStore(() => storage);
  assert.equal(refreshed.getServerSnapshot(), EMPTY_BAG);
  refreshed.subscribe(() => {});
  assert.deepEqual(refreshed.getSnapshot().items, first.getSnapshot().items);
  assert.equal(refreshed.getSnapshot().isOpen, false);
  assert.equal(storage.writes, writes);
});

test("quantity changes affect only the selected row and never delete at one", () => {
  const storage = storageFixture();
  const store = createShopBagStore(() => storage);
  store.add(jeans);
  store.add(shirt);
  store.changeQuantity(bagItemKey(jeans), -1);
  assert.equal(store.getSnapshot().items[0].quantity, 1);
  store.changeQuantity(bagItemKey(shirt), 1);
  assert.deepEqual(store.getSnapshot().items.map((item) => item.quantity), [1, 2]);
  assert.deepEqual(bagTotals(store.getSnapshot().items), [{ currency: "USD", priceCents: 22998 }]);
});

test("explicit removal removes only its variant and persists remaining rows", () => {
  const storage = storageFixture();
  const store = createShopBagStore(() => storage);
  store.add(jeans);
  store.add({ ...jeans, size: "26" });
  store.add(shirt);
  store.remove(bagItemKey(jeans));
  const refreshed = createShopBagStore(() => storage);
  refreshed.subscribe(() => {});
  assert.deepEqual(refreshed.getSnapshot().items.map((item) => item.size), ["26", "M"]);
});

test("new additions do not overwrite another tab's saved items", () => {
  const storage = storageFixture();
  const first = createShopBagStore(() => storage);
  const second = createShopBagStore(() => storage);
  first.subscribe(() => {});
  second.subscribe(() => {});
  first.add(jeans);
  second.add(shirt);
  first.syncFromStorage();
  assert.deepEqual(first.getSnapshot().items.map((item) => item.productId), ["jeans", "shirt"]);
});

test("unavailable storage keeps all items in memory and reports the limitation", () => {
  const store = createShopBagStore(() => { throw new Error("blocked"); });
  store.add(jeans);
  store.add(shirt);
  store.setOpen(false);
  store.setOpen(true);
  assert.equal(store.getSnapshot().storageAvailable, false);
  assert.equal(store.getSnapshot().items.length, 2);
});

test("corrupted storage does not erase an existing in-memory bag", () => {
  const storage = storageFixture();
  const store = createShopBagStore(() => storage);
  store.add(jeans);
  storage.setItem(SHOP_BAG_STORAGE_KEY, "invalid json");
  store.syncFromStorage();
  assert.equal(store.getSnapshot().items.length, 1);
  assert.equal(store.getSnapshot().storageAvailable, false);
});

test("multiple currencies are totaled separately without conversion", () => {
  const storage = storageFixture();
  const store = createShopBagStore(() => storage);
  store.add(jeans);
  store.add({ ...shirt, currency: "EUR" });
  assert.deepEqual(bagTotals(store.getSnapshot().items), [
    { currency: "USD", priceCents: 13800 }, { currency: "EUR", priceCents: 4599 },
  ]);
  assert.equal(formatBagMoney(4599, "USD"), "$45.99");
});

test("variant metadata is a snapshot and a stable snapshot is returned between updates", () => {
  const storage = storageFixture();
  const store = createShopBagStore(() => storage);
  const selected = { ...jeans };
  store.add(selected);
  selected.size = "30";
  assert.equal(store.getSnapshot().items[0].size, "24");
  assert.equal(store.getSnapshot(), store.getSnapshot());
});
