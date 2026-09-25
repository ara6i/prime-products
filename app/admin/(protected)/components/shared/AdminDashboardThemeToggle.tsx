"use client";

import { MoonIcon, SunIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { useAdminDashboardThemeContext } from "./AdminDashboardThemeProvider";

export function AdminDashboardThemeToggle() {
  const { theme, toggleTheme } = useAdminDashboardThemeContext();
  const isDark = theme === "dark";
  const Icon = isDark ? SunIcon : MoonIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-[2.292vw] rounded-full border border-customer-border bg-customer-card px-[0.833vw] text-customer-sm text-text-body hover:text-brand-blue max-lg:h-10 max-lg:w-10 max-lg:px-0"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon
        size={16}
        className="h-[0.833vw] w-[0.833vw] max-lg:h-4 max-lg:w-4"
      />
      <span className="max-lg:hidden">{isDark ? "Light" : "Dark"}</span>
    </Button>
  );
}
