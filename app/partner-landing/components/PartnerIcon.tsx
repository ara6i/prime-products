import {
  Bag,
  ArrowsClockwise,
  ChartLineUp,
  CheckCircle,
  FileText,
  IdentificationCard,
  LinkSimple,
  Package,
  Receipt,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Sparkle,
  SquaresFour,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import type { PartnerIconName } from "../types";

const ICONS = {
  bag: Bag,
  link: LinkSimple,
  wallet: Wallet,
  users: UsersThree,
  brief: FileText,
  approval: CheckCircle,
  chart: ChartLineUp,
  sparkle: Sparkle,
  profile: IdentificationCard,
  catalog: SquaresFour,
  product: Package,
  ruler: Ruler,
  cart: ShoppingCart,
  cycle: ArrowsClockwise,
  receipt: Receipt,
  shield: ShieldCheck,
};

export function PartnerIcon({ name, size = 22 }: { name: PartnerIconName; size?: number }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden size={size} weight="light" />;
}
