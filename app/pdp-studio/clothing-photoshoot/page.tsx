import { ClothingPhotoShootPage } from "./components/ClothingPhotoShootPage";
import { mapClothingPhotoShootView } from "./mappers/clothingPhotoShootMapper";
import { getPdpStudioMe } from "../shared/pdpStudioAuthService";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clothing photoshoot - PDP Studio",
};

export default async function PdpStudioClothingPhotoShootRoute() {
  const user = await getPdpStudioMe();
  const view = mapClothingPhotoShootView();

  return <ClothingPhotoShootPage user={user} view={view} />;
}
