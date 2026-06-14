export interface PlatformServiceStatus {
  id: string;
  name: string;
  status: "operational" | "degraded" | string;
  detail?: string;
}

export interface PlatformStatusResponse {
  status: "operational" | "degraded" | string;
  generatedAt: string;
  services: PlatformServiceStatus[];
}

export interface PlatformStatusServiceItem {
  id: string;
  name: string;
  detail: string;
  label: string;
  tone: "success" | "warning";
}

export interface PlatformStatusViewModel {
  title: string;
  generatedAtLabel: string;
  services: PlatformStatusServiceItem[];
}
