import { Button } from "@/app/shared/components/ui";
import type { CatalogTab } from "@/app/try-on/types";

const BROWSE_TABS: { value: CatalogTab; label: string }[] = [
  { value: "catalog", label: "Catalog" },
  { value: "saved-outfits", label: "Saved Outfits" },
  { value: "my-closet", label: "My Closet" },
];

interface CategoryChipsProps {
  activeTab: CatalogTab | null;
  onTabSelect: (tab: CatalogTab) => void;
}

export function CategoryChips({ activeTab, onTabSelect }: CategoryChipsProps) {
  return (
    <div className="flex shrink-0 gap-2">
      {BROWSE_TABS.map((tab) => (
        <Button
          key={tab.value}
          variant="chip"
          size="xs"
          data-active={activeTab === tab.value}
          onClick={() => onTabSelect(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
