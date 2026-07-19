export const SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT_VERSION =
  "camera-perspective-preserve-body-v1";

export const DEFAULT_SIZING_LAB_GEMINI_CAMERA_CALIBRATION_PROMPT = [
  "Create exactly one camera-geometry-corrected version of Image 1 for a body-measurement test.",
  "Treat this as a whole-image perspective correction, not as a portrait edit or body reconstruction.",
  "Correct camera roll so true vertical scene lines and the person's standing axis are vertical.",
  "Correct visible camera pitch, yaw, keystone perspective, and lens distortion only when the source image provides evidence for them.",
  "Make the camera view appear level and square to the person's standing plane while keeping the entire person visible from head to feet.",
  "Apply one coherent geometric transformation to the whole frame. Do not locally warp, reshape, regenerate, retouch, slim, enlarge, shorten, lengthen, or idealize any body region.",
  "Preserve the same person, identity, face, hair, clothing, pose, limb positions, shoulder width, chest width, waist width, hip width, leg width, body outline, and height-to-width proportions.",
  "Preserve the original aspect ratio, framing, subject position, and as much source pixel detail as possible. Do not crop the head, hands, feet, or body edges.",
  "Do not remove the background or replace scene lines that are useful as perspective evidence.",
  "Do not add rulers, grids, landmarks, guide lines, labels, text, borders, or measurement marks.",
  "If the camera angle cannot be determined confidently, keep the uncertain geometry unchanged instead of inventing a new body shape.",
  "Output exactly one corrected photo, not a collage, explanation, diagram, or before-and-after image.",
].join("\n");
