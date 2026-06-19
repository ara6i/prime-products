import type { ReactNode } from "react";
import Image from "next/image";
import {
  CameraIcon,
  DashboardIcon,
  FileDownloadIcon,
  HeadsetIcon,
  MonetizationOnIcon,
  NewChatIcon,
  PeopleIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TicketIcon,
  UserIcon,
} from "@/app/shared/components/icons";
import type { IconProps } from "@/app/shared/types";
import type { AdminDashboardIconKey } from "../../types";

interface AdminDashboardIconProps {
  name: AdminDashboardIconKey;
  size?: number;
  className?: string;
}

function ShopifyGlyphIcon({ size = 24, className }: IconProps) {
  return (
    <Image
      src="/images/landing/ps/shopify/glyph-color.svg"
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={className}
    />
  );
}

function PrimeStyleLogoIcon({ size = 24, className }: IconProps) {
  return (
    <Image
      src="/images/landing/optimized/logo-navbar-small.webp"
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={className}
    />
  );
}

const iconMap = {
  dashboard: DashboardIcon,
  revenue: MonetizationOnIcon,
  support: HeadsetIcon,
  customers: UserIcon,
  stores: ShoppingBagIcon,
  shopify: ShopifyGlyphIcon,
  sdk: PrimeStyleLogoIcon,
  tickets: TicketIcon,
  chats: NewChatIcon,
  merchants: PeopleIcon,
  behavior: CameraIcon,
  analytics: MonetizationOnIcon,
  reports: FileDownloadIcon,
  settings: SettingsIcon,
} satisfies Record<AdminDashboardIconKey, (props: IconProps) => ReactNode>;

export function AdminDashboardIcon({ name, size = 18, className }: AdminDashboardIconProps) {
  const Icon = iconMap[name];
  return <Icon size={size} className={className} />;
}
