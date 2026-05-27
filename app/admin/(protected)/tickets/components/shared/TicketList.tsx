"use client";

import { CheckCircle2, Eye, Pin, PinOff } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { AdminTicketQueue, TicketListItem } from "../../types";
import { TicketToneBadge } from "./TicketToneBadge";

interface TicketListProps {
  items: TicketListItem[];
  selectedTicketId: string | null;
  onSelect: (id: string) => void;
  onSolve?: (id: string) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  queue?: AdminTicketQueue;
  onQueueChange?: (queue: AdminTicketQueue) => void;
  totalItems?: number;
  isLoading?: boolean;
  isUpdating?: boolean;
  mobile?: boolean;
}

function priorityTone(priority: TicketListItem["priority"]): "default" | "warning" | "danger" | "success" {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  if (priority === "low") return "success";
  return "default";
}

function statusTone(status: TicketListItem["status"]): "default" | "warning" | "danger" | "success" {
  if (status === "resolved" || status === "closed") return "success";
  return "danger";
}

const queueTabs: Array<{ label: string; value: AdminTicketQueue }> = [
  { label: "Pending", value: "pending" },
  { label: "Solved", value: "solved" },
];

export function TicketList({
  items,
  selectedTicketId,
  onSelect,
  onSolve,
  onTogglePin,
  queue,
  onQueueChange,
  totalItems = items.length,
  isLoading = false,
  isUpdating = false,
  mobile = false,
}: TicketListProps) {
  if (items.length === 0) {
    if (queue && onQueueChange) {
      return (
        <div className={mobile ? "space-y-[2.5vw]" : "overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card"}>
          <div className={mobile ? "flex items-center gap-[2vw] rounded-[5vw] border border-customer-border bg-customer-card p-[2vw]" : "flex items-center gap-[0.417vw] border-b border-customer-border px-[1.042vw] py-[0.729vw]"}>
            {queueTabs.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                variant={queue === tab.value ? "primary" : "ghost"}
                disabled={isLoading}
                onClick={() => onQueueChange(tab.value)}
                className={mobile
                  ? "h-[9vw] flex-1 cursor-pointer rounded-full px-[4vw] text-[3.2vw] font-semibold"
                  : "h-[2.188vw] cursor-pointer rounded-full px-[0.938vw] text-[clamp(12px,0.72vw,14px)] font-semibold"}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className={mobile ? "rounded-[5vw] border border-customer-border bg-customer-card p-[8vw] text-center" : "p-[2vw] text-center"}>
            <p className="text-[clamp(18px,1.15vw,22px)] font-semibold text-text-primary max-lg:text-[4.4vw]">{isLoading ? "Loading tickets" : "No tickets found"}</p>
            <p className="mt-[0.5vw] text-[clamp(14px,0.84vw,16px)] text-text-body max-lg:mt-[1.5vw] max-lg:text-[3.4vw]">Incoming support emails will appear here.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[2vw] text-center max-lg:rounded-[5vw] max-lg:p-[8vw]">
        <p className="text-[clamp(18px,1.15vw,22px)] font-semibold text-text-primary max-lg:text-[4.4vw]">{isLoading ? "Loading tickets" : "No tickets found"}</p>
        <p className="mt-[0.5vw] text-[clamp(14px,0.84vw,16px)] text-text-body max-lg:mt-[1.5vw] max-lg:text-[3.4vw]">Incoming support emails will appear here.</p>
      </div>
    );
  }

  if (!mobile) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
        {queue && onQueueChange ? (
          <div className="flex items-center gap-[0.417vw] border-b border-customer-border px-[1.042vw] py-[0.729vw]">
            {queueTabs.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                variant={queue === tab.value ? "primary" : "ghost"}
                disabled={isLoading}
                onClick={() => onQueueChange(tab.value)}
                className="h-[2.188vw] cursor-pointer rounded-full px-[0.938vw] text-[clamp(12px,0.72vw,14px)] font-semibold"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-b border-customer-border px-[1.042vw] py-[0.729vw]">
          <div>
            <p className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary">Inbox</p>
            <p className="mt-[0.2vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted">{totalItems.toLocaleString("en-US")} matching tickets</p>
          </div>
          <span className="rounded-full bg-customer-blue px-[0.625vw] py-[0.208vw] text-[clamp(11px,0.68vw,13px)] font-semibold text-brand-blue">
            {items.length} shown
          </span>
        </div>

        <div className="max-h-[calc(100vh-18.4vw)] overflow-y-auto">
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-customer-soft">
              <tr className="border-b border-customer-border text-left text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted">
                <th className="w-[5.7vw] px-[0.833vw] py-[0.521vw]">Date</th>
                <th className="w-[8.2vw] px-[0.833vw] py-[0.521vw]">Ticket ID</th>
                <th className="w-[6vw] px-[0.833vw] py-[0.521vw]">Type</th>
                <th className="px-[0.833vw] py-[0.521vw]">Subject</th>
                <th className="w-[9.4vw] px-[0.833vw] py-[0.521vw]">Customer</th>
                <th className="w-[6.4vw] px-[0.833vw] py-[0.521vw]">Status</th>
                <th className="w-[15vw] px-[0.833vw] py-[0.521vw]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = item.id === selectedTicketId;
                const canSolve = item.status !== "resolved" && item.status !== "closed";

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-customer-border last:border-b-0 ${isSelected ? "bg-customer-blue/60" : "bg-customer-card"}`}
                  >
                    <td className="px-[0.833vw] py-[0.625vw] align-middle">
                      <p className="truncate text-[clamp(12px,0.72vw,14px)] font-normal text-text-primary">{item.dateLabel}</p>
                    </td>
                    <td className="px-[0.833vw] py-[0.625vw] align-middle">
                      <div className="flex min-w-0 items-center gap-[0.313vw]">
                        {item.isPinned ? <Pin className="h-[0.729vw] w-[0.729vw] shrink-0 text-brand-blue" /> : null}
                        <p className="truncate text-[clamp(12px,0.72vw,14px)] font-medium text-text-primary">{item.ticketNumber}</p>
                      </div>
                    </td>
                    <td className="px-[0.833vw] py-[0.625vw] align-middle">
                      <p className="truncate text-[clamp(12px,0.72vw,14px)] font-normal text-text-body">{item.categoryLabel}</p>
                      <p className="mt-[0.104vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted">{item.sourceLabel}</p>
                    </td>
                    <td className="px-[0.833vw] py-[0.625vw] align-middle">
                      <p className="truncate text-[clamp(13px,0.78vw,15px)] font-medium text-text-primary">{item.subject}</p>
                      <p className="mt-[0.156vw] truncate text-[clamp(12px,0.72vw,14px)] font-normal text-text-body">{item.message}</p>
                    </td>
                    <td className="px-[0.833vw] py-[0.625vw] align-middle">
                      <p className="truncate text-[clamp(12px,0.72vw,14px)] font-medium text-text-primary">{item.requesterLabel}</p>
                      <p className="mt-[0.156vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted">{item.requesterMeta}</p>
                    </td>
                    <td className="px-[0.833vw] py-[0.625vw] align-middle">
                      <TicketToneBadge tone={statusTone(item.status)}>{item.statusLabel}</TicketToneBadge>
                    </td>
                    <td className="px-[0.833vw] py-[0.625vw] align-middle">
                      <div className="flex items-center gap-[0.313vw]">
                        <Button
                          type="button"
                          variant="ghost"
                          title="View ticket"
                          className="h-[1.875vw] cursor-pointer rounded-full px-[0.625vw] text-[clamp(11px,0.68vw,13px)] font-medium"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(item.id);
                          }}
                        >
                          <Eye className="h-[0.833vw] w-[0.833vw]" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isUpdating}
                          title={item.isPinned ? "Unpin ticket" : "Pin ticket"}
                          className="h-[1.875vw] cursor-pointer rounded-full px-[0.625vw] text-[clamp(11px,0.68vw,13px)] font-medium"
                          onClick={(event) => {
                            event.stopPropagation();
                            onTogglePin?.(item.id, item.isPinned);
                          }}
                        >
                          {item.isPinned ? <PinOff className="h-[0.833vw] w-[0.833vw]" /> : <Pin className="h-[0.833vw] w-[0.833vw]" />}
                          {item.isPinned ? "Unpin" : "Pin"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isUpdating || !canSolve}
                          title="Mark solved"
                          className="h-[1.875vw] cursor-pointer rounded-full px-[0.625vw] text-[clamp(11px,0.68vw,13px)] font-medium"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSolve?.(item.id);
                          }}
                        >
                          <CheckCircle2 className="h-[0.833vw] w-[0.833vw]" />
                          Solve
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const mobileList = (
    <div className="space-y-[2.5vw]">
      {items.map((item) => {
        const isSelected = item.id === selectedTicketId;

        return (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            onClick={() => onSelect(item.id)}
            className={`h-auto w-full flex-col items-stretch justify-start whitespace-normal rounded-[5vw] border bg-customer-card p-[4vw] text-left ${isSelected ? "border-brand-blue" : "border-customer-border"}`}
          >
            <div className="flex items-start justify-between gap-[0.833vw] max-lg:gap-[3vw]">
              <div className="min-w-0">
                <p className="truncate text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary max-lg:text-[4vw]">{item.subject}</p>
                <p className="mt-[0.25vw] truncate text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:mt-[1vw] max-lg:text-[3vw]">{item.requesterLabel} · {item.dateLabel}</p>
              </div>
              <TicketToneBadge tone={statusTone(item.status)}>{item.statusLabel}</TicketToneBadge>
            </div>

            <div className="mt-[0.625vw] flex flex-wrap gap-[0.417vw] max-lg:mt-[2vw] max-lg:gap-[1.5vw]">
              <TicketToneBadge tone={priorityTone(item.priority)}>{item.priorityLabel}</TicketToneBadge>
              <TicketToneBadge tone={item.emailTone}>{item.emailLabel}</TicketToneBadge>
            </div>

            <p className="mt-[0.625vw] line-clamp-2 text-[clamp(13px,0.78vw,15px)] leading-relaxed text-text-body max-lg:mt-[2vw] max-lg:text-[3.3vw]">{item.message}</p>

            <div className="mt-[0.625vw] flex items-center justify-between gap-[0.833vw] max-lg:mt-[2vw] max-lg:gap-[3vw]">
              <p className="truncate text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:text-[3vw]">{item.ticketNumber}</p>
              <p className="shrink-0 text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:text-[3vw]">{item.replyCount} replies</p>
            </div>

            <span className="sr-only">
              {item.sourceLabel} {item.categoryLabel} {item.updatedLabel} {item.requesterMeta}
            </span>
          </Button>
        );
      })}
    </div>
  );

  if (queue && onQueueChange) {
    return (
      <div className="space-y-[2.5vw]">
        <div className="flex items-center gap-[2vw] rounded-[5vw] border border-customer-border bg-customer-card p-[2vw]">
          {queueTabs.map((tab) => (
            <Button
              key={tab.value}
              type="button"
                variant={queue === tab.value ? "primary" : "ghost"}
                disabled={isLoading}
                onClick={() => onQueueChange(tab.value)}
                className="h-[9vw] flex-1 cursor-pointer rounded-full px-[4vw] text-[3.2vw] font-semibold"
            >
              {tab.label}
            </Button>
          ))}
        </div>
        {mobileList}
      </div>
    );
  }

  return mobileList;
}
