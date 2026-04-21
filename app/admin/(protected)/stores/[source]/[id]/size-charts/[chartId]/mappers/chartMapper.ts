import type { SizeChartDetail } from "@/app/admin/shared/types";

type RawPayload = {
  chart?: unknown;
};

export function mapSizeChartDetail(raw: RawPayload | null | undefined): SizeChartDetail | null {
  if (!raw || !raw.chart) return null;
  return raw.chart as SizeChartDetail;
}
