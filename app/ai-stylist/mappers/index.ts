import type {
  StylistMessage,
  StylistConversation,
  ChatMessage,
  OutfitSuggestion,
  Outfit,
  ConversationPhase,
  ChatHistoryItem,
  OutfitProduct,
  ModificationRequest,
  ModificationResponse,
  ReplacementProduct,
} from "@/app/ai-stylist/types";

/** Get ID from message (handles both _id and id) */
function msgId(msg: StylistMessage): string {
  return msg._id || msg.id || "";
}

/** Get ID from conversation (handles both _id and id) */
function convId(conv: StylistConversation): string {
  return conv._id || conv.id || "";
}

/** Map a single backend StylistMessage → UI ChatMessage */
function mapMessage(msg: StylistMessage): ChatMessage {
  if (msg.role === "user") {
    if (msg.modelImage) {
      return {
        id: msgId(msg),
        role: "user",
        content: "",
        type: "model-preview",
      };
    }
    return {
      id: msgId(msg),
      role: "user",
      content: msg.prompt ?? "",
    };
  }

  // Assistant message that is currently generating
  if (msg.isGenerating) {
    return {
      id: msgId(msg),
      role: "ai",
      content: "Styling your looks…",
      type: "loading",
      isGenerating: true,
    };
  }

  return {
    id: msgId(msg),
    role: "ai",
    content: msg.response ?? "",
    outfits: msg.outfits,
    gatheringInfo: msg.gatheringInfo,
    waitingForModel: msg.waitingForModel,
  };
}

/** Map full conversation → array of UI ChatMessages */
export function mapConversationToMessages(
  conversation: StylistConversation
): ChatMessage[] {
  return conversation.messages.map(mapMessage);
}

/** Extract outfits from conversation messages → OutfitSuggestion[] */
export function mapOutfitsFromConversation(
  conversation: StylistConversation
): OutfitSuggestion[] {
  // Search from the end to get the latest outfits
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    const msg = conversation.messages[i];
    if (msg.outfits && msg.outfits.length > 0) {
      return msg.outfits.map(mapOutfit);
    }
  }
  return [];
}

/** Map single Outfit → OutfitSuggestion for UI */
function mapOutfit(outfit: Outfit): OutfitSuggestion {
  const totalPrice = outfit.items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  return {
    id: outfit.id,
    title: outfit.theme ?? outfit.summary ?? "Outfit",
    budget: `$${totalPrice.toFixed(2)}`,
    itemCount: outfit.items.length,
    imageUrl: outfit.tryOnImageUrl ?? outfit.items[0]?.imageUrl ?? "",
    transparentImageUrl: outfit.transparentImageUrl,
    items: outfit.items,
    isBookmarked: false,
  };
}

/** Get conversation phase from backend flags */
export function getPhase(conversation: StylistConversation): ConversationPhase {
  // Check last assistant message for flags
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    const msg = conversation.messages[i];
    if (msg.role === "assistant") {
      if (msg.gatheringInfo) return "gathering_info";
      if (msg.waitingForModel) return "awaiting_model";
      if (msg.isGenerating) return "generating";
      if (msg.outfits && msg.outfits.length > 0) return "complete";
      break;
    }
  }
  // Fallback to conversationPhase field if available
  return conversation.conversationPhase ?? "gathering_info";
}

/** Get conversation ID (handles both _id and id) */
export function getConversationId(conversation: StylistConversation): string {
  return convId(conversation);
}

/** Map conversation list response → ChatHistoryItem[] for the history drawer */
export function mapConversationListToHistory(
  conversations: Array<{ id: string; title: string; previewImages?: string[] }>
): ChatHistoryItem[] {
  return conversations.map((conv) => ({
    id: conv.id,
    title: conv.title || "Untitled conversation",
    previewImages: conv.previewImages ?? [],
  }));
}

/* ─── Outfit Modification mappers ─── */

/** Map OutfitProduct[] → modification request outfit payload */
export function mapOutfitItemsToModificationPayload(
  items: OutfitProduct[]
): ModificationRequest["currentOutfit"] {
  return items.map((item) => ({
    id: item.productId || item.id,
    productId: item.productId || item.id,
    name: item.name,
    category: item.category,
    color: item.colorName || item.color || "Unknown",
    colorName: item.colorName || item.color || "Unknown",
    style: "casual",
    brand: item.brand,
    imageUrl: item.imageUrl || "",
    gender: item.gender,
  }));
}

/** Map ModificationResponse → ReplacementProduct[] */
export function mapReplacementProducts(
  response: ModificationResponse
): ReplacementProduct[] {
  const products: ReplacementProduct[] = [];
  if (!response.replacementOptions) return products;

  Object.values(response.replacementOptions).forEach((categoryProducts) => {
    if (Array.isArray(categoryProducts)) {
      for (const p of categoryProducts) {
        products.push({
          id: p.productId || p.id,
          name: p.name,
          category: p.category,
          imageUrl: p.imageUrl,
          brand: p.brand,
          price: p.price,
          colorName: p.color,
        });
      }
    }
  });

  return products;
}
