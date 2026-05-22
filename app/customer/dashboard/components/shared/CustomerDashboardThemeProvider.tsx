"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useCustomerDashboardTheme } from "../../hooks/useCustomerDashboardTheme";
import type { CustomerDashboardTheme } from "../../types";

interface CustomerDashboardThemeContextValue {
  theme: CustomerDashboardTheme;
  toggleTheme: () => void;
}

interface CustomerDashboardThemeProviderProps {
  children: ReactNode;
}

const CustomerDashboardThemeContext = createContext<CustomerDashboardThemeContextValue | null>(null);

export function CustomerDashboardThemeProvider({ children }: CustomerDashboardThemeProviderProps) {
  const value = useCustomerDashboardTheme();

  return (
    <CustomerDashboardThemeContext.Provider value={value}>
      <div data-customer-theme={value.theme} className="min-h-screen bg-customer-page text-text-primary transition-colors">
        {children}
      </div>
    </CustomerDashboardThemeContext.Provider>
  );
}

export function useCustomerDashboardThemeContext(): CustomerDashboardThemeContextValue {
  const context = useContext(CustomerDashboardThemeContext);
  if (!context) {
    throw new Error("useCustomerDashboardThemeContext must be used inside CustomerDashboardThemeProvider");
  }
  return context;
}
