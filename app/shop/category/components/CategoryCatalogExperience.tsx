"use client";

import { useCategoryCatalog } from "../hooks/useCategoryCatalog";
import type { CategoryCatalog } from "../types/categoryCatalog.types";
import { CategoryCatalogView } from "./CategoryCatalogView";

type CategoryCatalogExperienceProps = {
  catalog: CategoryCatalog;
};

export function CategoryCatalogExperience({
  catalog,
}: CategoryCatalogExperienceProps) {
  const state = useCategoryCatalog(catalog);
  return <CategoryCatalogView catalog={catalog} state={state} />;
}
