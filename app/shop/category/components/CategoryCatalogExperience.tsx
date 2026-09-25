"use client";

import { useCategoryCatalog } from "../hooks/useCategoryCatalog";
import type { CategoryCatalog } from "../types/categoryCatalog.types";
import { CategoryCatalogView } from "./CategoryCatalogView";

type CategoryCatalogExperienceProps = {
  catalog: CategoryCatalog;
  initialBrand?: string;
};

export function CategoryCatalogExperience({
  catalog,
  initialBrand,
}: CategoryCatalogExperienceProps) {
  const state = useCategoryCatalog(catalog, { initialBrand });
  return <CategoryCatalogView catalog={catalog} state={state} />;
}
