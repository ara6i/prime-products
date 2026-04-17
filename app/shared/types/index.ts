/** Base props for all SVG icon components */
export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Sidebar navigation item identifier */
export type NavItem =
  | "dashboard"
  | "ai-stylist"
  | "try-on"
  | "catalog"
  | "closet"
  | "billing"
  | "profile";

/** Sidebar navigation item configuration */
export interface NavItemConfig {
  id: NavItem;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

/** Sort option for filter drawer */
export interface SortOption {
  value: string;
  label: string;
}

/** A single filter option (checkbox) */
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/** A color filter option with a swatch */
export interface ColorFilterOption extends FilterOption {
  swatchColor: string;
}

/** Price range bounds */
export interface PriceRange {
  min: number;
  max: number;
}

/** Configuration for a single filter section */
export type FilterSectionType =
  | "radio"
  | "gender-pills"
  | "checkbox"
  | "checkbox-color"
  | "price-range";

export interface FilterSectionConfig {
  id: string;
  title: string;
  type: FilterSectionType;
  options: FilterOption[] | ColorFilterOption[];
  showCount?: boolean;
  hasViewAll?: boolean;
  viewAllCount?: number;
}

/** Weather pill data */
export interface WeatherData {
  location: string;
  temperature: string;
  icon: "cloud" | "sun" | "rain";
  condition: string;
}

/** Current state of all filters */
export interface FilterState {
  sort: string;
  gender: string;
  selectedFilters: Record<string, string[]>;
  priceRange: PriceRange;
}
