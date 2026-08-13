import type { CatalogProduct } from "@/app/ai-stylist/types";
import { CatalogProductCard } from "./CatalogProductCard";

interface CatalogProductGridProps {
  products: CatalogProduct[];
  outfitItemIds: Set<string>;
  onAddToOutfit: (id: string) => void;
  onRemoveFromOutfit: (id: string) => void;
}

export function CatalogProductGrid({
  products,
  outfitItemIds,
  onAddToOutfit,
  onRemoveFromOutfit,
}: CatalogProductGridProps) {
  return (
    <div className="flex flex-wrap content-start gap-[0.833vw] self-stretch">
      {products.map((product) => (
        <div key={product.id} className="w-[calc((100%-32px)/3)]">
          <CatalogProductCard
            product={product}
            isInOutfit={outfitItemIds.has(product.id)}
            onAddToOutfit={onAddToOutfit}
            onRemoveFromOutfit={onRemoveFromOutfit}
          />
        </div>
      ))}
    </div>
  );
}
