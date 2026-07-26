import type { PdpStudioNavGroup } from "../types";

export function getPrimaryPdpStudioNavigation(
  groups: PdpStudioNavGroup[],
): PdpStudioNavGroup[] {
  const routes = groups.flatMap((group) => group.routes ?? []);
  const route = (id: string) => routes.find((item) => item.id === id);

  return [
    {
      routes: ["home", "ai-tools", "batch"].flatMap((id) => {
        const item = route(id);
        return item ? [item] : [];
      }),
    },
    {
      label: "Content",
      routes: ["products", "brand-kit"].flatMap((id) => {
        const item = route(id);
        return item ? [item] : [];
      }),
    },
    {
      label: "Workspace",
      routes: ["preferences"].flatMap((id) => {
        const item = route(id);
        return item ? [item] : [];
      }),
    },
  ];
}
