(() => {
  "use strict";

  const VERSION = "5.8.2";
  const ROOT_ID = "psa-trendsi-bot-root";
  const CONFIG_KEY = "psaTrendsiMultiV4:config";
  const GLOBAL_THROTTLE_KEY = "psaTrendsiMultiV4:globalThrottle";
  const WORKER_KEY_PREFIX = "psaTrendsiMultiV4:worker:";
  const WORKER_PARAM = "psaWorker";
  const WORKER_VERSION_PARAM = "psaVersion";
  const RANGE_COUNT = 2;
  const DEFAULT_WOMEN_START_PAGE = 1;
  const DEFAULT_ACTION_DELAY_MS = 7000;
  const DEFAULT_IMPORT_TIMEOUT_MINUTES = 12;
  const DEFAULT_LAUNCH_STAGGER_MS = 3000;
  const SUBMISSION_ATTEMPT_TIMEOUT_MS = 60 * 1000;
  const CONFIRMATION_RELOAD_MS = 20 * 1000;
  const MAX_PAGE_RETRIES_BEFORE_DEFER = 5;
  const WORKER_WATCHDOG_INTERVAL_MS = 10 * 1000;
  const WORKER_STALE_TIMEOUT_MS = 60 * 1000;
  const STORE_NAME = "PrimeStyleAI";
  const FASHION_CATALOG_IDS = new Set([
    "bags",
    "accessories",
    "fashion-jewelry",
  ]);

  const CATALOGS = [
    {
      id: "women",
      label: "Women",
      baseUrl:
        "https://www.trendsi.com/classify/Women?curPage=1&stockGtList=%5B50%5D",
    },
    {
      id: "men",
      label: "Men",
      baseUrl:
        "https://www.trendsi.com/classify/Men?curPage=1&stockGtList=%5B50%5D",
    },
    {
      id: "shoes",
      label: "Shoes",
      baseUrl:
        "https://www.trendsi.com/classify/Category/Shoes?curPage=1&stockGtList=%5B50%5D",
    },
    {
      id: "bags",
      label: "Bags",
      baseUrl:
        "https://www.trendsi.com/classify/Category/Bags?curPage=1&stockGtList=%5B50%5D",
    },
    {
      id: "accessories",
      label: "Accessories",
      baseUrl:
        "https://www.trendsi.com/classify/Category/Accessories?curPage=1&stockGtList=%5B50%5D",
    },
    {
      id: "fashion-jewelry",
      label: "Fashion Jewelry",
      baseUrl:
        "https://www.trendsi.com/classify/Category/Jewelry%20%26%20Beauty/Fashion%20Jewelry?curPage=1&stockGtList=%5B50%5D",
    },
  ];

  let runtimeBusy = false;
  let retryTimer = null;
  let panelCollapsed = false;
  let managerRenderTimer = null;
  let workerWatchdogTimer = null;
  let runtimeLastActivityAt = Date.now();

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const normalize = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function visible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function workerKey(workerId) {
    return `${WORKER_KEY_PREFIX}${workerId}`;
  }

  function currentWorkerId() {
    const queryWorker = new URL(window.location.href).searchParams.get(
      WORKER_PARAM,
    );
    if (queryWorker) {
      window.name = `psa-trendsi-worker:${queryWorker}`;
      return queryWorker;
    }
    const persisted = String(window.name || "").match(
      /^psa-trendsi-worker:(.+)$/,
    );
    return persisted?.[1] || "";
  }

  const storageGet = (keys) =>
    new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  const storageSet = (values) =>
    new Promise((resolve) => chrome.storage.local.set(values, resolve));
  const storageRemove = (keys) =>
    new Promise((resolve) => chrome.storage.local.remove(keys, resolve));

  async function readConfig() {
    const result = await storageGet([CONFIG_KEY]);
    return result[CONFIG_KEY] || null;
  }

  async function readWorker(workerId) {
    const key = workerKey(workerId);
    const result = await storageGet([key]);
    return result[key] || null;
  }

  async function writeWorker(worker) {
    worker.updatedAt = new Date().toISOString();
    if (currentWorkerId() === worker.id) runtimeLastActivityAt = Date.now();
    await storageSet({ [workerKey(worker.id)]: worker });
    if (currentWorkerId() === worker.id) renderWorker(worker);
  }

  async function readAllWorkers() {
    const all = await storageGet(null);
    return Object.entries(all)
      .filter(([key]) => key.startsWith(WORKER_KEY_PREFIX))
      .map(([, value]) => value)
      .filter(Boolean)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function createRunId() {
    const now = new Date();
    const two = (value) => String(value).padStart(2, "0");
    return `${String(now.getFullYear()).slice(-2)}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
  }

  function createWorkerDefinitions(womenStartPage, config) {
    const workers = [];
    let order = 0;
    for (const catalog of CATALOGS) {
      for (let rangeIndex = 0; rangeIndex < RANGE_COUNT; rangeIndex += 1) {
        const catalogStartPage =
          catalog.id === "women" ? womenStartPage : 1;
        workers.push({
          id: `${catalog.id}-${rangeIndex + 1}`,
          label: `${catalog.label} ${rangeIndex + 1}/${RANGE_COUNT}`,
          catalogId: catalog.id,
          catalogLabel: catalog.label,
          baseUrl: catalog.baseUrl,
          rangeIndex,
          rangeCount: RANGE_COUNT,
          order,
          catalogStartPage,
          rangeStart: 0,
          rangeEnd: 0,
          firstPage: catalogStartPage,
          page: catalogStartPage,
          pageCapacity: 90,
          totalItems: 0,
          totalPages: 0,
          running: false,
          paused: true,
          done: false,
          phase: "paused",
          startAfter: "",
          completedPages: [
            ...(config.completedPagesByCatalog?.[catalog.id] || []),
          ],
          submittedPages: [],
          submittedProducts: 0,
          deferredPages: [],
          retryAt: "",
          retryCount: 0,
          lastError: "",
          lastMessage: `Ready to detect range from page ${catalogStartPage}`,
          logs: [],
          runId: config.runId,
          config: {
            storeName: config.storeName,
            actionDelayMs: config.actionDelayMs,
            importTimeoutMinutes: config.importTimeoutMinutes,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        order += 1;
      }
    }
    workers.forEach((worker) => {
      const knownTotalPages = Number(
        config.totalPagesByCatalog?.[worker.catalogId] || 0,
      );
      if (knownTotalPages > 0) {
        worker.totalPages = knownTotalPages;
        assignWorkerRange(worker);
      }
      advancePastCompletedPages(worker);
    });
    return workers;
  }

  function assignWorkerRange(worker) {
    const totalPages = Math.max(0, Number(worker.totalPages) || 0);
    if (!totalPages) return false;
    const catalogStartPage = Math.max(
      1,
      Number(worker.catalogStartPage) || DEFAULT_WOMEN_START_PAGE,
    );
    const rangeCount = Math.max(1, Number(worker.rangeCount) || RANGE_COUNT);
    const rangeIndex = Math.min(
      rangeCount - 1,
      Math.max(0, Number(worker.rangeIndex) || 0),
    );
    const pageCount = Math.max(0, totalPages - catalogStartPage + 1);
    const baseSize = Math.floor(pageCount / rangeCount);
    const extraPages = pageCount % rangeCount;
    const pagesBefore =
      rangeIndex * baseSize + Math.min(rangeIndex, extraPages);
    const rangeSize = baseSize + (rangeIndex < extraPages ? 1 : 0);
    const rangeStart = catalogStartPage + pagesBefore;
    const rangeEnd = rangeStart + rangeSize - 1;
    const sameRange =
      Number(worker.rangeStart) === rangeStart &&
      Number(worker.rangeEnd) === rangeEnd;

    worker.rangeStart = rangeStart;
    worker.rangeEnd = rangeEnd;
    worker.firstPage = rangeStart;
    if (
      !sameRange ||
      Number(worker.page) < rangeStart ||
      Number(worker.page) > rangeEnd
    ) {
      worker.page = rangeStart;
    }
    return !sameRange;
  }

  function workerRangeEnd(worker) {
    return Math.max(
      0,
      Number(worker.rangeEnd) || Number(worker.totalPages) || 0,
    );
  }

  function workerFinished(worker) {
    const endPage = workerRangeEnd(worker);
    return endPage > 0 && Number(worker.page) > endPage;
  }

  function advancePastCompletedPages(worker) {
    const completed = new Set([
      ...(worker.completedPages || []),
      ...(worker.submittedPages || [])
        .map((entry) => Number(entry.page))
        .filter(Number.isFinite),
    ]);
    while (completed.has(worker.page) && !workerFinished(worker))
      worker.page += 1;
    return worker;
  }

  function completedPagesByCatalog(workers) {
    const result = Object.fromEntries(
      CATALOGS.map((catalog) => [catalog.id, new Set()]),
    );
    workers.forEach((worker) => {
      if (!result[worker.catalogId]) return;
      (worker.completedPages || []).forEach((page) =>
        result[worker.catalogId].add(Number(page)),
      );
      (worker.submittedPages || []).forEach((entry) =>
        result[worker.catalogId].add(Number(entry.page)),
      );
    });
    return Object.fromEntries(
      Object.entries(result).map(([catalogId, pages]) => [
        catalogId,
        [...pages].filter(Number.isFinite).sort((a, b) => a - b),
      ]),
    );
  }

  function submissionTotals(workers) {
    return {
      pages: workers.reduce(
        (sum, worker) => sum + (worker.submittedPages?.length || 0),
        0,
      ),
      products: workers.reduce(
        (sum, worker) => sum + Number(worker.submittedProducts || 0),
        0,
      ),
    };
  }

  function interleavedWorkers(workers) {
    const catalogOrder = new Map(
      CATALOGS.map((catalog, index) => [catalog.id, index]),
    );
    return [...workers].sort(
      (a, b) =>
        a.rangeIndex - b.rangeIndex ||
        (catalogOrder.get(a.catalogId) ?? 99) -
          (catalogOrder.get(b.catalogId) ?? 99),
    );
  }

  function appendLog(worker, message) {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    worker.logs = [...(worker.logs || []), `[${timestamp}] ${message}`].slice(
      -60,
    );
    worker.lastMessage = message;
  }

  function workerPageUrl(worker, page = worker.page) {
    const url = new URL(worker.baseUrl);
    url.searchParams.set("curPage", String(page));
    url.searchParams.set("stockGtList", "[50]");
    url.searchParams.set(WORKER_PARAM, worker.id);
    url.searchParams.set(WORKER_VERSION_PARAM, VERSION);
    return url.toString();
  }

  function sameWorkerPage(worker) {
    const current = new URL(window.location.href);
    const target = new URL(workerPageUrl(worker));
    return (
      current.pathname === target.pathname &&
      current.searchParams.get("curPage") ===
        target.searchParams.get("curPage") &&
      current.searchParams.get("stockGtList") === "[50]"
      && current.searchParams.get(WORKER_VERSION_PARAM) === VERSION
    );
  }

  function navigateWorker(worker) {
    const target = workerPageUrl(worker);
    if (
      !sameWorkerPage(worker) ||
      new URL(window.location.href).searchParams.get(WORKER_PARAM) !== worker.id
    ) {
      window.location.assign(target);
    }
  }

  function isSignedOut() {
    const url = new URL(window.location.href);
    if (
      url.searchParams.has("redirect") ||
      /\/login|\/signin/i.test(url.pathname)
    )
      return true;
    const signIn = [...document.querySelectorAll("a, button, div, span")].some(
      (element) =>
        visible(element) && normalize(element.textContent) === "Sign In",
    );
    return (
      signIn &&
      !document.querySelector(
        ".user-avatar, .account-avatar, [class*='user-info']",
      )
    );
  }

  async function waitFor(getter, timeoutMs = 15000, intervalMs = 200) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const result = getter();
      if (result) return result;
      await sleep(intervalMs);
    }
    return null;
  }

  async function waitForStableProductGrid(timeoutMs = 30000) {
    let previousCount = 0;
    let stableChecks = 0;
    return waitFor(
      () => {
        const count = document.querySelectorAll(".products-single").length;
        if (count > 0 && count === previousCount) stableChecks += 1;
        else stableChecks = 0;
        previousCount = count;
        return count > 0 && stableChecks >= 3 ? count : null;
      },
      timeoutMs,
      400,
    );
  }

  function exactText(root, selector, text) {
    return (
      [...root.querySelectorAll(selector)].find(
        (element) =>
          visible(element) && normalize(element.textContent) === text,
      ) || null
    );
  }

  function clickableExactText(root, text) {
    for (const selector of ["button", "span", "a", "div"]) {
      const match = [...root.querySelectorAll(selector)].find(
        (element) =>
          visible(element) && normalize(element.textContent) === text,
      );
      if (match) return match;
    }
    return null;
  }

  function visibleDialog(label) {
    return (
      [
        ...document.querySelectorAll(
          `[role="dialog"][aria-label="${CSS.escape(label)}"]`,
        ),
      ].find(visible) || null
    );
  }

  function visibleImportProgress() {
    const title = exactText(
      document,
      "div, span, p, strong",
      "Adding To Store",
    );
    if (!title || title.closest(`#${ROOT_ID}`)) return null;
    return (
      title.closest('[role="dialog"], .el-dialog, .el-dialog__wrapper') ||
      title.parentElement ||
      title
    );
  }

  function parsedImportProgress(progressDialog) {
    const text = normalize(progressDialog?.textContent);
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return {
      current: match ? Number(match[1]) : 0,
      total: match ? Number(match[2]) : 0,
      text,
    };
  }

  function closeCompletedImportProgress(progressDialog) {
    const close =
      progressDialog?.querySelector(
        ".el-dialog__headerbtn, [aria-label='Close'], .el-dialog__close",
      ) || null;
    if (close && visible(close)) close.click();
  }

  function toastText() {
    return [
      ...document.querySelectorAll(
        ".el-message, .el-notification, [role='alert']",
      ),
    ]
      .filter(visible)
      .map((element) => normalize(element.textContent))
      .filter(Boolean)
      .join(" | ");
  }

  function limitOrImportError() {
    const text = toastText();
    if (!text) return "";
    return /1000|sku|24\s*hours?|maximum|limit|failed|error|429|too many|rate|throttl|try again|temporar|too frequent|restricted/i.test(
      text,
    )
      ? text
      : "";
  }

  function parseSelectedCount() {
    const text = normalize(
      document.querySelector(".select-shop_action .rightshopnum")?.textContent,
    );
    const match = text.match(/(\d+)\s*(?:of\s+)?products?\s+selected/i);
    if (match) return Number(match[1]);
    return [...document.querySelectorAll(".products-single")].filter((card) =>
      card.querySelector(
        'input[type="checkbox"]:checked, [aria-checked="true"], .el-checkbox.is-checked',
      ),
    ).length;
  }

  function parseTotalItems() {
    const text = normalize(document.querySelector(".total-item")?.textContent);
    const match = text.match(/([\d,]+)\s+Items/i);
    return match ? Number(match[1].replace(/,/g, "")) : 0;
  }

  function productCardsOnPage() {
    return [...document.querySelectorAll(".products-single")];
  }

  function productIdForCard(card) {
    const anchor = card?.querySelector('a[href*="/products/detail?id="]');
    try {
      return anchor ? new URL(anchor.href).searchParams.get("id") : null;
    } catch {
      return null;
    }
  }

  function alreadyAddedToShopify(card) {
    return Boolean(
      card?.querySelector(
        ".collect.shopify.showicon, img.shopify.showicon[src*='productshopify']",
      ),
    );
  }

  function pageProductState() {
    const cards = productCardsOnPage();
    const existingIds = [];
    const missingIds = [];
    cards.forEach((card) => {
      const id = productIdForCard(card);
      if (!id) return;
      (alreadyAddedToShopify(card) ? existingIds : missingIds).push(id);
    });
    return {
      existingIds: [...new Set(existingIds)],
      missingIds: [...new Set(missingIds)],
    };
  }

  async function deselectAlreadyAddedProducts(existingIds) {
    for (const productId of existingIds) {
      const card = productCardsOnPage().find(
        (candidate) => productIdForCard(candidate) === productId,
      );
      if (!card?.classList.contains("_selectShop")) continue;
      // Clicking the outer card triggers Trendsi's selection handler without
      // following the product-detail link nested inside the card.
      card.click();
      await sleep(30);
    }
  }

  async function advanceSkippedPage(worker, existingCount) {
    const skippedPage = worker.page;
    worker.completedPages = [
      ...new Set([...(worker.completedPages || []), skippedPage]),
    ].sort((a, b) => a - b);
    worker.retryAt = "";
    worker.retryCount = 0;
    worker.lastError = "";
    worker.page += 1;
    advancePastCompletedPages(worker);
    appendLog(
      worker,
      `Skipped page ${skippedPage}: all ${existingCount} products already show the Shopify icon; next page ${worker.page}.`,
    );

    if (workerFinished(worker)) {
      worker.done = true;
      worker.running = false;
      worker.paused = true;
      worker.phase = "done";
      appendLog(
        worker,
        `Finished assigned range ${worker.rangeStart}-${worker.rangeEnd}.`,
      );
      await writeWorker(worker);
      return;
    }

    worker.phase = "collect";
    await writeWorker(worker);
    await sleep(400 + Math.round(Math.random() * 400));
    navigateWorker(worker);
  }

  async function deferCurrentPage(worker, message) {
    const deferredPage = Number(worker.page);
    const existing = (worker.deferredPages || []).filter((entry) => {
      const page = Number(typeof entry === "object" ? entry.page : entry);
      return page !== deferredPage;
    });
    worker.deferredPages = [
      ...existing,
      {
        page: deferredPage,
        reason: message,
        deferredAt: new Date().toISOString(),
      },
    ];
    const retryCount = Math.max(0, Number(worker.retryCount) || 0);
    worker.inFlight = null;
    worker.retryAt = "";
    worker.retryCount = 0;
    worker.lastError = message;
    worker.page += 1;
    advancePastCompletedPages(worker);
    appendLog(
      worker,
      `Deferred page ${deferredPage} after ${retryCount} failed attempts; continuing at page ${worker.page}.`,
    );

    if (workerFinished(worker)) {
      worker.done = true;
      worker.running = false;
      worker.paused = true;
      worker.phase = "done-with-deferred";
      appendLog(
        worker,
        `Finished assigned range with ${worker.deferredPages.length} deferred page(s) still needing a later rescan.`,
      );
      await writeWorker(worker);
      return;
    }

    worker.phase = "collect";
    await writeWorker(worker);
    await sleep(400 + Math.round(Math.random() * 400));
    navigateWorker(worker);
  }

  async function pacedDelay(worker, factor = 1) {
    const base = Math.max(
      3000,
      Number(worker.config.actionDelayMs) || DEFAULT_ACTION_DELAY_MS,
    );
    const jitter = 0.78 + Math.random() * 0.5;
    await sleep(Math.round(base * factor * jitter));
  }

  async function chooseDropdown(input, expectedText, deadline) {
    const remaining = (requestedMs) => {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0)
        throw new Error("Submission attempt exceeded 60 seconds.");
      return Math.min(requestedMs, remainingMs);
    };
    if (normalize(input.value) === expectedText) return;
    const automaticWaitMs = expectedText === STORE_NAME ? 2500 : 250;
    const automaticallySelected = await waitFor(
      () => normalize(input.value) === expectedText,
      remaining(automaticWaitMs),
      250,
    );
    if (automaticallySelected) return;
    const select = input.closest(".el-select");
    const dropdownOptions = () => {
      const candidates = [
        ...(select
          ? select.querySelectorAll(
              "li.el-select-dropdown__item, [role='option']",
            )
          : []),
        ...document.querySelectorAll(
          "li.el-select-dropdown__item, [role='option'], .el-select-dropdown li",
        ),
      ];
      return [...new Set(candidates)].filter(
        (item) => normalize(item.textContent) === expectedText,
      );
    };
    const optionInOpenMenu = (item) => {
      if (visible(item)) return true;
      const popup = item.closest(
        ".el-select-dropdown, .el-popper, [role='listbox']",
      );
      if (!popup || popup.getAttribute("aria-hidden") === "true") return false;
      const style = window.getComputedStyle(popup);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    const currentOption = (allowMountedFallback = false) => {
      if (normalize(input.value) === expectedText) return true;
      const candidates = dropdownOptions();
      return (
        candidates.find(visible) ||
        candidates.find(optionInOpenMenu) ||
        (allowMountedFallback ? candidates.at(-1) : null)
      );
    };
    const openDropdown = () => {
      input.focus({ preventScroll: true });
      input.click();
    };
    openDropdown();
    let option = await waitFor(
      () => currentOption(false),
      remaining(4000),
      150,
    );
    if (!option) {
      // Element UI can mount the real options before its popper receives a
      // measurable rectangle. Use the newest matching mounted option instead
      // of clicking the selector again and accidentally closing the menu.
      option = currentOption(true);
    }
    if (!option) {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
        }),
      );
      openDropdown();
      option = await waitFor(
        () => currentOption(true),
        remaining(4000),
        150,
      );
    }
    if (option === true) return;
    if (!option)
      throw new Error(`Dropdown option “${expectedText}” was not found.`);
    option.scrollIntoView({ block: "nearest" });
    option.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    option.click();
    const selected = await waitFor(
      () => normalize(input.value) === expectedText,
      remaining(5000),
      150,
    );
    if (!selected)
      throw new Error(`Dropdown did not select “${expectedText}”.`);
  }

  function statusInputInDialog(dialog) {
    const inputs = [
      ...dialog.querySelectorAll('input[placeholder="Select"]'),
    ].filter(visible);
    // Trendsi has reused `#box3` for different fields across dialog versions.
    // Prefer the input that already contains a Shopify status, then the field
    // whose surrounding label says Status. Treat the legacy id as a last resort
    // so we do not mistake Shopify Collections for product status.
    return (
      inputs.find((input) =>
        ["Active", "Draft"].includes(normalize(input.value)),
      ) ||
      inputs.find((input) => {
        const field =
          input.closest(
            ".el-form-item, .select-form-item, .form-item, .singel-select-item",
          ) || input.parentElement;
        return /status/i.test(normalize(field?.textContent));
      }) ||
      dialog.querySelector("input#box3") ||
      inputs[0] ||
      null
    );
  }

  async function acquireSubmissionSlot(worker) {
    const startedAt = Date.now();
    let queueMessageWritten = false;
    while (Date.now() - startedAt < 10 * 60 * 1000) {
      const latest = await readWorker(worker.id);
      if (!latest || latest.paused || !latest.running || latest.done)
        return false;
      const response = await sendRuntimeMessage({
        type: "PSA_ACQUIRE_SUBMISSION_SLOT",
        workerId: worker.id,
      });
      if (!response?.ok)
        throw new Error(response?.error || "Submission queue did not respond.");
      if (response.acquired) return true;
      if (!queueMessageWritten) {
        worker.phase = "queue";
        worker.lastMessage = `Waiting for a Trendsi submission slot (${response.active}/${response.limit} busy).`;
        await writeWorker(worker);
        queueMessageWritten = true;
      }
      await sleep(Math.max(1000, Number(response.retryAfterMs) || 2500));
    }
    throw new Error("Timed out waiting for a Trendsi submission slot.");
  }

  async function releaseSubmissionSlot(workerId) {
    try {
      await sendRuntimeMessage({
        type: "PSA_RELEASE_SUBMISSION_SLOT",
        workerId,
      });
    } catch (error) {
      console.warn(
        "[PrimeStyleAI Trendsi V4] Could not release submission slot",
        error,
      );
    }
  }

  async function renewSubmissionSlot(workerId) {
    const response = await sendRuntimeMessage({
      type: "PSA_ACQUIRE_SUBMISSION_SLOT",
      workerId,
    });
    if (!response?.ok || !response.acquired) {
      throw new Error(
        response?.error ||
          "Lost the exclusive Trendsi submission slot during Shopify import.",
      );
    }
  }

  async function waitForShopifyConfirmation(worker, selectedCount, productIds) {
    const expectedIds = [...new Set(productIds.filter(Boolean))];
    const expectedSet = new Set(expectedIds);
    const timeoutMs =
      Math.max(1, Number(worker.config.importTimeoutMinutes) || 12) *
      60 *
      1000;
    const startedAt =
      Date.parse(worker.inFlight?.startedAt || "") || Date.now();
    const deadline = startedAt + timeoutMs;
    let lastLeaseRenewal = 0;
    let lastStatusWrite = 0;
    let progressCurrent = 0;
    let progressTotal = selectedCount;
    let sawProgress = false;
    let sawCompleteProgress = false;
    let confirmedCount = 0;
    let reloadAt = Date.now() + CONFIRMATION_RELOAD_MS;

    while (Date.now() < deadline) {
      const error = limitOrImportError();
      if (error) throw new Error(error);

      if (Date.now() - lastLeaseRenewal >= 60 * 1000) {
        await renewSubmissionSlot(worker.id);
        lastLeaseRenewal = Date.now();
      }

      const progressDialog = visibleImportProgress();
      if (progressDialog) {
        sawProgress = true;
        const progress = parsedImportProgress(progressDialog);
        progressCurrent = Math.max(progressCurrent, progress.current);
        progressTotal = Math.max(
          progressTotal,
          progress.total || selectedCount,
        );
        if (
          progress.current > 0 &&
          progress.total > 0 &&
          progress.current >= progress.total
        ) {
          sawCompleteProgress = true;
          closeCompletedImportProgress(progressDialog);
        }
      }

      const currentState = pageProductState();
      confirmedCount = currentState.existingIds.filter((id) =>
        expectedSet.has(id),
      ).length;
      if (expectedIds.length > 0 && confirmedCount === expectedIds.length) {
        return { confirmedCount, progressCurrent, progressTotal };
      }

      if (Date.now() - lastStatusWrite >= 5000) {
        const controlState = await readWorker(worker.id);
        if (controlState) {
          worker.tabId = controlState.tabId;
          worker.running = controlState.running;
          worker.paused = controlState.paused;
        }
        worker.phase = "confirm";
        worker.lastError = "";
        worker.lastMessage = `Shopify import ${progressCurrent}/${progressTotal}; ${confirmedCount}/${expectedIds.length} icons confirmed.`;
        worker.inFlight = {
          ...(worker.inFlight || {}),
          page: worker.page,
          selectedCount,
          productIds: expectedIds,
          startedAt: new Date(startedAt).toISOString(),
          progressCurrent,
          progressTotal,
          confirmedCount,
          updatedAt: new Date().toISOString(),
        };
        await writeWorker(worker);
        lastStatusWrite = Date.now();
      }

      if (!progressDialog && Date.now() >= reloadAt) {
        appendLog(
          worker,
          `Reloading page ${worker.page} to refresh Shopify icons (${confirmedCount}/${expectedIds.length} confirmed).`,
        );
        await writeWorker(worker);
        window.location.reload();
        await new Promise(() => {});
      }

      await sleep(progressDialog ? 750 : 1250);
    }

    const progressStatus = sawProgress
      ? `${progressCurrent}/${progressTotal}`
      : "not detected";
    const completionStatus = sawCompleteProgress
      ? "Trendsi reached its final progress count, but Shopify icons never appeared."
      : "Trendsi never reached its final progress count.";
    worker.inFlight = null;
    await writeWorker(worker);
    throw new Error(
      `Shopify confirmation timed out: ${confirmedCount}/${expectedIds.length} product icons confirmed; import progress ${progressStatus}. ${completionStatus}`,
    );
  }

  async function completeShopifyConfirmedPage(
    worker,
    selectedCount,
    productIds,
    confirmation,
  ) {
    const controlState = await readWorker(worker.id);
    const pausedDuringSubmission = Boolean(
      controlState && (controlState.paused || !controlState.running),
    );
    if (controlState) {
      worker.tabId = controlState.tabId;
      worker.running = controlState.running;
      worker.paused = controlState.paused;
    }
    const submittedPage = worker.page;
    worker.submittedPages = [
      ...(worker.submittedPages || []),
      {
        page: submittedPage,
        selectedCount,
        productIds,
        submittedAt: new Date().toISOString(),
      },
    ].slice(-800);
    worker.submittedProducts =
      Number(worker.submittedProducts || 0) + selectedCount;
    worker.inFlight = null;
    worker.retryAt = "";
    worker.retryCount = 0;
    worker.lastError = "";
    worker.page += 1;
    advancePastCompletedPages(worker);
    appendLog(
      worker,
      `Shopify-confirmed page ${submittedPage} (${confirmation.confirmedCount}/${selectedCount} icons); next page ${worker.page}.`,
    );

    if (workerFinished(worker)) {
      worker.done = true;
      worker.running = false;
      worker.paused = true;
      worker.phase = "done";
      appendLog(
        worker,
        `Finished assigned range ${worker.rangeStart}-${worker.rangeEnd}.`,
      );
      await writeWorker(worker);
      return;
    }

    if (pausedDuringSubmission) {
      worker.phase = "paused";
      appendLog(worker, "Paused after the current page was Shopify-confirmed.");
      await writeWorker(worker);
      return;
    }

    worker.phase = "collect";
    await writeWorker(worker);
    await sleep(750 + Math.round(Math.random() * 800));
    navigateWorker(worker);
  }

  async function resumeShopifyConfirmation(worker) {
    if (!sameWorkerPage(worker)) {
      navigateWorker(worker);
      return;
    }
    await waitForStableProductGrid(30000);
    const inFlight = worker.inFlight || {};
    const productIds = [...new Set((inFlight.productIds || []).filter(Boolean))];
    const selectedCount = Number(inFlight.selectedCount) || productIds.length;
    if (!productIds.length || Number(inFlight.page) !== Number(worker.page)) {
      worker.inFlight = null;
      worker.phase = "collect";
      worker.lastError = "";
      await writeWorker(worker);
      await collectCurrentPage(worker);
      return;
    }

    const slotAcquired = await acquireSubmissionSlot(worker);
    if (!slotAcquired) return;
    try {
      worker.phase = "confirm";
      worker.lastError = "";
      worker.lastMessage = `Reloaded page ${worker.page}; verifying Shopify icons.`;
      await writeWorker(worker);
      const confirmation = await waitForShopifyConfirmation(
        worker,
        selectedCount,
        productIds,
      );
      await completeShopifyConfirmedPage(
        worker,
        selectedCount,
        productIds,
        confirmation,
      );
    } finally {
      await releaseSubmissionSlot(worker.id);
    }
  }

  async function submitCurrentPage(worker, selectedCount, productIds) {
    const slotAcquired = await acquireSubmissionSlot(worker);
    if (!slotAcquired) return;
    try {
      const attemptDeadline = Date.now() + SUBMISSION_ATTEMPT_TIMEOUT_MS;
      worker.phase = "submit";
      appendLog(
        worker,
        `Submitting page ${worker.page} with ${selectedCount} selected.`,
      );
      await writeWorker(worker);
      const attemptTimeout = (requestedMs) => {
        const remainingMs = attemptDeadline - Date.now();
        if (remainingMs <= 0)
          throw new Error("Submission attempt exceeded 60 seconds.");
        return Math.min(requestedMs, remainingMs);
      };
      const actionBar = document.querySelector(".select-shop_action");
      if (!actionBar)
        throw new Error("Bulk action bar disappeared before submission.");
      const addToStore =
        actionBar.querySelector(".AddToStore-btn") ||
        exactText(actionBar, "div, button, span", "Add to Store");
      if (!addToStore)
        throw new Error("Direct Add to Store control was not found.");

      await pacedDelay(worker, 0.6);
      addToStore.click();
      const dialog = await waitFor(
        () => visibleDialog("Add to Store"),
        attemptTimeout(20000),
      );
      if (!dialog) throw new Error("Direct Add to Store dialog did not open.");

      const storeInput = await waitFor(() => {
        const input = dialog.querySelector(
          'input[placeholder="Select Shopify"]',
        );
        return input && visible(input) ? input : null;
      }, attemptTimeout(30000));
      if (!storeInput) throw new Error("Shopify store selector was not found.");
      await chooseDropdown(
        storeInput,
        worker.config.storeName,
        attemptDeadline,
      );

      const statusInput = await waitFor(
        () => statusInputInDialog(dialog),
        attemptTimeout(30000),
      );
      if (!statusInput)
        throw new Error("Shopify product status selector was not found.");
      await chooseDropdown(statusInput, "Draft", attemptDeadline);

      const submit = await waitFor(() => {
        const button = dialog.querySelector(".export-to-shopify-singel-btn");
        return button && visible(button) ? button : null;
      }, attemptTimeout(30000));
      if (!submit) throw new Error("Final Add to Store control was not found.");

      await pacedDelay(worker, 0.75);
      submit.click();
      const started = await waitFor(
        () => {
          const error = limitOrImportError();
          if (error) throw new Error(error);
          return visibleImportProgress() || null;
        },
        attemptTimeout(20000),
        200,
      );
      if (!started)
        throw new Error(
          "Trendsi did not confirm that the Shopify import started.",
        );

      worker.phase = "confirm";
      worker.lastError = "";
      worker.inFlight = {
        page: worker.page,
        selectedCount,
        productIds: [...new Set(productIds.filter(Boolean))],
        startedAt: new Date().toISOString(),
        progressCurrent: 0,
        progressTotal: selectedCount,
        confirmedCount: 0,
        updatedAt: new Date().toISOString(),
      };
      await writeWorker(worker);

      const confirmation = await waitForShopifyConfirmation(
        worker,
        selectedCount,
        productIds,
      );

      await completeShopifyConfirmedPage(
        worker,
        selectedCount,
        productIds,
        confirmation,
      );
    } finally {
      await releaseSubmissionSlot(worker.id);
    }
  }

  async function collectCurrentPage(worker) {
    advancePastCompletedPages(worker);
    if (workerFinished(worker)) {
      worker.done = true;
      worker.running = false;
      worker.paused = true;
      worker.phase = "done";
      appendLog(
        worker,
        `No pages remain in range ${worker.rangeStart}-${worker.rangeEnd}.`,
      );
      await writeWorker(worker);
      return;
    }

    if (!sameWorkerPage(worker)) {
      worker.phase = "navigate";
      appendLog(worker, `Opening ${worker.catalogLabel} page ${worker.page}.`);
      await writeWorker(worker);
      navigateWorker(worker);
      return;
    }

    worker.phase = "collect";
    await writeWorker(worker);
    const [bulkButton, stableCardCount] = await Promise.all([
      waitFor(() => clickableExactText(document, "Bulk Select"), 30000),
      waitForStableProductGrid(30000),
    ]);

    const detectedTotal = parseTotalItems();
    if (detectedTotal) {
      worker.pageCapacity = Math.max(
        worker.pageCapacity || 0,
        stableCardCount || 0,
        90,
      );
      worker.totalItems = detectedTotal;
      worker.totalPages = Math.ceil(detectedTotal / worker.pageCapacity);
      const pageBeforeRangeAssignment = worker.page;
      const rangeChanged = assignWorkerRange(worker);
      advancePastCompletedPages(worker);
      if (rangeChanged) {
        appendLog(
          worker,
          `Assigned ${worker.catalogLabel} pages ${worker.rangeStart}-${worker.rangeEnd}.`,
        );
      }
      if (worker.page !== pageBeforeRangeAssignment) {
        worker.phase = "navigate";
        await writeWorker(worker);
        navigateWorker(worker);
        return;
      }
      if (rangeChanged) await writeWorker(worker);
    }
    if (!stableCardCount || !bulkButton) {
      const estimatedPages = detectedTotal
        ? Math.ceil(detectedTotal / Math.max(1, worker.pageCapacity || 90))
        : 0;
      if (estimatedPages > 0 && worker.page > estimatedPages) {
        worker.totalItems = detectedTotal;
        worker.totalPages = estimatedPages;
        worker.done = true;
        worker.running = false;
        worker.paused = true;
        worker.phase = "done";
        appendLog(
          worker,
          `Finished: catalog currently has ${estimatedPages} pages.`,
        );
        await writeWorker(worker);
        return;
      }
      throw new Error(
        "No stable product grid or Bulk Select control was found.",
      );
    }

    let actionBar = document.querySelector(".select-shop_action");
    for (
      let attempt = 0;
      attempt < 2 && (!actionBar || parseSelectedCount() === 0);
      attempt += 1
    ) {
      const currentBulkButton = clickableExactText(document, "Bulk Select");
      if (currentBulkButton) currentBulkButton.click();
      actionBar = await waitFor(
        () => {
          const bar = document.querySelector(".select-shop_action");
          return bar && parseSelectedCount() > 0 ? bar : null;
        },
        12000,
        200,
      );
      if (!actionBar) await sleep(1200);
    }
    if (!actionBar)
      throw new Error("Trendsi did not select the page products.");

    const pageState = pageProductState();
    if (pageState.existingIds.length) {
      await deselectAlreadyAddedProducts(pageState.existingIds);
      const selectionAdjusted = await waitFor(
        () => parseSelectedCount() === pageState.missingIds.length || null,
        8000,
        100,
      );
      if (!selectionAdjusted) {
        throw new Error(
          `Could not exclude ${pageState.existingIds.length} products already in Shopify.`,
        );
      }
    }

    const selectedCount = parseSelectedCount();
    const totalItems = parseTotalItems() || detectedTotal;
    worker.pageCapacity = Math.max(
      worker.pageCapacity || 0,
      stableCardCount || 0,
      selectedCount || 0,
      90,
    );
    if (totalItems && !worker.totalPages) {
      worker.totalItems = totalItems;
      worker.totalPages = Math.ceil(totalItems / worker.pageCapacity);
      assignWorkerRange(worker);
    }
    if (selectedCount === 0 && pageState.missingIds.length === 0) {
      await advanceSkippedPage(worker, pageState.existingIds.length);
      return;
    }
    if (selectedCount !== pageState.missingIds.length) {
      throw new Error(
        `Selection mismatch: Trendsi shows ${selectedCount}, expected ${pageState.missingIds.length} missing products.`,
      );
    }
    if (pageState.existingIds.length) {
      appendLog(
        worker,
        `Excluded ${pageState.existingIds.length} already in Shopify; ${selectedCount} missing products remain.`,
      );
    }
    await submitCurrentPage(worker, selectedCount, pageState.missingIds);
  }

  function retryDelayMs(message, retryCount) {
    if (
      /did not select the page products|stable product grid|Bulk Select/i.test(
        message,
      )
    ) {
      return Math.min(
        45000,
        5000 * 2 ** Math.min(Math.max(0, retryCount - 1), 3),
      );
    }
    if (
      /Dropdown option|Dropdown did not select|selector was not found|Submission attempt exceeded/i.test(
        message,
      )
    ) {
      return Math.min(
        45000,
        5000 * 2 ** Math.min(Math.max(0, retryCount - 1), 3),
      );
    }
    const throttled =
      /429|too many|rate|throttl|try again|temporar|too frequent|restricted/i.test(
        message,
      );
    const base = throttled ? 2 * 60 * 1000 : 30 * 1000;
    const maximum = 60 * 1000;
    return Math.min(
      maximum,
      base * 2 ** Math.min(Math.max(0, retryCount - 1), 8),
    );
  }

  async function setGlobalThrottle(message, blockedUntil) {
    const existing =
      (await storageGet([GLOBAL_THROTTLE_KEY]))[GLOBAL_THROTTLE_KEY] || {};
    const existingMs = Date.parse(existing.blockedUntil || "") || 0;
    const nextMs = Date.parse(blockedUntil) || 0;
    if (nextMs > existingMs) {
      await storageSet({
        [GLOBAL_THROTTLE_KEY]: {
          blockedUntil,
          message,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  }

  async function scheduleAutomaticRetry(worker, message) {
    if (worker.paused || !worker.running) {
      worker.lastError = message;
      worker.phase = "paused";
      appendLog(worker, `Paused after error: ${message}`);
      await writeWorker(worker);
      return;
    }
    if (/1000|sku.{0,30}limit|24\s*hours?/i.test(message)) {
      worker.running = false;
      worker.paused = true;
      worker.phase = "daily-limit";
      worker.retryAt = "";
      worker.lastError = message;
      appendLog(
        worker,
        `Daily SKU limit detected: ${message} Paused instead of retrying; resume after Trendsi resets the limit.`,
      );
      await writeWorker(worker);
      return;
    }
    worker.retryCount = Math.max(0, Number(worker.retryCount) || 0) + 1;
    const globalError =
      /1000|sku.{0,30}limit|24\s*hours?|429|too many|rate|throttl|too frequent|restricted/i.test(
        message,
      );
    const deferrableError =
      /did not select the page products|stable product grid|Bulk Select|Dropdown option|Dropdown did not select|selector was not found|Submission attempt exceeded|did not confirm that the Shopify import started/i.test(
        message,
      );
    if (
      deferrableError &&
      !globalError &&
      worker.retryCount >= MAX_PAGE_RETRIES_BEFORE_DEFER
    ) {
      await deferCurrentPage(worker, message);
      return;
    }
    const delayMs = retryDelayMs(message, worker.retryCount);
    worker.retryAt = new Date(Date.now() + delayMs).toISOString();
    worker.running = true;
    worker.paused = false;
    worker.phase = "retry";
    worker.lastError = message;
    if (globalError) await setGlobalThrottle(message, worker.retryAt);
    const waitLabel =
      delayMs < 60000
        ? `${Math.ceil(delayMs / 1000)} seconds`
        : `${Math.round(delayMs / 60000)} minutes`;
    appendLog(
      worker,
      `Retry ${worker.retryCount}: ${message} Waiting ${waitLabel}.`,
    );
    await writeWorker(worker);
    scheduleRetryTimer(worker);
  }

  function scheduleRetryTimer(worker) {
    if (retryTimer) clearTimeout(retryTimer);
    const retryAt =
      Date.parse(worker.retryAt || worker.startAfter || "") || Date.now();
    const waitMs = Math.max(500, Math.min(2147483000, retryAt - Date.now()));
    retryTimer = setTimeout(async () => {
      const latest = await readWorker(worker.id);
      if (!latest || !latest.running || latest.paused || latest.done) return;
      if (
        (Date.parse(latest.retryAt || latest.startAfter || "") || 0) >
        Date.now()
      ) {
        scheduleRetryTimer(latest);
        return;
      }
      latest.retryAt = "";
      latest.startAfter = "";
      await writeWorker(latest);
      window.location.reload();
    }, waitMs);
  }

  async function globalBlockedUntil() {
    const throttle = (await storageGet([GLOBAL_THROTTLE_KEY]))[
      GLOBAL_THROTTLE_KEY
    ];
    const until = Date.parse(throttle?.blockedUntil || "") || 0;
    return until > Date.now()
      ? { until, message: throttle.message || "Global throttle" }
      : null;
  }

  async function runWorker(workerId) {
    if (runtimeBusy) return;
    runtimeBusy = true;
    runtimeLastActivityAt = Date.now();
    let worker = await readWorker(workerId);
    try {
      if (!worker || !worker.running || worker.paused || worker.done) return;
      if (isSignedOut()) {
        worker.running = false;
        worker.paused = true;
        worker.phase = "signed-out";
        worker.lastError =
          "Trendsi is signed out. Sign in, then Resume all from the coordinator.";
        appendLog(worker, worker.lastError);
        await writeWorker(worker);
        return;
      }

      const localWaitUntil = Math.max(
        Date.parse(worker.startAfter || "") || 0,
        Date.parse(worker.retryAt || "") || 0,
      );
      const globalThrottle = await globalBlockedUntil();
      const waitUntil = Math.max(localWaitUntil, globalThrottle?.until || 0);
      if (waitUntil > Date.now()) {
        if (globalThrottle?.until === waitUntil) {
          worker.phase = "global-throttle";
          worker.lastMessage = `All workers waiting: ${globalThrottle.message}`;
          worker.retryAt = new Date(waitUntil).toISOString();
          await writeWorker(worker);
        }
        scheduleRetryTimer(worker);
        return;
      }

      worker.startAfter = "";
      worker.retryAt = "";
      if (worker.inFlight) await resumeShopifyConfirmation(worker);
      else await collectCurrentPage(worker);
    } catch (error) {
      worker = (await readWorker(workerId)) || worker;
      await scheduleAutomaticRetry(
        worker,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      runtimeBusy = false;
    }
  }

  function ensureRoot(mode) {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("section");
      root.id = ROOT_ID;
      document.documentElement.appendChild(root);
    }
    root.dataset.mode = mode;
    root.dataset.version = VERSION;
    root.classList.toggle("psa-collapsed", panelCollapsed);
    return root;
  }

  function bindCollapse(root) {
    root.querySelector(".psa-bot-collapse")?.addEventListener("click", () => {
      panelCollapsed = !panelCollapsed;
      root.classList.toggle("psa-collapsed", panelCollapsed);
      root.querySelector(".psa-bot-collapse").textContent = panelCollapsed
        ? "+"
        : "−";
    });
  }

  async function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError)
          reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
  }

  async function initializeAllWorkers(root) {
    if (isSignedOut()) {
      window.alert("Sign into Trendsi first, then launch the workers.");
      return;
    }
    const womenStartPage = Math.max(
      1,
      Number(root.querySelector("#psa-women-start-page")?.value) ||
        DEFAULT_WOMEN_START_PAGE,
    );
    const actionDelayMs = Math.max(
      3000,
      Number(root.querySelector("#psa-action-delay")?.value) ||
        DEFAULT_ACTION_DELAY_MS,
    );
    const runId = createRunId();
    const existingConfig = await readConfig();
    const existingWorkers = await readAllWorkers();
    const currentTotals = submissionTotals(existingWorkers);
    const config = {
      version: VERSION,
      runId,
      storeName: STORE_NAME,
      womenStartPage,
      actionDelayMs,
      importTimeoutMinutes: DEFAULT_IMPORT_TIMEOUT_MINUTES,
      launchStaggerMs: DEFAULT_LAUNCH_STAGGER_MS,
      // An explicit rebuild is a catalog rescan. The Shopify icon is the
      // source of truth, so previously accepted pages must be visited again.
      completedPagesByCatalog: Object.fromEntries(
        CATALOGS.map((catalog) => [catalog.id, []]),
      ),
      preservedSubmittedPages:
        Number(existingConfig?.preservedSubmittedPages || 0) +
        currentTotals.pages,
      preservedSubmittedProducts:
        Number(existingConfig?.preservedSubmittedProducts || 0) +
        currentTotals.products,
      startedAt: new Date().toISOString(),
    };
    const workers = createWorkerDefinitions(womenStartPage, config);
    const existingKeys = existingWorkers.map((worker) => workerKey(worker.id));
    if (existingKeys.length) await storageRemove(existingKeys);
    await storageSet({
      [CONFIG_KEY]: config,
      [GLOBAL_THROTTLE_KEY]: {
        blockedUntil: "",
        message: "",
        updatedAt: new Date().toISOString(),
      },
      ...Object.fromEntries(
        workers.map((worker) => [workerKey(worker.id), worker]),
      ),
    });
    await sendRuntimeMessage({ type: "PSA_CLOSE_ALL_WORKER_TABS" });
    await renderManager();
  }

  async function migrateToTwelveWorkers() {
    const [existingConfig, existingWorkers] = await Promise.all([
      readConfig(),
      readAllWorkers(),
    ]);
    const expectedCatalogIds = new Set(CATALOGS.map((catalog) => catalog.id));
    const expectedWorkerCount = CATALOGS.length * RANGE_COUNT;
    const alreadyMigrated =
      existingConfig?.version === VERSION &&
      existingWorkers.length === expectedWorkerCount &&
      existingWorkers.every(
        (worker) =>
          expectedCatalogIds.has(worker.catalogId) &&
          worker.rangeCount === RANGE_COUNT &&
          ((Number(worker.rangeStart) === 0 && Number(worker.rangeEnd) === 0) ||
            (Number(worker.rangeStart) > 0 &&
              Number(worker.rangeEnd) >= Number(worker.rangeStart))),
      );
    if (alreadyMigrated) return false;

    const requiresShoeConfirmationRescan =
      existingConfig?.version === "5.3.0";
    const womenStartPage = Math.max(
      1,
      Number(existingConfig?.womenStartPage) || DEFAULT_WOMEN_START_PAGE,
    );
    const migratedCompletedPages = completedPagesByCatalog(existingWorkers);
    if (requiresShoeConfirmationRescan) migratedCompletedPages.shoes = [];
    const config = {
      ...existingConfig,
      version: VERSION,
      runId: existingConfig?.runId || createRunId(),
      storeName: STORE_NAME,
      womenStartPage,
      actionDelayMs: Math.max(
        3000,
        Number(existingConfig?.actionDelayMs) || DEFAULT_ACTION_DELAY_MS,
      ),
      importTimeoutMinutes: DEFAULT_IMPORT_TIMEOUT_MINUTES,
      launchStaggerMs: DEFAULT_LAUNCH_STAGGER_MS,
      completedPagesByCatalog: migratedCompletedPages,
      migratedAt: new Date().toISOString(),
      startedAt: existingConfig?.startedAt || new Date().toISOString(),
    };
    const definitions = createWorkerDefinitions(womenStartPage, config);
    const existingById = new Map(
      existingWorkers.map((worker) => [worker.id, worker]),
    );
    const now = Date.now();
    const canAutoStartNewCatalogs = !isSignedOut();
    const workers = definitions.map((definition) => {
      const existing = existingById.get(definition.id);
      if (existing) {
        if (
          requiresShoeConfirmationRescan &&
          definition.catalogId === "shoes"
        ) {
          const worker = {
            ...existing,
            label: definition.label,
            catalogLabel: definition.catalogLabel,
            baseUrl: definition.baseUrl,
            rangeIndex: definition.rangeIndex,
            rangeCount: definition.rangeCount,
            order: definition.order,
            config: definition.config,
            page: Math.max(1, Number(existing.rangeStart) || 1),
            firstPage: Math.max(1, Number(existing.rangeStart) || 1),
            completedPages: [],
            submittedPages: [],
            submittedProducts: 0,
            running: true,
            paused: false,
            done: false,
            phase: "collect",
            retryAt: "",
            retryCount: 0,
            lastError: "",
            tabId: undefined,
            startAfter: new Date(
              now +
                (definition.rangeIndex + 1) * DEFAULT_LAUNCH_STAGGER_MS,
            ).toISOString(),
            updatedAt: new Date().toISOString(),
          };
          appendLog(
            worker,
            "V5.4 reset this Shoes range because earlier Adding To Store messages were not Shopify confirmation.",
          );
          return worker;
        }
        return {
          ...existing,
          label: definition.label,
          catalogLabel: definition.catalogLabel,
          baseUrl: definition.baseUrl,
          rangeIndex: definition.rangeIndex,
          rangeCount: definition.rangeCount,
          order: definition.order,
          config: definition.config,
          updatedAt: new Date().toISOString(),
        };
      }
      const isNewFashionCatalog = FASHION_CATALOG_IDS.has(
        definition.catalogId,
      );
      const autoStart = isNewFashionCatalog && canAutoStartNewCatalogs;
      const worker = {
        ...definition,
        running: autoStart,
        paused: !autoStart,
        phase: autoStart ? "collect" : "paused",
        startAfter:
          autoStart
            ? new Date(
                now +
                  (definition.rangeIndex + 1) * DEFAULT_LAUNCH_STAGGER_MS,
              ).toISOString()
            : "",
      };
      if (isNewFashionCatalog) {
        appendLog(
          worker,
          autoStart
            ? "Added and started automatically by the V5.8.2 bags, accessories, and jewelry upgrade."
            : "Added by V5.8.2. Sign into Trendsi, then run the six fashion-accessory workers.",
        );
      }
      return worker;
    });
    const expectedKeys = new Set(workers.map((worker) => workerKey(worker.id)));
    const obsoleteKeys = existingWorkers
      .map((worker) => workerKey(worker.id))
      .filter((key) => !expectedKeys.has(key));
    if (obsoleteKeys.length) await storageRemove(obsoleteKeys);
    await storageSet({
      [CONFIG_KEY]: config,
      ...Object.fromEntries(
        workers.map((worker) => [workerKey(worker.id), worker]),
      ),
    });
    const activeWorkers = workers.filter(
      (worker) => worker.running && !worker.paused && !worker.done,
    );
    if (activeWorkers.length) {
      await sendRuntimeMessage({
        type: "PSA_LAUNCH_WORKERS",
        workers: activeWorkers.map((worker) => ({
          id: worker.id,
          url: workerPageUrl(worker),
          key: workerKey(worker.id),
        })),
      });
    }
    return true;
  }

  async function setAllPaused(paused) {
    const workers = await readAllWorkers();
    if (!paused)
      await sendRuntimeMessage({ type: "PSA_CLOSE_ALL_WORKER_TABS" });
    const start = Date.now();
    const resumeOrder = new Map(
      interleavedWorkers(workers.filter((worker) => !worker.done)).map(
        (worker, index) => [worker.id, index],
      ),
    );
    const updates = {};
    workers.forEach((worker) => {
      if (worker.done) return;
      worker.running = !paused;
      worker.paused = paused;
      worker.phase = paused ? "paused" : "collect";
      worker.retryAt = "";
      worker.startAfter = paused
        ? ""
        : new Date(
            start + (resumeOrder.get(worker.id) ?? 0) * 1200,
          ).toISOString();
      if (!paused) worker.tabId = undefined;
      worker.lastError = "";
      appendLog(
        worker,
        paused ? "Paused from coordinator." : "Resumed from coordinator.",
      );
      updates[workerKey(worker.id)] = worker;
    });
    if (!paused) {
      updates[GLOBAL_THROTTLE_KEY] = {
        blockedUntil: "",
        message: "",
        updatedAt: new Date().toISOString(),
      };
    }
    await storageSet(updates);
    if (!paused) {
      await sendRuntimeMessage({
        type: "PSA_LAUNCH_WORKERS",
        workers: workers
          .filter((worker) => !worker.done)
          .map((worker) => ({
            id: worker.id,
            url: workerPageUrl(worker),
            key: workerKey(worker.id),
          })),
      });
    }
    await renderManager();
  }

  async function resumeCatalogWorkers(catalogIds) {
    const targetCatalogs = new Set(catalogIds);
    const workers = await readAllWorkers();
    const targets = workers.filter(
      (worker) => targetCatalogs.has(worker.catalogId) && !worker.done,
    );
    if (!targets.length) return renderManager();
    const start = Date.now();
    const updates = {};
    interleavedWorkers(targets).forEach((worker, index) => {
      worker.running = true;
      worker.paused = false;
      worker.phase = "collect";
      worker.retryAt = "";
      worker.startAfter = new Date(start + index * 1200).toISOString();
      worker.tabId = undefined;
      worker.lastError = "";
      appendLog(worker, "Started from the fashion-accessory coordinator.");
      updates[workerKey(worker.id)] = worker;
    });
    await storageSet(updates);
    await sendRuntimeMessage({
      type: "PSA_LAUNCH_WORKERS",
      workers: targets.map((worker) => ({
        id: worker.id,
        url: workerPageUrl(worker),
        key: workerKey(worker.id),
      })),
    });
    await renderManager();
  }

  async function focusWorker(workerId) {
    await sendRuntimeMessage({
      type: "PSA_FOCUS_WORKER",
      workerId,
      key: workerKey(workerId),
    });
  }

  function workerStateLabel(worker) {
    if (worker.done)
      return worker.deferredPages?.length
        ? `Done · ${worker.deferredPages.length} deferred`
        : "Done";
    if (worker.paused) return `Paused · ${worker.phase}`;
    return worker.phase || "running";
  }

  async function renderManager() {
    const root = ensureRoot("manager");
    const [config, workers, throttleRecord] = await Promise.all([
      readConfig(),
      readAllWorkers(),
      storageGet([GLOBAL_THROTTLE_KEY]),
    ]);
    const throttle = throttleRecord[GLOBAL_THROTTLE_KEY];
    const signedOut = isSignedOut();
    const active = workers.filter(
      (worker) => worker.running && !worker.paused && !worker.done,
    ).length;
    const done = workers.filter((worker) => worker.done).length;
    const fashionWorkers = workers.filter((worker) =>
      FASHION_CATALOG_IDS.has(worker.catalogId),
    );
    const activeFashionWorkers = fashionWorkers.filter(
      (worker) => worker.running && !worker.paused && !worker.done,
    ).length;
    const pendingFashionWorkers = fashionWorkers.filter(
      (worker) => !worker.done,
    ).length;
    const submittedPages =
      Number(config?.preservedSubmittedPages || 0) +
      workers.reduce(
        (sum, worker) => sum + (worker.submittedPages?.length || 0),
        0,
      );
    const attemptedProducts =
      Number(config?.preservedSubmittedProducts || 0) +
      workers.reduce(
        (sum, worker) => sum + Number(worker.submittedProducts || 0),
        0,
      );
    const workerRows = workers.length
      ? workers
          .map(
            (worker) => `
          <button class="psa-worker-row" data-worker-id="${escapeHtml(worker.id)}" type="button">
            <span><strong>${escapeHtml(worker.label)}</strong><small>${escapeHtml(workerStateLabel(worker))}</small></span>
            <span>Page <strong>${escapeHtml(worker.page)}</strong>${worker.totalPages ? ` / ${escapeHtml(worker.totalPages)}` : ""}<small>${worker.rangeStart ? `range ${escapeHtml(worker.rangeStart)}-${escapeHtml(worker.rangeEnd)} · ` : ""}${escapeHtml(worker.submittedPages?.length || 0)} recorded${worker.deferredPages?.length ? ` · ${escapeHtml(worker.deferredPages.length)} deferred` : ""}</small></span>
          </button>`,
          )
          .join("")
      : '<div class="psa-empty">No workers configured yet.</div>';
    const throttleUntil = Date.parse(throttle?.blockedUntil || "") || 0;
    const throttleText =
      throttleUntil > Date.now()
        ? `Global backoff until ${new Date(throttleUntil).toLocaleTimeString()}: ${throttle.message || "rate limit"}`
        : "No global throttle";

    root.innerHTML = `
      <div class="psa-bot-card">
        <div class="psa-bot-header">
          <div class="psa-bot-title">PrimeStyleAI Trendsi Bot · V${escapeHtml(VERSION)} · 12 Range Workers</div>
          <button class="psa-bot-collapse" type="button">${panelCollapsed ? "+" : "−"}</button>
        </div>
        <div class="psa-bot-body">
          <div class="psa-summary-grid">
            <div><small>Workers</small><strong>${active} active · ${done} done</strong></div>
            <div><small>Recorded attempts</small><strong>${submittedPages} pages · ${attemptedProducts.toLocaleString()} selected</strong></div>
          </div>
          <div class="psa-warning ${signedOut ? "psa-danger" : ""}">
            ${
              signedOut
                ? "Trendsi is signed out. Sign in before launching or resuming workers."
                : "Two workers each for Women, Men, Shoes, Bags, Accessories, and Fashion Jewelry. Shopify-marked products are skipped; only missing products above 50 inventory are submitted as Draft."
            }
          </div>
          <div class="psa-grid">
            <label class="psa-field">
              <span>Women start page</span>
              <input id="psa-women-start-page" type="number" min="1" value="${escapeHtml(config?.womenStartPage ?? DEFAULT_WOMEN_START_PAGE)}" ${active ? "disabled" : ""}>
            </label>
            <label class="psa-field">
              <span>Worker delay (ms)</span>
              <input id="psa-action-delay" type="number" min="3000" step="500" value="${escapeHtml(config?.actionDelayMs ?? DEFAULT_ACTION_DELAY_MS)}" ${active ? "disabled" : ""}>
            </label>
          </div>
          <div class="psa-throttle">${escapeHtml(throttleText)}</div>
          <div class="psa-manager-actions">
            <button id="psa-run-fashion" class="psa-button psa-primary" type="button" ${signedOut || !pendingFashionWorkers || activeFashionWorkers ? "disabled" : ""}>Run Bags + Accessories + Jewelry (6)</button>
            <button id="psa-launch-all" class="psa-button psa-secondary" type="button" ${signedOut || active ? "disabled" : ""}>${workers.length ? "Rescan all 12 workers" : "Create 12 workers"}</button>
            <button id="psa-pause-all" class="psa-button psa-secondary" type="button" ${!active ? "disabled" : ""}>Pause all</button>
            <button id="psa-resume-all" class="psa-button psa-secondary" type="button" ${signedOut || !workers.some((worker) => worker.paused && !worker.done) ? "disabled" : ""}>Resume all</button>
          </div>
          <div class="psa-worker-list">${workerRows}</div>
          <div class="psa-footnote">Set Women start page to 1 for a complete rescan. Each catalog is split into two non-overlapping page ranges; Shopify-icon products and fully imported pages are skipped automatically.</div>
          <div class="psa-footnote">Legacy Women and Men numbers are historical attempts, not Shopify proof. V5.8.2 closes duplicate worker tabs, counts new pages only after icon confirmation, restarts stale active workers, and defers a page after five repeated UI failures so one product cannot block a whole range.</div>
        </div>
      </div>`;
    bindCollapse(root);
    root
      .querySelector("#psa-launch-all")
      ?.addEventListener("click", async () => {
        if (
          workers.length &&
          !window.confirm(
            "Rescan Women from the selected start page, plus Men, Shoes, Bags, Accessories, and Fashion Jewelry from page 1? Shopify-icon products will be skipped, and existing Shopify products will not be deleted.",
          )
        )
          return;
        try {
          await initializeAllWorkers(root);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : String(error));
        }
      });
    root
      .querySelector("#psa-run-fashion")
      ?.addEventListener("click", () =>
        resumeCatalogWorkers([...FASHION_CATALOG_IDS]),
      );
    root
      .querySelector("#psa-pause-all")
      ?.addEventListener("click", () => setAllPaused(true));
    root
      .querySelector("#psa-resume-all")
      ?.addEventListener("click", () => setAllPaused(false));
    root.querySelectorAll(".psa-worker-row").forEach((row) => {
      row.addEventListener("click", () => focusWorker(row.dataset.workerId));
    });
  }

  function renderWorker(worker) {
    const root = ensureRoot("worker");
    const retryLabel = worker.retryAt
      ? new Date(worker.retryAt).toLocaleTimeString()
      : "—";
    root.innerHTML = `
      <div class="psa-bot-card">
        <div class="psa-bot-header">
          <div class="psa-bot-title">Trendsi Worker · V${escapeHtml(VERSION)} · ${escapeHtml(worker.label)}</div>
          <button class="psa-bot-collapse" type="button">${panelCollapsed ? "+" : "−"}</button>
        </div>
        <div class="psa-bot-body">
          <dl class="psa-status">
            <dt>State</dt><dd>${escapeHtml(workerStateLabel(worker))}</dd>
            <dt>Catalog</dt><dd>${escapeHtml(worker.catalogLabel)}</dd>
            <dt>Worker</dt><dd>${worker.rangeIndex + 1} of ${worker.rangeCount}</dd>
            <dt>Page</dt><dd>${escapeHtml(worker.page)}${worker.totalPages ? ` / ${escapeHtml(worker.totalPages)}` : " / detecting…"}</dd>
            <dt>Range</dt><dd>${worker.rangeStart ? `${escapeHtml(worker.rangeStart)}-${escapeHtml(worker.rangeEnd)}` : "Detecting…"}</dd>
            <dt>Submitted</dt><dd>${escapeHtml(worker.submittedPages?.length || 0)} pages · ${Number(worker.submittedProducts || 0).toLocaleString()} selected</dd>
            <dt>Deferred</dt><dd>${escapeHtml(worker.deferredPages?.length || 0)} pages</dd>
            <dt>Retry</dt><dd>${escapeHtml(retryLabel)}</dd>
            <dt>Last result</dt><dd>${escapeHtml(worker.lastError || worker.lastMessage)}</dd>
          </dl>
          <div class="psa-actions">
            <button id="psa-worker-pause" class="psa-button psa-secondary" type="button" ${worker.paused || worker.done ? "disabled" : ""}>Pause worker</button>
            <button id="psa-worker-resume" class="psa-button psa-primary" type="button" ${!worker.paused || worker.done || isSignedOut() ? "disabled" : ""}>Resume worker</button>
          </div>
          <div class="psa-log">${escapeHtml((worker.logs || []).slice(-12).join("\n") || "Waiting to start.")}</div>
          <div class="psa-footnote">This tab owns only its fixed page range. It advances after Shopify-icon confirmation, or defers a page after five repeated UI failures so the range can continue.</div>
        </div>
      </div>`;
    bindCollapse(root);
    root
      .querySelector("#psa-worker-pause")
      ?.addEventListener("click", async () => {
        const latest = await readWorker(worker.id);
        latest.running = false;
        latest.paused = true;
        latest.phase = "paused";
        latest.retryAt = "";
        appendLog(latest, "Paused from worker tab.");
        await writeWorker(latest);
      });
    root
      .querySelector("#psa-worker-resume")
      ?.addEventListener("click", async () => {
        const latest = await readWorker(worker.id);
        latest.running = true;
        latest.paused = false;
        latest.phase = "collect";
        latest.retryAt = "";
        latest.startAfter = new Date(Date.now() + 1000).toISOString();
        latest.lastError = "";
        appendLog(latest, "Resumed from worker tab.");
        await writeWorker(latest);
        setTimeout(() => runWorker(worker.id), 1200);
      });
  }

  function scheduleManagerRender() {
    if (managerRenderTimer) clearTimeout(managerRenderTimer);
    managerRenderTimer = setTimeout(
      () => renderManager().catch(console.error),
      180,
    );
  }

  function startWorkerWatchdog(workerId) {
    if (workerWatchdogTimer) clearInterval(workerWatchdogTimer);
    workerWatchdogTimer = setInterval(async () => {
      try {
        const worker = await readWorker(workerId);
        if (
          !worker ||
          !worker.running ||
          worker.paused ||
          worker.done ||
          !["collect", "confirm", "navigate"].includes(worker.phase)
        )
          return;
        const lastActivity = Math.max(
          runtimeLastActivityAt,
          Date.parse(worker.updatedAt || "") || 0,
        );
        if (Date.now() - lastActivity < WORKER_STALE_TIMEOUT_MS) return;
        runtimeBusy = false;
        worker.retryAt = "";
        worker.startAfter = "";
        worker.lastError = "";
        appendLog(
          worker,
          `Watchdog restarted stale ${worker.phase} processing without resetting page ${worker.page}.`,
        );
        await writeWorker(worker);
        void runWorker(workerId);
      } catch (error) {
        console.warn(`[PrimeStyleAI Trendsi V${VERSION}] watchdog`, error);
      }
    }, WORKER_WATCHDOG_INTERVAL_MS);
  }

  async function initialize() {
    const workerId = currentWorkerId();
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (!workerId) {
        if (
          Object.keys(changes).some(
            (key) =>
              key === CONFIG_KEY ||
              key === GLOBAL_THROTTLE_KEY ||
              key.startsWith(WORKER_KEY_PREFIX),
          )
        ) {
          scheduleManagerRender();
        }
        return;
      }
      const change = changes[workerKey(workerId)];
      if (!change?.newValue) return;
      renderWorker(change.newValue);
      if (
        change.newValue.running &&
        !change.newValue.paused &&
        !change.newValue.done &&
        !runtimeBusy
      ) {
        setTimeout(() => runWorker(workerId), 500);
      }
    });

    if (!workerId) {
      await sendRuntimeMessage({ type: "PSA_CLOSE_DUPLICATE_MANAGER_TABS" });
      await migrateToTwelveWorkers();
      await renderManager();
      return;
    }

    const worker = await readWorker(workerId);
    if (!worker) {
      const root = ensureRoot("worker");
      root.innerHTML = `<div class="psa-bot-card"><div class="psa-bot-header"><div class="psa-bot-title">Unknown Trendsi worker</div></div><div class="psa-bot-body">Return to the coordinator and launch workers again.</div></div>`;
      return;
    }
    renderWorker(worker);
    startWorkerWatchdog(workerId);
    if (worker.running && !worker.paused && !worker.done)
      setTimeout(() => runWorker(workerId), 800);
  }

  initialize().catch((error) =>
    console.error(`[PrimeStyleAI Trendsi V${VERSION}]`, error),
  );
})();
