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
      className="h-[2.292vw] rounded-full border border-customer-border bg-customer-card px-[0.833vw] text-customer-sm text-text-body hover:text-brand-blue max-lg:h-[10vw] max-lg:px-[3.6vw] max-lg:text-[3.2vw]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon size={16} className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
      {isDark ? "Light" : "Dark"}
    </Button>
  );
}
