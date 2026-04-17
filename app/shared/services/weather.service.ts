export interface WeatherResponse {
  weather: {
    city: string;
    country: string;
    temperature: number;
    feelsLike: number;
    condition: string;
    description: string;
    humidity: number;
    windSpeed: number;
    isDaytime: boolean;
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
  };
  stylingAdvice: string;
  recommendedLayers: string[];
  avoidItems: string[];
  colorSuggestions: string[];
}

/** Auto-detect weather from IP */
export async function getAutoWeather(): Promise<WeatherResponse> {
  const res = await fetch("/api/weather/auto", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch weather");
  return res.json();
}

/** Get weather by coordinates */
export async function getWeatherByCoordinates(
  latitude: number,
  longitude: number
): Promise<WeatherResponse> {
  const res = await fetch("/api/weather/coordinates", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  if (!res.ok) throw new Error("Failed to fetch weather");
  return res.json();
}

/** Get weather by city */
export async function getWeatherByCity(
  city: string,
  country?: string
): Promise<WeatherResponse> {
  const res = await fetch("/api/weather/city", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, country }),
  });
  if (!res.ok) throw new Error("Failed to fetch weather");
  return res.json();
}
