"use client";

import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { feature } from "topojson-client";
import styles from "./merchantReports.module.css";

export interface MerchantCountryMetric {
  code: string;
  name: string;
  visits: number;
  share: number;
}

interface MerchantCountriesWorldMapProps {
  countries: MerchantCountryMetric[];
}

interface MapCountry {
  id: string;
  code: string | null;
  name: string;
  path: string;
  visits: number;
  bucket: 0 | 1 | 2 | 3 | 4;
}

interface HoverState {
  country: MapCountry;
  x: number;
  y: number;
  maxX: number;
}

const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "124": "CA",
  "250": "FR",
  "276": "DE",
  "826": "GB",
  "840": "US",
};

function bucketize(visits: number, maximum: number): 0 | 1 | 2 | 3 | 4 {
  if (visits <= 0 || maximum <= 0) return 0;
  const ratio = visits / maximum;
  if (ratio > 0.75) return 4;
  if (ratio > 0.45) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}

export function MerchantCountriesWorldMap({
  countries,
}: MerchantCountriesWorldMapProps) {
  const [topology, setTopology] = useState<unknown>(null);
  const [loadError, setLoadError] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/data/world-110m.json")
      .then((response) => {
        if (!response.ok) throw new Error("World map data unavailable");
        return response.json();
      })
      .then((data: unknown) => {
        if (!cancelled) setTopology(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const mapCountries = useMemo<MapCountry[]>(() => {
    if (!topology) return [];

    const world = topology as {
      objects: { countries: unknown };
    };
    const collection = feature(
      topology as never,
      world.objects.countries as never,
    ) as unknown as FeatureCollection<Geometry, { name?: string }>;
    const width = 960;
    const height = 470;
    const projection = geoMercator()
      .scale(width / (2 * Math.PI))
      .center([0, 20])
      .translate([width / 2, height / 2]);
    const pathGenerator = geoPath(projection);
    const metricByCode = new Map(
      countries.map((country) => [country.code.toUpperCase(), country]),
    );
    const maximum = countries.reduce(
      (current, country) => Math.max(current, country.visits),
      0,
    );

    return collection.features.flatMap((countryFeature) => {
      const numeric = String(countryFeature.id ?? "").padStart(3, "0");
      const code = NUMERIC_TO_ALPHA2[numeric] ?? null;
      const metric = code ? metricByCode.get(code) : undefined;
      const path = pathGenerator(countryFeature as never);
      if (!path) return [];

      return [
        {
          id: numeric,
          code,
          name: metric?.name ?? countryFeature.properties?.name ?? "Country",
          path,
          visits: metric?.visits ?? 0,
          bucket: bucketize(metric?.visits ?? 0, maximum),
        },
      ];
    });
  }, [countries, topology]);

  const totalVisits = countries.reduce(
    (total, country) => total + country.visits,
    0,
  );

  const handleMove = (
    event: MouseEvent<SVGPathElement>,
    country: MapCountry,
  ) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    setHover({
      country,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      maxX: Math.max(0, bounds.width - 176),
    });
  };

  if (loadError) {
    return (
      <div className={styles.mapUnavailable} role="status">
        World map data could not be loaded.
      </div>
    );
  }

  if (!topology) {
    return (
      <div className={styles.mapLoading} role="status" aria-live="polite">
        Loading visitor map…
      </div>
    );
  }

  return (
    <div className={styles.worldMapModule}>
      <div className={styles.worldMapFrame} ref={containerRef}>
        <svg
          viewBox="0 0 960 470"
          className={styles.worldMap}
          aria-label="Visitor countries world map"
          onMouseLeave={() => setHover(null)}
        >
          <g>
            {mapCountries.map((country, index) => (
              <path
                key={country.id + "-" + index}
                d={country.path}
                data-bucket={country.bucket}
                data-active={country.visits > 0 ? "true" : "false"}
                onMouseEnter={(event) => handleMove(event, country)}
                onMouseMove={(event) => handleMove(event, country)}
              >
                <title>
                  {country.name +
                    ": " +
                    country.visits.toLocaleString() +
                    " visits"}
                </title>
              </path>
            ))}
          </g>
        </svg>

        {hover ? (
          <div
            className={styles.mapTooltip}
            role="tooltip"
            style={{
              left: Math.min(hover.x + 12, hover.maxX),
              top: Math.max(hover.y - 16, 6),
            }}
          >
            <span>{hover.country.code ?? "—"}</span>
            <div>
              <strong>{hover.country.name}</strong>
              <small>
                {hover.country.visits.toLocaleString()} product visits
              </small>
            </div>
          </div>
        ) : null}
      </div>

      <footer className={styles.mapLegend}>
        <div>
          <span>Less</span>
          {[1, 2, 3, 4].map((bucket) => (
            <i key={bucket} data-bucket={bucket} />
          ))}
          <span>More</span>
        </div>
        <strong>{totalVisits.toLocaleString()} mapped visits</strong>
      </footer>
    </div>
  );
}
