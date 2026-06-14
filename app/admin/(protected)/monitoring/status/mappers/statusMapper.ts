import type { PlatformStatusResponse, PlatformStatusViewModel } from "../types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function mapPlatformStatus(response: PlatformStatusResponse): PlatformStatusViewModel {
  const isOperational = response.status === "operational";

  return {
    title: isOperational ? "All systems operational" : "Some systems degraded",
    generatedAtLabel: formatDate(response.generatedAt),
    services: response.services.map((service) => {
      const ok = service.status === "operational";
      return {
        id: service.id,
        name: service.name,
        detail: service.detail || "No detail",
        label: ok ? "Operational" : "Degraded",
        tone: ok ? "success" : "warning",
      };
    }),
  };
}
