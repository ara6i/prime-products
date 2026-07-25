import type { PdpStudioNavGroup } from "../types";

export function getPrimaryPdpStudioNavigation(
  groups: PdpStudioNavGroup[],
): PdpStudioNavGroup[] {
  const routes = groups.flatMap((group) => group.routes ?? []);
  const actions = groups.flatMap((group) => group.actions ?? []);
  const route = (id: string) => routes.find((item) => item.id === id);
  const action = (id: string) => actions.find((item) => item.id === id);

  return [
    {
      routes: ["home", "ai-tools", "batch"].flatMap((id) => {
        const item = route(id);
        return item ? [item] : [];
      }),
      actions: ["activity"].flatMap((id) => {
        const item = action(id);
        return item ? [item] : [];
      }),
    },
    {
      label: "Content",
      routes: ["products", "designs", "brand-kit", "templates"].flatMap((id) => {
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
      actions: ["usage", "api"].flatMap((id) => {
        const item = action(id);
        return item ? [item] : [];
      }),
    },
  ];
}
