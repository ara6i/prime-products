"use client";

import type { PoseResult } from "../types";

const MASK_SIZE = 384;

export function encodeLocalMlMaskDataUrl(pose: PoseResult): string | null {
  if (!pose.mask || pose.maskWidth <= 0 || pose.maskHeight <= 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = MASK_SIZE;
  canvas.height = MASK_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const imageData = context.createImageData(MASK_SIZE, MASK_SIZE);
  for (let y = 0; y < MASK_SIZE; y++) {
    const sourceY = Math.min(pose.maskHeight - 1, Math.floor((y / MASK_SIZE) * pose.maskHeight));
    for (let x = 0; x < MASK_SIZE; x++) {
      const sourceX = Math.min(pose.maskWidth - 1, Math.floor((x / MASK_SIZE) * pose.maskWidth));
      const value = pose.mask[sourceY * pose.maskWidth + sourceX] ?? 0;
      const target = (y * MASK_SIZE + x) * 4;
      imageData.data[target] = value;
      imageData.data[target + 1] = value;
      imageData.data[target + 2] = value;
      imageData.data[target + 3] = 255;
    }
  }
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
