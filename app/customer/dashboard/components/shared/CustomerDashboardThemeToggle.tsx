"use client";

import { MoonIcon, SunIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { useCustomerDashboardThemeContext } from "./CustomerDashboardThemeProvider";

export function CustomerDashboardThemeToggle() {
  const { theme, toggleTheme } = useCustomerDashboardThemeContext();
  const isDark = theme === "dark";
  const Icon = isDark ? SunIcon : MoonIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-11 w-11 rounded-full border border-customer-border bg-customer-card p-0 text-brand-blue shadow-[0_12px_28px_rgba(33,84,239,0.06)] hover:bg-customer-blue [[data-customer-theme=dark]_&]:text-white max-lg:h-[10vw] max-lg:w-auto max-lg:px-[3.6vw] max-lg:text-[3.2vw]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon size={16} className="h-4 w-4 max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
      <span className="hidden max-lg:inline">{isDark ? "Light" : "Dark"}</span>
    </Button>
  );
}
