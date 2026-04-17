"use client";

import { useState, useEffect, useRef } from "react";
import type { WeatherData } from "@/app/shared/types";
import {
  getAutoWeather,
  getWeatherByCoordinates,
  type WeatherResponse,
} from "@/app/shared/services/weather.service";

function mapConditionToIcon(
  condition: string
): "cloud" | "sun" | "rain" {
  const c = condition.toLowerCase();
  if (c.includes("rain") || c.includes("storm") || c.includes("drizzle"))
    return "rain";
  if (c.includes("clear") || c.includes("hot")) return "sun";
  return "cloud";
}

function toWeatherData(res: WeatherResponse): WeatherData {
  return {
    location: res.weather.city,
    temperature: `${Math.round(res.weather.temperature)}°C`,
    icon: mapConditionToIcon(res.weather.condition),
    condition: res.weather.description
      ? res.weather.description.charAt(0).toUpperCase() +
        res.weather.description.slice(1)
      : res.weather.condition,
  };
}

/** Build the weatherContext object the backend stylist endpoint expects */
function toWeatherContext(res: WeatherResponse) {
  return {
    city: res.weather.city,
    country: res.weather.country,
    temperature: res.weather.temperature,
    feelsLike: res.weather.feelsLike,
    condition: res.weather.condition,
    description: res.weather.description,
    humidity: res.weather.humidity,
    windSpeed: res.weather.windSpeed,
    timeOfDay: res.weather.timeOfDay,
    isDaytime: res.weather.isDaytime,
  };
}

interface UseWeatherReturn {
  weather: WeatherData | null;
  weatherContext: Record<string, unknown> | null;
  isLoading: boolean;
}

export function useWeather(): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherContext, setWeatherContext] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    async function fetchWeather() {
      try {
        // Try browser geolocation first for accuracy
        if ("geolocation" in navigator) {
          const pos = await new Promise<GeolocationPosition>(
            (resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                maximumAge: 300000,
              })
          );
          const res = await getWeatherByCoordinates(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setWeather(toWeatherData(res));
          setWeatherContext(toWeatherContext(res));
          setIsLoading(false);
          return;
        }
      } catch {
        // Geolocation denied or timed out — fall through to auto
      }

      try {
        const res = await getAutoWeather();
        setWeather(toWeatherData(res));
        setWeatherContext(toWeatherContext(res));
      } catch {
        // Weather unavailable — leave null
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeather();
  }, []);

  return { weather, weatherContext, isLoading };
}
