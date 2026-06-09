"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MonitorPlay, RefreshCcw } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { AdminReplayDetailResponse, ReplaySessionCardView } from "../types";

const RRWEB_PLAYER_MODULE_URL = "https://cdn.jsdelivr.net/npm/rrweb-player@2.0.1/dist/rrweb-player.js";
const RRWEB_PLAYER_STYLE_URL = "https://cdn.jsdelivr.net/npm/rrweb-player@2.0.1/dist/style.css";

type RrwebPlayerInstance = {
  $destroy?: () => void;
};

type RrwebPlayerConstructor = new (options: {
  target: HTMLElement;
  props: {
    events: unknown[];
    width: number;
    height: number;
    autoPlay: boolean;
    showController: boolean;
  };
}) => RrwebPlayerInstance;

type RrwebPlayerModule = {
  default?: RrwebPlayerConstructor;
};

declare global {
  interface Window {
    rrwebPlayer?: RrwebPlayerConstructor;
  }
}

let playerLoadPromise: Promise<RrwebPlayerConstructor | null> | null = null;

async function importReplayPlayerModule(): Promise<RrwebPlayerModule> {
  return import(/* webpackIgnore: true */ RRWEB_PLAYER_MODULE_URL) as Promise<RrwebPlayerModule>;
}

function loadReplayPlayer(): Promise<RrwebPlayerConstructor | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.resolve(null);
  if (window.rrwebPlayer) return Promise.resolve(window.rrwebPlayer);
  if (playerLoadPromise) return playerLoadPromise;

  playerLoadPromise = (async () => {
    if (!document.getElementById("ps-rrweb-player-style")) {
      const link = document.createElement("link");
      link.id = "ps-rrweb-player-style";
      link.rel = "stylesheet";
      link.href = RRWEB_PLAYER_STYLE_URL;
      document.head.appendChild(link);
    }

    try {
      const module = await importReplayPlayerModule();
      const Player = module.default ?? window.rrwebPlayer ?? null;
      if (Player) window.rrwebPlayer = Player;
      return Player;
    } catch {
      return null;
    }
  })();

  return playerLoadPromise;
}

function formatReplayTitle(session: ReplaySessionCardView): string {
  return session.title.length > 72 ? `${session.title.slice(0, 69)}...` : session.title;
}

interface ReplaySessionsClientProps {
  sessions: ReplaySessionCardView[];
}

export function ReplaySessionsClient({ sessions }: ReplaySessionsClientProps) {
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.session.sessionId ?? "");
  const [detail, setDetail] = useState<AdminReplayDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerTargetRef = useRef<HTMLDivElement | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.session.sessionId === selectedSessionId) ?? sessions[0] ?? null,
    [selectedSessionId, sessions],
  );

  useEffect(() => {
    if (!selectedSession?.session.sessionId) {
      setDetail(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetch(`/api/admin/replays/${encodeURIComponent(selectedSession.session.sessionId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load replay");
        }
        return response.json() as Promise<AdminReplayDetailResponse>;
      })
      .then((nextDetail) => setDetail(nextDetail))
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setDetail(null);
        setError(requestError instanceof Error ? requestError.message : "Failed to load replay");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedSession?.session.sessionId]);

  useEffect(() => {
    const target = playerTargetRef.current;
    const events = detail?.events ?? [];
    if (!target || !events.length) {
      if (target) target.innerHTML = "";
      return;
    }

    let disposed = false;
    let instance: RrwebPlayerInstance | null = null;
    target.innerHTML = "";

    void loadReplayPlayer().then((Player) => {
      if (!Player || disposed || !playerTargetRef.current) {
        if (!Player && !disposed) setError("Replay player failed to load");
        return;
      }

      const bounds = playerTargetRef.current.getBoundingClientRect();
      const width = Math.max(320, Math.min(Math.floor(bounds.width || 900), 960));
      instance = new Player({
        target: playerTargetRef.current,
        props: {
          events,
          width,
          height: 560,
          autoPlay: false,
          showController: true,
        },
      });
    });

    return () => {
      disposed = true;
      try {
        instance?.$destroy?.();
      } catch {
        // Player cleanup should not break navigation.
      }
      if (target) target.innerHTML = "";
    };
  }, [detail?.events]);

  if (!sessions.length) {
    return (
      <section className="rounded-[var(--radius-customer-card)] border border-dashed border-customer-border bg-customer-card p-10 text-center">
        <MonitorPlay className="mx-auto h-10 w-10 text-brand-blue" />
        <h3 className="mt-4 text-xl font-semibold text-text-primary">No replay sessions yet</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-text-body">
          Open the SDK, upload a photo, enter values, or run a try-on. The next captured SDK session will appear here.
        </p>
      </section>
    );
  }

  return (
    <div className="grid min-h-[720px] gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Sessions</h3>
            <p className="mt-1 text-xs text-customer-muted">Latest captured SDK interactions</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-customer-border text-text-body hover:border-brand-blue/50 hover:text-brand-blue"
            aria-label="Refresh sessions"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
          {sessions.map((session) => {
            const active = session.session.sessionId === selectedSession?.session.sessionId;
            return (
              <button
                key={session.session.sessionId}
                type="button"
                onClick={() => setSelectedSessionId(session.session.sessionId)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-brand-blue bg-brand-blue/5 shadow-[0_12px_28px_rgba(37,89,255,0.12)]"
                    : "border-customer-border bg-white hover:border-brand-blue/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{formatReplayTitle(session)}</p>
                    <p className="mt-1 truncate text-xs text-customer-muted">{session.subtitle}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-customer-soft px-2.5 py-1 text-[11px] font-semibold text-brand-blue">
                    {session.sourceLabel}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded-xl bg-customer-soft px-3 py-2 text-text-body">{session.eventLabel}</span>
                  <span className="rounded-xl bg-customer-soft px-3 py-2 text-text-body">{session.durationLabel}</span>
                  <span className="col-span-2 rounded-xl bg-customer-soft px-3 py-2 text-text-body">{session.deviceLabel}</span>
                  <span className="col-span-2 text-customer-muted">Last activity {session.lastSeenLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-customer-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Replay</p>
            <h3 className="mt-2 text-2xl font-semibold text-text-primary">{selectedSession ? formatReplayTitle(selectedSession) : "Select a session"}</h3>
            {selectedSession ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body">
                {selectedSession.deviceLabel} · {selectedSession.eventLabel} · {selectedSession.durationLabel}
              </p>
            ) : null}
          </div>
          {selectedSession?.session.productUrl ? (
            <a
              href={selectedSession.session.productUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-customer-border bg-white px-4 py-2 text-sm font-semibold text-brand-blue hover:border-brand-blue/50"
            >
              Open product
            </a>
          ) : null}
        </div>

        <div className="mt-5 min-h-[600px] rounded-2xl border border-customer-border bg-[#f8fafc] p-3">
          {loading ? (
            <div className="flex min-h-[560px] items-center justify-center text-sm font-semibold text-text-body">Loading replay...</div>
          ) : error ? (
            <div className="flex min-h-[560px] items-center justify-center rounded-xl bg-white p-6 text-center text-sm font-semibold text-red-600">{error}</div>
          ) : detail?.events?.length ? (
            <div ref={playerTargetRef} className="min-h-[560px] overflow-hidden rounded-xl bg-white" />
          ) : (
            <div className="flex min-h-[560px] items-center justify-center rounded-xl bg-white p-6 text-center text-sm font-semibold text-text-body">
              This session has no playable events.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
