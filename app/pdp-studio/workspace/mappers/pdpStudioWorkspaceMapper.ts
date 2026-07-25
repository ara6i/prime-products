import type {
  PdpStudioAuditCatalog,
  PdpStudioCommandItem,
  PdpStudioWorkspaceView,
} from "../types";

export function mapPdpStudioWorkspaceView(
  catalog: PdpStudioAuditCatalog,
): PdpStudioWorkspaceView {
  const navigationCommands: PdpStudioCommandItem[] = catalog.navigation.flatMap((group) => [
    ...(group.routes ?? []).map((item) => ({
      id: `route-${item.id}`,
      label: item.label,
      description: "Open workspace page",
      href: item.href,
      icon: item.icon,
      keywords: [item.id, item.label, group.label ?? "navigation"],
    })),
    ...(group.actions ?? []).map((item) => ({
      id: `action-${item.id}`,
      label: item.label,
      description: "Open workspace panel",
      overlay: item.id,
      icon: item.icon,
      keywords: [item.id, item.label, group.label ?? "workspace"],
    })),
  ]);

  const toolCommands: PdpStudioCommandItem[] = catalog.tools.map((tool) => ({
    id: `tool-${tool.id}`,
    label: tool.label,
    description: tool.description,
    href: tool.href,
    icon: tool.icon,
    keywords: [tool.id, tool.label, tool.group, tool.description],
  }));

  return {
    catalog,
    commands: [...navigationCommands, ...toolCommands],
  };
}
