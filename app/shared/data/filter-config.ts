import type {
  SortOption,
  FilterSectionConfig,
  FilterState,
  ColorFilterOption,
} from "@/app/shared/types";

export const SORT_OPTIONS: SortOption[] = [
  { value: "recommended", label: "Recommended" },
  { value: "most-used", label: "Most Used" },
  { value: "newest", label: "Newest" },
  { value: "price-low-high", label: "Price (Low-High)" },
  { value: "price-high-low", label: "Price (High - Low)" },
];

export const GENDER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "unisex", label: "Unisex" },
];

export const FILTER_SECTIONS: FilterSectionConfig[] = [
  {
    id: "categories",
    title: "Categories",
    type: "checkbox",
    showCount: true,
    options: [
      { value: "tops-shirts", label: "Tops & Shirt", count: 3 },
      { value: "blouse", label: "Blouse", count: 3 },
      { value: "sweater", label: "Sweater", count: 3 },
      { value: "jacket", label: "Jacket", count: 3 },
      { value: "coat", label: "Coat", count: 3 },
      { value: "blazer", label: "Blazer", count: 3 },
    ],
  },
  {
    id: "occasion",
    title: "Occasion",
    type: "checkbox",
    showCount: true,
    options: [
      { value: "casual", label: "Casual", count: 3 },
      { value: "everyday", label: "Everyday", count: 3 },
      { value: "formal", label: "Formal", count: 3 },
      { value: "party", label: "Party", count: 3 },
      { value: "work", label: "Work", count: 3 },
    ],
  },
  {
    id: "season",
    title: "Season",
    type: "checkbox",
    showCount: true,
    options: [
      { value: "all-season", label: "All Season", count: 3 },
      { value: "spring", label: "Spring", count: 3 },
      { value: "summer", label: "Summer", count: 3 },
      { value: "fall", label: "Fall", count: 3 },
      { value: "winter", label: "Winter", count: 3 },
    ],
  },
  {
    id: "fit",
    title: "Fit",
    type: "checkbox",
    showCount: true,
    options: [
      { value: "loose-fit", label: "Loose Fit", count: 3 },
      { value: "muscle-fit", label: "Muscle Fit", count: 3 },
      { value: "oversize", label: "Oversize", count: 3 },
      { value: "relaxed-fit", label: "Relaxed Fit", count: 3 },
      { value: "slim-fit", label: "Slim Fit", count: 3 },
    ],
  },
  {
    id: "material",
    title: "Material",
    type: "checkbox",
    showCount: true,
    hasViewAll: true,
    viewAllCount: 32,
    options: [
      { value: "cotton", label: "Cotton", count: 3 },
      { value: "chiffon", label: "Chiffon", count: 3 },
      { value: "crepe", label: "Crepe", count: 3 },
      { value: "denim", label: "Denim", count: 3 },
      { value: "cashmere", label: "Cashmere", count: 3 },
    ],
  },
  {
    id: "color",
    title: "Color",
    type: "checkbox-color",
    showCount: true,
    hasViewAll: true,
    viewAllCount: 32,
    options: [
      { value: "beige", label: "Beige", count: 3, swatchColor: "#F5F5DC" },
      { value: "black", label: "Black", count: 3, swatchColor: "#000000" },
      { value: "white", label: "White", count: 3, swatchColor: "#FFFFFF" },
      { value: "blue", label: "Blue", count: 3, swatchColor: "#41B0FF" },
      { value: "navy", label: "Navy", count: 3, swatchColor: "#0B3389" },
      { value: "grey", label: "Grey", count: 3, swatchColor: "#ABABAB" },
    ] as ColorFilterOption[],
  },
];

export const DEFAULT_FILTER_STATE: FilterState = {
  sort: "recommended",
  gender: "all",
  selectedFilters: {},
  priceRange: { min: 0, max: 0 },
};
