/** Configuration constants for the 3D turntable scene */
export const TURNTABLE = {
  /** Radius of the disc in scene units */
  discRadius: 1.6,
  /** How far models sit from center (fraction of disc radius) */
  modelRadiusFraction: 0.7,
  /** Model billboard height in scene units */
  modelHeight: 4,
  /** Model billboard width in scene units */
  modelWidth: 2.2,

  /** Camera — higher up, looking down to show disc clearly */
  cameraPosition: [0, 3.5, 4.5] as [number, number, number],
  cameraTarget: [0, -0.2, 0] as [number, number, number],
  fov: 35,

  /** Physics */
  friction: 0.93,
  snapThreshold: 0.002,
  snapStiffness: 0.12,
  dragSensitivity: 0.01,

  /** Visuals */
  selectedScale: 1.0,
  unselectedScale: 0.82,
  unselectedBrightness: 0.55,

  /** Assets */
  discTexture: "/images/ai-stylist/platform-disc-cropped.png",
  backgroundColor: "#D5D0CC",
} as const;
