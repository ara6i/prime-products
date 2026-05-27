import type { ReactNode } from "react";
import {
  DashboardIcon,
  FileDownloadIcon,
  MonetizationOnIcon,
  NewChatIcon,
  PeopleIcon,
  SettingsIcon,
  TicketIcon,
} from "@/app/shared/components/icons";
import type { IconProps } from "@/app/shared/types";
import type { AdminDashboardIconKey } from "../../types";

interface AdminDashboardIconProps {
  name: AdminDashboardIconKey;
  size?: number;
  className?: string;
}

const iconMap = {
  dashboard: DashboardIcon,
  tickets: TicketIcon,
  chats: NewChatIcon,
  merchants: PeopleIcon,
  analytics: MonetizationOnIcon,
  reports: FileDownloadIcon,
  settings: SettingsIcon,
} satisfies Record<AdminDashboardIconKey, (props: IconProps) => ReactNode>;

export function AdminDashboardIcon({ name, size = 18, className }: AdminDashboardIconProps) {
  const Icon = iconMap[name];
  return <Icon size={size} className={className} />;
}
