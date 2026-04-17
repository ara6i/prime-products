import {
  DeleteIcon,
  ChevronRightSmallIcon,
} from "@/app/shared/components/icons";
import { NotificationCircleIcon } from "./NotificationCircleIcon";
import type { NotificationItem } from "./types";

const typesWithViewAction = new Set([
  "try-on-progress",
  "try-on-ready",
  "try-on-failed",
  "tokens-low",
  "plan-expiring",
  "stylist-ready",
  "payment-issue",
]);

interface NotificationCardProps {
  notification: NotificationItem;
  onDelete: (id: string) => void;
}

export function NotificationCard({
  notification,
  onDelete,
}: NotificationCardProps) {
  const hasViewAction = typesWithViewAction.has(notification.type);

  return (
    <div className="flex gap-[0.625vw] rounded-[1.042vw] border border-[#E6E6E6] bg-[#FAFAFA] p-[0.625vw] pb-[0.208vw]">
      <NotificationCircleIcon type={notification.type} />

      <div className="flex flex-1 flex-col gap-[0.208vw]">
        <div className="flex items-center gap-[0.208vw]">
          {notification.isUnread && (
            <span className="h-[0.313vw] w-[0.313vw] shrink-0 rounded-full bg-[#E7000B]" />
          )}
          <span className="flex-1 text-[0.729vw] font-medium leading-[1.146vw] text-text-primary">
            {notification.title}
          </span>
          <button
            onClick={() => onDelete(notification.id)}
            className="shrink-0 p-[0.104vw] transition-opacity hover:opacity-70"
          >
            <DeleteIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="#ADB1B3" />
          </button>
        </div>

        <p className="text-[0.625vw] leading-[1.042vw] text-[#4C5052]">
          {notification.description}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-[0.625vw] leading-[1.042vw] text-[#84898C]">
            {notification.timeAgo}
          </span>
          {hasViewAction && (
            <button className="flex items-center gap-[0.104vw] text-[0.625vw] leading-[1.042vw] text-brand-blue transition-opacity hover:opacity-80">
              View
              <ChevronRightSmallIcon size={14} className="!w-[0.729vw] !h-[0.729vw]" color="#2154EF" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
