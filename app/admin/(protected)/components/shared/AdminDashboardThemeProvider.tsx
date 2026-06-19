"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAdminDashboardTheme } from "../../hooks/useAdminDashboardTheme";
import type { AdminDashboardTheme } from "../../types";

interface AdminDashboardThemeContextValue {
  theme: AdminDashboardTheme;
  toggleTheme: () => void;
}

interface AdminDashboardThemeProviderProps {
  children: ReactNode;
}

const AdminDashboardThemeContext = createContext<AdminDashboardThemeContextValue | null>(null);

export function AdminDashboardThemeProvider({ children }: AdminDashboardThemeProviderProps) {
  const value = useAdminDashboardTheme();

  return (
    <AdminDashboardThemeContext.Provider value={value}>
      <div
        data-admin-theme={value.theme}
        data-customer-theme={value.theme}
        className="min-h-screen bg-customer-page text-text-primary transition-colors"
      >
        {children}
      </div>
    </AdminDashboardThemeContext.Provider>
  );
}

export function useAdminDashboardThemeContext(): AdminDashboardThemeContextValue {
  const context = useContext(AdminDashboardThemeContext);
  if (!context) {
    throw new Error("useAdminDashboardThemeContext must be used inside AdminDashboardThemeProvider");
  }
  return context;
}
