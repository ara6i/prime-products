import { customerFetch } from "@/app/customer/shared/services/customerFetch";
import type { CustomerSettingsViewModel } from "../types/settings";

export async function getCustomerSettings(): Promise<CustomerSettingsViewModel> {
  return customerFetch<CustomerSettingsViewModel>("/api/customer/dashboard/settings");
}
