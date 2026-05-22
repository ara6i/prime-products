"use server";

import { customerFetch } from "@/app/customer/shared/services/customerFetch";
import type { CustomerDashboardRange, CustomerDashboardRawOverview } from "../types";

export async function getCustomerDashboardOverview(
  range: CustomerDashboardRange = "30d",
): Promise<CustomerDashboardRawOverview> {
  return customerFetch<CustomerDashboardRawOverview>(`/api/customer/dashboard/overview?range=${range}`);
}
