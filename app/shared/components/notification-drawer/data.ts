import type { NotificationItem } from "./types";

export const mockNotifications: NotificationItem[] = [
  {
    id: "1",
    type: "try-on-progress",
    title: "Try-on in progress",
    description: "Your outfit is being generated. This may take a few moments",
    timeAgo: "2m ago",
    isUnread: true,
  },
  {
    id: "2",
    type: "try-on-ready",
    title: "Your try-on is ready",
    description: "Your outfit has been generated and is ready to view",
    timeAgo: "2m ago",
    isUnread: false,
  },
  {
    id: "3",
    type: "try-on-failed",
    title: "Try-on failed",
    description:
      "We couldn\u2019t generate your outfit this time. No tokens were used",
    timeAgo: "2m ago",
    isUnread: false,
  },
  {
    id: "4",
    type: "tokens-added",
    title: "Tokens added successfully",
    description: "Your tokens are now available to use",
    timeAgo: "2m ago",
    isUnread: false,
  },
  {
    id: "5",
    type: "tokens-refunded",
    title: "Tokens refunded",
    description:
      "The generation couldn\u2019t be completed. Your tokens were returned to your wallet",
    timeAgo: "2m ago",
    isUnread: false,
  },
  {
    id: "6",
    type: "plan-active",
    title: "Your plan is active",
    description: "You can now enjoy all features included in your plan",
    timeAgo: "2m ago",
    isUnread: false,
  },
  {
    id: "7",
    type: "tokens-low",
    title: "You\u2019re running low on tokens",
    description:
      "You\u2019re about to run out of tokens. Add more to keep generating outfits",
    timeAgo: "2m ago",
    isUnread: false,
  },
  {
    id: "8",
    type: "plan-expiring",
    title: "Your plan expires soon",
    description: "Your plan will expire in 3 days",
    timeAgo: "2m ago",
    isUnread: false,
  },
];
