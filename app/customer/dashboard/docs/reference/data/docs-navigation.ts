import {
  BookOpen,
  Zap,
  Puzzle,
  BookMarked,
} from "lucide-react";
import type { NavSection } from "../types";

export const docsNavigation: NavSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    icon: BookOpen,
  },
  {
    id: "quick-start",
    title: "Quick Start",
    icon: Zap,
  },
  {
    id: "sdk",
    title: "React SDK",
    icon: Puzzle,
    children: [
      { id: "sdk-installation", title: "Installation", parentId: "sdk" },
      { id: "sdk-component", title: "Component & Props", parentId: "sdk" },
      { id: "sdk-customization", title: "Customization", parentId: "sdk" },
      { id: "sdk-callbacks", title: "Callbacks", parentId: "sdk" },
      { id: "sdk-add-to-cart", title: "Add to Cart", parentId: "sdk" },
      { id: "sdk-headless", title: "Headless Sizing", parentId: "sdk" },
      { id: "sdk-profiles", title: "Profile Storage", parentId: "sdk" },
      { id: "sdk-env", title: "Environment Variables", parentId: "sdk" },
      { id: "sdk-i18n", title: "Internationalization (i18n)", parentId: "sdk" },
    ],
  },
  {
    id: "guides",
    title: "Guides",
    icon: BookMarked,
    children: [
      { id: "guide-own-size-guide", title: "Own Size Guide", parentId: "guides" },
      { id: "guide-events", title: "SDK Events", parentId: "guides" },
      { id: "guide-images", title: "Image Best Practices", parentId: "guides" },
      { id: "guide-loading", title: "Loading States", parentId: "guides" },
    ],
  },
];

export function getAllSectionIds(): string[] {
  const ids: string[] = [];
  for (const section of docsNavigation) {
    ids.push(section.id);
    if (section.children) {
      for (const child of section.children) {
        ids.push(child.id);
      }
    }
  }
  return ids;
}
