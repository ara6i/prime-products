import type {
  PdpStudioProfile,
} from "../types/pdpStudioPlatform";
import { pdpStudioApiRequest } from "./pdpStudioApiClient";

export async function getPdpStudioProfile(): Promise<PdpStudioProfile> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    profile: PdpStudioProfile;
  }>("/profile");
  return response.profile;
}

export async function updatePdpStudioProfile(input: {
  name?: string;
  workspaceName?: string;
  profilePhotoAssetId?: string | null;
}): Promise<PdpStudioProfile> {
  const response = await pdpStudioApiRequest<{
    ok: true;
    profile: PdpStudioProfile;
  }>("/profile", { method: "PATCH", body: JSON.stringify(input) });
  return response.profile;
}
