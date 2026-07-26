import type { PdpStudioBrandKit } from "../types/pdpStudioPlatform";
import { pdpStudioApiRequest } from "./pdpStudioApiClient";

export async function getPdpStudioBrandKit(): Promise<PdpStudioBrandKit> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    brandKit: PdpStudioBrandKit;
  }>("/brand-kit");
  return response.brandKit;
}

export async function updatePdpStudioBrandKit(input: {
  name: string;
  description: string;
  website: string;
  instagram: string;
  writtenDirection: string;
  colors: string[];
  fonts: string[];
  logoAssetIds: string[];
  referenceAssetIds: string[];
}): Promise<PdpStudioBrandKit> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    brandKit: PdpStudioBrandKit;
  }>("/brand-kit", { method: "PUT", body: JSON.stringify(input) });
  return response.brandKit;
}
