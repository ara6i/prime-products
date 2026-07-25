interface CachedInferenceEntry {
  group: string;
  expiresAt: number;
  createdAt: number;
  value: unknown;
}

interface LocalInferenceSchedulerState {
  tail: Promise<void>;
  inFlight: Map<string, Promise<unknown>>;
  cache: Map<string, CachedInferenceEntry>;
  activeLabel: string | null;
  lastFinishedAt: number;
}

const globalState = globalThis as typeof globalThis & {
  __primeStyleSizingLabInferenceScheduler?: LocalInferenceSchedulerState;
};

const state = globalState.__primeStyleSizingLabInferenceScheduler ?? {
  tail: Promise.resolve(),
  inFlight: new Map<string, Promise<unknown>>(),
  cache: new Map<string, CachedInferenceEntry>(),
  activeLabel: null,
  lastFinishedAt: 0,
};
globalState.__primeStyleSizingLabInferenceScheduler = state;

export interface CachedLocalInferenceResult<T> {
  value: T;
  cacheHit: boolean;
}

/**
 * One local Apple-silicon machine should not load Depth Pro and Meta at the
 * same time. This queue changes only execution order. Identical in-flight
 * work shares one Promise, so normal/full-screen panels cannot duplicate it.
 */
export async function runCachedLocalInference<T>(args: {
  key: string;
  label: string;
  cacheGroup: string;
  cacheTtlMs: number;
  cacheMaxEntries: number;
  cooldownMs?: number;
  task: () => Promise<T>;
}): Promise<CachedLocalInferenceResult<T>> {
  pruneExpiredCache();
  const cached = state.cache.get(args.key);
  if (cached && cached.expiresAt > Date.now()) {
    // Refresh LRU order without changing the cached value.
    cached.createdAt = Date.now();
    state.cache.delete(args.key);
    state.cache.set(args.key, cached);
    return { value: cached.value as T, cacheHit: true };
  }

  const existing = state.inFlight.get(args.key) as Promise<T> | undefined;
  if (existing) return { value: await existing, cacheHit: true };

  const previous = state.tail.catch(() => undefined);
  const taskPromise = (async () => {
    await previous;
    const cooldownMs = Math.max(0, args.cooldownMs ?? 200);
    const remainingCooldown = cooldownMs - (Date.now() - state.lastFinishedAt);
    if (state.lastFinishedAt > 0 && remainingCooldown > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingCooldown));
    }
    state.activeLabel = args.label;
    try {
      return await args.task();
    } finally {
      state.activeLabel = null;
      state.lastFinishedAt = Date.now();
    }
  })();

  state.inFlight.set(args.key, taskPromise);
  state.tail = taskPromise.then(() => undefined, () => undefined);
  try {
    const value = await taskPromise;
    state.cache.set(args.key, {
      group: args.cacheGroup,
      expiresAt: Date.now() + Math.max(0, args.cacheTtlMs),
      createdAt: Date.now(),
      value,
    });
    trimCacheGroup(args.cacheGroup, Math.max(1, args.cacheMaxEntries));
    return { value, cacheHit: false };
  } finally {
    if (state.inFlight.get(args.key) === taskPromise) state.inFlight.delete(args.key);
  }
}

function pruneExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of state.cache) {
    if (entry.expiresAt <= now) state.cache.delete(key);
  }
}

function trimCacheGroup(group: string, maximumEntries: number): void {
  const entries = [...state.cache.entries()]
    .filter(([, entry]) => entry.group === group)
    .sort((left, right) => left[1].createdAt - right[1].createdAt);
  while (entries.length > maximumEntries) {
    const oldest = entries.shift();
    if (oldest) state.cache.delete(oldest[0]);
  }
}
