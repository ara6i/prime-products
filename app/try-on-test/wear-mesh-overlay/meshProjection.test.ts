import { describe, expect, it } from "vitest";
import { normalizedPhotoPointToSourcePixels } from "./meshProjection";

describe("normalizedPhotoPointToSourcePixels", () => {
  it("restores the source photo aspect ratio before standalone mesh fitting", () => {
    const topLeft = normalizedPhotoPointToSourcePixels(0.3010417, 0.1769531, 1920, 2560);
    const bottomRight = normalizedPhotoPointToSourcePixels(0.6963542, 0.8957031, 1920, 2560);
    const width = bottomRight[0] - topLeft[0];
    const height = bottomRight[1] - topLeft[1];

    expect(width / height).toBeCloseTo(0.4125, 3);
    expect(width / height).not.toBeCloseTo(0.55, 1);
  });
});
