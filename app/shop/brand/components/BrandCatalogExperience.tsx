"use client";

import { useBrandCatalog } from "../hooks/useBrandCatalog";
import type { BrandEditorialViewModel } from "../types/brandCatalog.types";
import { BrandCatalogSection } from "./BrandCatalogSection";
import { BrandEditorialLanding } from "./BrandEditorialLanding";
import styles from "./brandCatalog.module.css";

interface BrandCatalogExperienceProps {
  viewModel: BrandEditorialViewModel;
}

export function BrandCatalogExperience({
  viewModel,
}: BrandCatalogExperienceProps) {
  const controller = useBrandCatalog(viewModel.catalog.products);

  function handleCategorySelect(category: string | null) {
    controller.selectCategory(category);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.requestAnimationFrame(() => {
      document.getElementById("collection")?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.canvas}>
        <BrandEditorialLanding
          viewModel={viewModel}
          activeCategories={controller.filters.categories}
          onCategorySelect={handleCategorySelect}
        />
        <BrandCatalogSection viewModel={viewModel} controller={controller} />
      </div>
    </main>
  );
}
