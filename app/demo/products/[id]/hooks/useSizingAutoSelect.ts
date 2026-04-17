import { useCallback } from "react";

interface ParsedSize {
  number: string;
  length: string;
  available: boolean;
  original: string;
}

interface SizingAutoSelectDeps {
  parsedSizes: ParsedSize[];
  handleSizeNumberSelect: (num: string) => void;
  handleLengthSelect: (len: string) => void;
  setPantsWaistSize: (size: string) => void;
  setPantsLengthSize: (size: string) => void;
}

/**
 * Returns a callback to auto-select sizes on the product page
 * when the SDK returns a sizing recommendation.
 */
export function useSizingAutoSelect({
  parsedSizes,
  handleSizeNumberSelect,
  handleLengthSelect,
  setPantsWaistSize,
  setPantsLengthSize,
}: SizingAutoSelectDeps) {
  return useCallback(
    (result: any) => {
      if (!result) return;

      const sections = result.sections;

      if (sections) {
        // Multi-section product (tuxedo, suit)
        if (sections.Jacket) {
          const s = sections.Jacket;
          if (s.size) {
            handleSizeNumberSelect(s.size);
            if (s.length) setTimeout(() => handleLengthSelect(s.length), 50);
          }
        }

        if (sections.Pants) {
          const s = sections.Pants;
          if (s.size) setPantsWaistSize(s.size);
          if (s.length) setPantsLengthSize(s.length);
        }
      }

      // Single-piece product — match by recommendedSize
      if (!sections?.Jacket && !sections?.Pants && result.recommendedSize) {
        const rec = result.recommendedSize;
        const match = parsedSizes.find(
          (sz) => sz.original === rec || sz.number === rec,
        );
        if (match) {
          handleSizeNumberSelect(match.number);
          if (match.length)
            setTimeout(() => handleLengthSelect(match.length), 50);
        }
      }
    },
    [
      parsedSizes,
      handleSizeNumberSelect,
      handleLengthSelect,
      setPantsWaistSize,
      setPantsLengthSize,
    ],
  );
}
