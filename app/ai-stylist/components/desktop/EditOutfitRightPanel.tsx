"use client";

import { CatalogPanel } from "@/app/try-on/components/desktop/CatalogPanel";
import { EditOutfitChatPanel } from "./EditOutfitChatPanel";
import { DiscInspector } from "./DiscInspector";
import { AIStylistIcon } from "@/app/shared/components/icons";
import type { OutfitProduct, ReplacementProduct } from "@/app/ai-stylist/types";
import type { DiscConfig } from "./DiscCanvas";

interface EditOutfitRightPanelProps {
  tryOnProductIds: string[];
  onToggleTryOn: (productId: string) => void;
  outfitItems: OutfitProduct[];
  onAddItem?: (product: ReplacementProduct) => void;
  userInitials?: string;
  userPhotoUrl?: string | null;
  discConfig?: DiscConfig;
  onDiscConfigChange?: (c: DiscConfig) => void;
}

export function EditOutfitRightPanel({
  tryOnProductIds,
  onToggleTryOn,
  outfitItems,
  onAddItem,
  userInitials,
  userPhotoUrl,
  discConfig,
  onDiscConfigChange,
}: EditOutfitRightPanelProps) {
  return (
    <div className="flex w-1/2 min-w-0 flex-col self-stretch gap-[0.625vw]">
      {discConfig && onDiscConfigChange && (
        <DiscInspector config={discConfig} onChange={onDiscConfigChange} />
      )}

      <CatalogPanel
        tryOnProductIds={tryOnProductIds}
        onToggleTryOn={onToggleTryOn}
        extraTab={{
          value: "ai-stylist",
          label: (
            <span className="flex items-center gap-[0.208vw]">
              <AIStylistIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="currentColor" starColor="currentColor" />
              AI Stylist
            </span>
          ),
          content: (
            <EditOutfitChatPanel
              outfitItems={outfitItems}
              onAddItem={onAddItem}
              userInitials={userInitials}
              userPhotoUrl={userPhotoUrl}
            />
          ),
          defaultActive: false,
        }}
      />
    </div>
  );
}
