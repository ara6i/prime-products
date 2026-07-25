import { getPdpStudioMe } from "../../shared/pdpStudioAuthService";
import { loadPdpStudioWorkspace } from "./loadPdpStudioWorkspace";

export async function loadPdpStudioPageContext() {
  const [user, view] = await Promise.all([
    getPdpStudioMe(),
    loadPdpStudioWorkspace(),
  ]);
  return { user, view };
}
