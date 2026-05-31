"use client";

import { useAdminCustomers } from "../hooks/useAdminCustomers";
import type { AdminCustomerSource, CustomersViewModel } from "../types";
import { CustomersDesktop } from "./desktop/CustomersDesktop";
import { CustomersMobile } from "./mobile/CustomersMobile";

interface CustomersPageProps {
  initialView: CustomersViewModel;
  source: AdminCustomerSource;
}

export function CustomersPage({ initialView, source }: CustomersPageProps) {
  const customers = useAdminCustomers(initialView, source);

  return (
    <>
      <div className="hidden lg:block">
        <CustomersDesktop customers={customers} />
      </div>
      <div className="lg:hidden">
        <CustomersMobile customers={customers} />
      </div>
    </>
  );
}
