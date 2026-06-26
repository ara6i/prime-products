import type { LucideIcon } from "lucide-react";

export interface NavSection {
  id: string;
  title: string;
  icon?: LucideIcon;
  children?: NavItem[];
}

export interface NavItem {
  id: string;
  title: string;
  parentId: string;
}

export interface ParamDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface CodeExample {
  language: string;
  label: string;
  code: string;
}
