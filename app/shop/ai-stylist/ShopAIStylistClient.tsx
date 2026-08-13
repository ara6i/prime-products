"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AIStylistContent as DesktopAIStylistContent } from "@/app/ai-stylist/components/desktop/AIStylistContent";
import { AIStylistContent as MobileAIStylistContent } from "@/app/ai-stylist/components/mobile/AIStylistContent";
import { DeviceSwitch } from "@/app/shared/components/DeviceSwitch";
import { useWeather } from "@/app/shared/hooks/useWeather";
import styles from "./shopAIStylist.module.css";

const DESKTOP_DESIGN_WIDTH = 1920;

interface ShopAIStylistClientProps {
  initialIsMobile: boolean;
}

function subscribeToViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getViewportWidth() {
  return window.innerWidth;
}

function getServerViewportWidth() {
  return DESKTOP_DESIGN_WIDTH;
}

function DesktopStylistWorkspace() {
  const weather = useWeather();
  const viewportWidth = useSyncExternalStore(
    subscribeToViewport,
    getViewportWidth,
    getServerViewportWidth,
  );
  const uiScale = Math.min(
    1.35,
    Math.max(1, DESKTOP_DESIGN_WIDTH / viewportWidth),
  );

  return (
    <section className={styles.desktopViewport} aria-label="AI Stylist workspace">
      <div
        className={styles.desktopScale}
        style={uiScale > 1 ? { zoom: uiScale } : undefined}
      >
        <DesktopAIStylistContent
          weather={weather.weather}
          weatherContext={weather.weatherContext}
        />
      </div>
    </section>
  );
}

function MobileStylistWorkspace() {
  const weather = useWeather();

  return (
    <section className={styles.mobileViewport} aria-label="AI Stylist workspace">
      <MobileAIStylistContent
        weather={weather.weather}
        weatherContext={weather.weatherContext}
        isWeatherLoading={weather.isLoading}
      />
    </section>
  );
}

export function ShopAIStylistClient({
  initialIsMobile,
}: ShopAIStylistClientProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          className={styles.brand}
          href="/shop"
          aria-label="PrimeStyleAI shop home"
        >
          <Image
            src="/media/partner-landing/primestyleai-new-mark.png"
            alt=""
            width={1254}
            height={1254}
            sizes="34px"
            priority
          />
          <span>
            <strong>PrimeStyleAI</strong>
            <small>AI Stylist</small>
          </span>
        </Link>

        <div className={styles.title}>
          <Sparkles aria-hidden="true" />
          <span>Your personal outfit studio</span>
        </div>

        <Link className={styles.backLink} href="/shop">
          <ArrowLeft aria-hidden="true" />
          <span>Back to shop</span>
        </Link>
      </header>

      <DeviceSwitch
        initialIsMobile={initialIsMobile}
        desktop={<DesktopStylistWorkspace />}
        mobile={<MobileStylistWorkspace />}
      />
    </main>
  );
}
