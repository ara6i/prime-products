"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

interface DeviceSwitchProps {
  desktop: React.ReactNode;
  mobile: React.ReactNode;
  /**
   * Initial variant to render on the server. Pass the result of a
   * server-side User-Agent check (see app/page.tsx) to avoid a flash
   * on mobile devices. Defaults to `false` (desktop), which means
   * mobile devices may briefly see the desktop layout before the
   * client useEffect swaps them.
   *
   * IMPORTANT: this value MUST be the same on the server and on the
   * first client render — never branch it on `window`/`navigator`
   * inside a parent client component.
   */
  initialIsMobile?: boolean;
}

export function DeviceSwitch({
  desktop,
  mobile,
  initialIsMobile = false,
}: DeviceSwitchProps) {
  const [isMobile, setIsMobile] = useState(initialIsMobile);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return <>{isMobile ? mobile : desktop}</>;
}
