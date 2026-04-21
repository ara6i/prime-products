import type { GeoPoint } from "@/app/admin/shared/types";
import { prepareMapData } from "./prepareMapData";
import { WorldMapInteractive } from "./WorldMapInteractive";

interface Props {
  data: GeoPoint[];
}

export async function WorldMap({ data }: Props) {
  const map = await prepareMapData(data);

  return (
    <WorldMapInteractive
      width={map.width}
      height={map.height}
      countries={map.countries}
      legendMax={map.legend.max}
    />
  );
}
