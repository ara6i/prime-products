"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Shirt,
  X,
} from "lucide-react";
import { getStylistTryOnHistory } from "@/app/ai-stylist/services/stylist.service";
import type { StylistHistorySession } from "@/app/ai-stylist/types";

interface StylistHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onReopen: (session: StylistHistorySession) => void;
}

function sessionStatusLabel(session: StylistHistorySession): string {
  if (session.status === "completed") return "Completed";
  if (session.status === "partial") return "Partially completed";
  if (session.status === "failed") return "Failed";
  return "Processing";
}

export function StylistHistoryDrawer({
  open,
  onClose,
  onReopen,
}: StylistHistoryDrawerProps) {
  const [sessions, setSessions] = useState<StylistHistorySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) return [];
        setLoading(true);
        setError(null);
        return getStylistTryOnHistory();
      })
      .then((nextSessions) => {
        if (active) setSessions(nextSessions);
      })
      .catch((historyError) => {
        if (!active) return;
        setError(
          historyError instanceof Error
            ? historyError.message
            : "AI Stylist history could not be loaded.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[#191720]/35 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close history"
        onClick={onClose}
        className="absolute inset-0"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="stylist-history-title"
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#e4e2e8] px-5 py-4">
          <div>
            <h2
              id="stylist-history-title"
              className="text-base font-semibold text-[#24212c]"
            >
              AI Stylist History
            </h2>
            <p className="mt-0.5 text-xs text-[#77737f]">
              Reopen completed and partial try-on sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="rounded-full p-2 text-[#77737f] hover:bg-[#f2f0f5]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-[#77737f]">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#7258fa]" />
              Loading history…
            </div>
          ) : error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : sessions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Clock3 className="h-8 w-8 text-[#aaa6b0]" />
              <h3 className="mt-3 text-sm font-semibold text-[#24212c]">
                No stylist sessions yet
              </h3>
              <p className="mt-1 max-w-xs text-xs leading-5 text-[#77737f]">
                Your five-look try-on sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const usableJobs = session.jobs.filter(
                  (job) => job.status === "completed" && job.imageUrl,
                );
                const productCount = session.jobs.reduce(
                  (sum, job) => sum + (job.products?.length ?? 0),
                  0,
                );
                return (
                  <button
                    key={session.groupKey}
                    type="button"
                    onClick={() => onReopen(session)}
                    disabled={
                      usableJobs.length === 0 ||
                      (session.status !== "completed" &&
                        session.status !== "partial")
                    }
                    className="w-full rounded-2xl border border-[#e1dfe6] p-3 text-left transition hover:border-[#7258fa] hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#24212c]">
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(session.createdAt))}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#77737f]">
                          <Shirt className="h-3.5 w-3.5" />
                          {productCount} products
                        </p>
                      </div>
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          session.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : session.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {session.status === "completed" && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {sessionStatusLabel(session)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 5 }, (_, index) => {
                        const job = session.jobs[index];
                        return (
                          <div
                            key={job?.galleryId ?? index}
                            className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#f1f0f3]"
                          >
                            {job?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={job.imageUrl}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            ) : job?.status === "failed" ? (
                              <AlertCircle className="absolute inset-0 m-auto h-4 w-4 text-red-400" />
                            ) : (
                              <LoaderCircle className="absolute inset-0 m-auto h-4 w-4 animate-spin text-[#aaa6b0]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
