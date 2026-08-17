export function normalizedPhotoPointToSourcePixels(
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
): readonly [number, number] {
  return [x * sourceWidth, y * sourceHeight];
}
