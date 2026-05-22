import "server-only";
import { geoMercator, geoPath } from "d3-geo";
import type { CustomerDashboardCountrySlice } from "../../types";
import { loadWorldCountries, numericToAlpha2 } from "./worldData";

export interface MapCountryPath {
  numeric: string;
  iso2: string | null;
  name: string;
  path: string;
  count: number;
  bucket: 0 | 1 | 2 | 3 | 4;
}

export interface PreparedMapData {
  width: number;
  height: number;
  countries: MapCountryPath[];
  legend: { max: number; thresholds: number[] };
}

function bucketize(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.45) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}

export async function prepareCustomerMapData(
  geoDistribution: CustomerDashboardCountrySlice[],
  width = 960,
  height = 480,
): Promise<PreparedMapData> {
  const collection = await loadWorldCountries();

  const projection = geoMercator()
    .scale(width / (2 * Math.PI))
    .center([0, 20])
    .translate([width / 2, height / 2]);

  const pathGen = geoPath(projection);

  const counts = new Map<string, number>();
  for (const g of geoDistribution) counts.set(g.iso2.toUpperCase(), g.count);

  const max = geoDistribution.reduce((m, g) => Math.max(m, g.count), 0);

  const countries: MapCountryPath[] = collection.features
    .map((f) => {
      const numeric = f.properties.numeric;
      const iso2 = numericToAlpha2(numeric);
      const count = iso2 ? counts.get(iso2) ?? 0 : 0;
      const path = pathGen(f as never);
      if (!path) return null;
      return {
        numeric,
        iso2,
        name: f.properties.name,
        path,
        count,
        bucket: bucketize(count, max),
      };
    })
    .filter((v): v is MapCountryPath => v !== null);

  const thresholds = [
    Math.max(1, Math.round(max * 0.2)),
    Math.max(1, Math.round(max * 0.45)),
    Math.max(1, Math.round(max * 0.75)),
    max,
  ];

  return {
    width,
    height,
    countries,
    legend: { max, thresholds },
  };
}
