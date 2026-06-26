import type { ComponentType } from "react";
import type { IconProps } from "@/app/shared/types";
import {
  ApparelIcon,
  BillingIcon,
  CatalogIcon,
  DashboardIcon,
  DocumentationIcon,
  FileDownloadIcon,
  LightbulbIcon,
  MonetizationOnIcon,
  PeopleIcon,
  SecurityIcon,
  SettingsIcon,
  TryOnIcon,
  UndoIcon,
} from "@/app/shared/components/icons";
import type { CustomerDashboardIconKey } from "../../types";

interface CustomerDashboardIconProps extends IconProps {
  name: CustomerDashboardIconKey;
}

const iconMap: Record<CustomerDashboardIconKey, ComponentType<IconProps>> = {
  dashboard: DashboardIcon,
  conversion: MonetizationOnIcon,
  returns: UndoIcon,
  tryOn: TryOnIcon,
  sizing: ApparelIcon,
  api: SecurityIcon,
  docs: DocumentationIcon,
  security: SecurityIcon,
  billing: BillingIcon,
  settings: SettingsIcon,
  products: CatalogIcon,
  reports: FileDownloadIcon,
  behavior: PeopleIcon,
  insight: LightbulbIcon,
};

export function CustomerDashboardIcon({ name, ...props }: CustomerDashboardIconProps) {
  const Icon = iconMap[name];
  return <Icon {...props} />;
}
