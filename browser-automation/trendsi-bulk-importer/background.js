"use strict";

const WORKER_PARAM = "psaWorker";
const MAX_CONCURRENT_SUBMISSIONS = 1;
const SUBMISSION_LEASE_MS = 5 * 60 * 1000;
const submissionLeases = new Map();
const submissionWaitQueue = [];
const intentionalWorkerClosures = new Set();
const WORKER_KEY_PREFIX = "psaTrendsiMultiV4:worker:";

function cleanSubmissionLeases() {
  const now = Date.now();
  for (const [workerId, expiresAt] of submissionLeases.entries()) {
    if (expiresAt <= now) submissionLeases.delete(workerId);
  }
  for (let index = submissionWaitQueue.length - 1; index >= 0; index -= 1) {
    if (submissionLeases.has(submissionWaitQueue[index]))
      submissionWaitQueue.splice(index, 1);
  }
}

function acquireSubmissionSlot(workerId) {
  cleanSubmissionLeases();
  if (submissionLeases.has(workerId)) {
    submissionLeases.set(workerId, Date.now() + SUBMISSION_LEASE_MS);
    return {
      acquired: true,
      active: submissionLeases.size,
      limit: MAX_CONCURRENT_SUBMISSIONS,
    };
  }
  if (!submissionWaitQueue.includes(workerId))
    submissionWaitQueue.push(workerId);
  if (
    submissionLeases.size < MAX_CONCURRENT_SUBMISSIONS &&
    submissionWaitQueue[0] === workerId
  ) {
    submissionWaitQueue.shift();
    submissionLeases.set(workerId, Date.now() + SUBMISSION_LEASE_MS);
    return {
      acquired: true,
      active: submissionLeases.size,
      limit: MAX_CONCURRENT_SUBMISSIONS,
    };
  }
  if (
    submissionLeases.size >= MAX_CONCURRENT_SUBMISSIONS ||
    submissionWaitQueue[0] !== workerId
  ) {
    return {
      acquired: false,
      active: submissionLeases.size,
      limit: MAX_CONCURRENT_SUBMISSIONS,
      position: submissionWaitQueue.indexOf(workerId) + 1,
      retryAfterMs: 1800 + Math.round(Math.random() * 2200),
    };
  }
  return {
    acquired: false,
    active: submissionLeases.size,
    limit: MAX_CONCURRENT_SUBMISSIONS,
  };
}

function releaseSubmissionSlot(workerId) {
  submissionLeases.delete(workerId);
  return {
    released: true,
    active: submissionLeases.size,
    limit: MAX_CONCURRENT_SUBMISSIONS,
  };
}

function workerIdFromUrl(urlValue) {
  try {
    return new URL(urlValue).searchParams.get(WORKER_PARAM) || "";
  } catch {
    return "";
  }
}

async function workerState(key) {
  const result = await chrome.storage.local.get([key]);
  return result[key] || null;
}

async function saveWorkerTab(key, worker, tabId) {
  if (!worker) return;
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
  workerTabIds.forEach((tabId) => intentionalWorkerClosures.add(tabId));
  if (workerTabIds.length) await chrome.tabs.remove(workerTabIds);
  submissionLeases.clear();
  submissionWaitQueue.splice(0, submissionWaitQueue.length);
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
  for (const descriptor of workers) {
    const state = await workerState(descriptor.key);
    const existing = await liveTab(state?.tabId);
    if (existing && workerIdFromUrl(existing.url) === descriptor.id) {
      reused.push(descriptor.id);
      continue;
    }
    const tab = await chrome.tabs.create({
      url: descriptor.url,
      active: false,
    });
    await saveWorkerTab(descriptor.key, state, tab.id);
    launched.push(descriptor.id);
  }
  return { launched, reused };
}

async function focusWorker(workerId, key) {
  const state = await workerState(key);
  const existing = await liveTab(state?.tabId);
  if (existing && workerIdFromUrl(existing.url) === workerId) {
    await chrome.tabs.update(existing.id, { active: true });
    if (Number.isInteger(existing.windowId))
      await chrome.windows.update(existing.windowId, { focused: true });
    return { reused: true };
  }
  if (!state) throw new Error(`Worker ${workerId} has no saved state.`);
  const url = new URL(state.baseUrl);
  url.searchParams.set("curPage", String(state.page));
  url.searchParams.set("stockGtList", "[50]");
  url.searchParams.set(WORKER_PARAM, workerId);
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
      const result = await closeDuplicateManagerTabs(sender.tab?.id);
      return { ok: true, ...result };
    }
    if (message?.type === "PSA_FOCUS_WORKER") {
      const result = await focusWorker(message.workerId, message.key);
      return { ok: true, ...result };
    }
    if (message?.type === "PSA_ACQUIRE_SUBMISSION_SLOT") {
      return { ok: true, ...acquireSubmissionSlot(message.workerId) };
    }
    if (message?.type === "PSA_RELEASE_SUBMISSION_SLOT") {
      return { ok: true, ...releaseSubmissionSlot(message.workerId) };
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
    await chrome.tabs.update(manager.id, { active: true });
    if (Number.isInteger(manager.windowId))
      await chrome.windows.update(manager.windowId, { focused: true });
    return;
  }
  await chrome.tabs.create({
    url: "https://www.trendsi.com/collections",
    active: true,
  });
});
