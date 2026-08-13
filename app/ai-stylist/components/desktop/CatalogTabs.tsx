import { Tabs, TabsList, TabsTrigger } from "@/app/shared/components/ui";
import { AIStylistIcon } from "@/app/shared/components/icons";
import type { CatalogTab } from "@/app/ai-stylist/types";

interface CatalogTabsProps {
  activeTab: CatalogTab;
  onTabChange: (tab: CatalogTab) => void;
  catalogCount?: number;
}

export function CatalogTabs({
  activeTab,
  onTabChange,
  catalogCount = 1,
}: CatalogTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as CatalogTab)}
      className="gap-0"
    >
      <TabsList>
        <TabsTrigger value="catalog">Catalog ({catalogCount})</TabsTrigger>
        <TabsTrigger value="closet">My Closet</TabsTrigger>
        <TabsTrigger value="saved">Saved Outfits</TabsTrigger>
        <TabsTrigger value="ai-stylist" className="flex items-center gap-[0.208vw]">
          <AIStylistIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="currentColor" />
          AI Stylist
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
