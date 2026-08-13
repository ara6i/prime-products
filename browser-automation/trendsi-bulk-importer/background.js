"use strict";

const WORKER_PARAM = "psaWorker";
const WORKER_VERSION_PARAM = "psaVersion";
const WORKER_VERSION = "5.7.0";
const MAX_CONCURRENT_SUBMISSIONS = 1;
const SUBMISSION_LEASE_MS = 5 * 60 * 1000;
const SUBMISSION_LEASE_KEY = "psaTrendsiMultiV4:submissionLease";
let submissionSlotMutation = Promise.resolve();
const intentionalWorkerClosures = new Set();
const WORKER_KEY_PREFIX = "psaTrendsiMultiV4:worker:";

function mutateSubmissionSlot(operation) {
  const result = submissionSlotMutation.then(operation, operation);
  submissionSlotMutation = result.catch(() => undefined);
  return result;
}

async function acquireSubmissionSlot(workerId) {
  return mutateSubmissionSlot(async () => {
    const stored = await chrome.storage.local.get([SUBMISSION_LEASE_KEY]);
    const lease = stored[SUBMISSION_LEASE_KEY] || null;
    const now = Date.now();
    const leaseActive = Number(lease?.expiresAt || 0) > now;
    if (leaseActive && lease.workerId !== workerId) {
      return {
        acquired: false,
        active: 1,
        limit: MAX_CONCURRENT_SUBMISSIONS,
        position: 1,
        retryAfterMs: 1800 + Math.round(Math.random() * 2200),
      };
    }
    await chrome.storage.local.set({
      [SUBMISSION_LEASE_KEY]: {
        workerId,
        expiresAt: now + SUBMISSION_LEASE_MS,
        updatedAt: new Date(now).toISOString(),
      },
    });
    return {
      acquired: true,
      active: 1,
      limit: MAX_CONCURRENT_SUBMISSIONS,
    };
  });
}

async function releaseSubmissionSlot(workerId) {
  return mutateSubmissionSlot(async () => {
    const stored = await chrome.storage.local.get([SUBMISSION_LEASE_KEY]);
    const lease = stored[SUBMISSION_LEASE_KEY] || null;
    if (!lease || lease.workerId === workerId) {
      await chrome.storage.local.remove([SUBMISSION_LEASE_KEY]);
      return { released: true, active: 0, limit: MAX_CONCURRENT_SUBMISSIONS };
    }
    return { released: false, active: 1, limit: MAX_CONCURRENT_SUBMISSIONS };
  });
}

function workerIdFromUrl(urlValue) {
  try {
    return new URL(urlValue).searchParams.get(WORKER_PARAM) || "";
  } catch {
    return "";
  }
}

function workerVersionFromUrl(urlValue) {
  try {
    return new URL(urlValue).searchParams.get(WORKER_VERSION_PARAM) || "";
  } catch {
    return "";
  }
}

async function closeTabsIntentionally(tabIds) {
  const ids = [...new Set(tabIds)].filter(Number.isInteger);
  ids.forEach((tabId) => intentionalWorkerClosures.add(tabId));
  if (ids.length) await chrome.tabs.remove(ids);
  return ids.length;
}

async function workerState(key) {
  const result = await chrome.storage.local.get([key]);
  return result[key] || null;
}

async function preventAutomaticDiscard(tabId) {
  if (!Number.isInteger(tabId)) return;
  try {
    await chrome.tabs.update(tabId, { autoDiscardable: false });
  } catch {
    // The tab may have closed between lookup and update.
  }
}

async function saveWorkerTab(key, worker, tabId) {
  if (!worker) return;
  await preventAutomaticDiscard(tabId);
  worker.tabId = tabId;
  worker.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ [key]: worker });
}

async function liveTab(tabId) {
  if (!Number.isInteger(tabId)) return null;
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

async function closeAllWorkerTabs() {
  const tabs = await chrome.tabs.query({ url: "https://www.trendsi.com/*" });
  const workerTabIds = tabs
    .filter((tab) => workerIdFromUrl(tab.url))
    .map((tab) => tab.id)
    .filter(Number.isInteger);
  await closeTabsIntentionally(workerTabIds);
  await chrome.storage.local.remove([SUBMISSION_LEASE_KEY]);
  return { closed: workerTabIds.length };
}

async function closeDuplicateManagerTabs(keepTabId) {
  const tabs = await chrome.tabs.query({ url: "https://www.trendsi.com/*" });
  const duplicateIds = tabs
    .filter((tab) => !workerIdFromUrl(tab.url) && tab.id !== keepTabId)
    .map((tab) => tab.id)
    .filter(Number.isInteger);
  if (duplicateIds.length) await chrome.tabs.remove(duplicateIds);
  return { closed: duplicateIds.length };
}

function workerUrl(worker) {
  const url = new URL(worker.baseUrl);
  url.searchParams.set("curPage", String(worker.page));
  url.searchParams.set("stockGtList", "[50]");
  url.searchParams.set(WORKER_PARAM, worker.id);
  url.searchParams.set(WORKER_VERSION_PARAM, WORKER_VERSION);
  return url.toString();
}

async function respawnClosedWorker(tabId) {
  if (intentionalWorkerClosures.delete(tabId)) return;
  const all = await chrome.storage.local.get(null);
  const entry = Object.entries(all).find(
    ([key, worker]) =>
      key.startsWith(WORKER_KEY_PREFIX) && worker?.tabId === tabId,
  );
  if (!entry) return;
  const [key, worker] = entry;
  if (!worker.running || worker.paused || worker.done) return;
  const tab = await chrome.tabs.create({
    url: workerUrl(worker),
    active: false,
  });
  await saveWorkerTab(key, worker, tab.id);
}

async function launchWorkers(workers) {
  const launched = [];
  const reused = [];
  const refreshed = [];
  let closedDuplicates = 0;
  for (const descriptor of workers) {
    const state = await workerState(descriptor.key);
    const tabs = await chrome.tabs.query({ url: "https://www.trendsi.com/*" });
    const candidates = tabs.filter(
      (tab) => workerIdFromUrl(tab.url) === descriptor.id,
    );
    const savedTab = candidates.find((tab) => tab.id === state?.tabId);
    const existing =
      savedTab ||
      [...candidates].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0] ||
      null;
    closedDuplicates += await closeTabsIntentionally(
      candidates
        .filter((tab) => tab.id !== existing?.id)
        .map((tab) => tab.id),
    );
    if (existing) {
      const needsRefresh =
        workerVersionFromUrl(existing.url) !== WORKER_VERSION ||
        existing.url !== descriptor.url;
      if (needsRefresh) {
        await chrome.tabs.update(existing.id, {
          url: descriptor.url,
          autoDiscardable: false,
        });
        refreshed.push(descriptor.id);
      } else {
        await preventAutomaticDiscard(existing.id);
        reused.push(descriptor.id);
      }
      await saveWorkerTab(descriptor.key, state, existing.id);
      continue;
    }
    const tab = await chrome.tabs.create({
      url: descriptor.url,
      active: false,
    });
    await saveWorkerTab(descriptor.key, state, tab.id);
    launched.push(descriptor.id);
  }
  return { launched, reused, refreshed, closedDuplicates };
}

async function focusWorker(workerId, key) {
  const state = await workerState(key);
  const existing = await liveTab(state?.tabId);
  if (existing && workerIdFromUrl(existing.url) === workerId) {
    const targetUrl = workerUrl(state);
    await chrome.tabs.update(existing.id, {
      active: true,
      autoDiscardable: false,
      ...(workerVersionFromUrl(existing.url) === WORKER_VERSION
        ? {}
        : { url: targetUrl }),
    });
    if (Number.isInteger(existing.windowId))
      await chrome.windows.update(existing.windowId, { focused: true });
    return { reused: true };
  }
  if (!state) throw new Error(`Worker ${workerId} has no saved state.`);
  const url = new URL(state.baseUrl);
  url.searchParams.set("curPage", String(state.page));
  url.searchParams.set("stockGtList", "[50]");
  url.searchParams.set(WORKER_PARAM, workerId);
  url.searchParams.set(WORKER_VERSION_PARAM, WORKER_VERSION);
  const tab = await chrome.tabs.create({ url: url.toString(), active: true });
  await saveWorkerTab(key, state, tab.id);
  return { reused: false };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handle = async () => {
    if (message?.type === "PSA_LAUNCH_WORKERS") {
      const result = await launchWorkers(
        Array.isArray(message.workers) ? message.workers : [],
      );
      return { ok: true, ...result };
    }
    if (message?.type === "PSA_CLOSE_ALL_WORKER_TABS") {
      const result = await closeAllWorkerTabs();
      return { ok: true, ...result };
    }
    if (message?.type === "PSA_CLOSE_DUPLICATE_MANAGER_TABS") {
      await preventAutomaticDiscard(sender.tab?.id);
      const result = await closeDuplicateManagerTabs(sender.tab?.id);
      return { ok: true, ...result };
    }
    if (message?.type === "PSA_FOCUS_WORKER") {
      const result = await focusWorker(message.workerId, message.key);
      return { ok: true, ...result };
    }
    if (message?.type === "PSA_ACQUIRE_SUBMISSION_SLOT") {
      return { ok: true, ...(await acquireSubmissionSlot(message.workerId)) };
    }
    if (message?.type === "PSA_RELEASE_SUBMISSION_SLOT") {
      return { ok: true, ...(await releaseSubmissionSlot(message.workerId)) };
    }
    return { ok: false, error: "Unknown message type." };
  };

  handle()
    .then(sendResponse)
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  setTimeout(() => respawnClosedWorker(tabId).catch(console.error), 1200);
});

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: "https://www.trendsi.com/*" });
  const manager = tabs.find((tab) => !workerIdFromUrl(tab.url));
  if (manager) {
    await chrome.tabs.update(manager.id, {
      active: true,
      autoDiscardable: false,
    });
    if (Number.isInteger(manager.windowId))
      await chrome.windows.update(manager.windowId, { focused: true });
    return;
  }
  const managerTab = await chrome.tabs.create({
    url: "https://www.trendsi.com/collections",
    active: true,
  });
  await preventAutomaticDiscard(managerTab.id);
});
