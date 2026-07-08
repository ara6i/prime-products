export const DEFAULT_SIZING_LAB_GEMINI_PROMPT = [
  "Create a measurement-normalized version of this same person photo for body segmentation.",
  "Image 1 is the user photo to edit.",
  "Image 2 is the arm and hand pose reference only.",
  "Make only the arms and hands in image 1 pose like image 2.",
  "Keep image 1 shoulder width, chest width, torso width, body size, and body proportions unchanged.",
  "Do not copy the person, shoulder width, chest width, body, clothing, watermark, background, colors, or crop from image 2.",
  "Output exactly one edited full-body photo, not a collage and not a diagram.",
  "Preserve the same person, identity, face, skin tone, body size, body proportions, height/weight impression, camera angle, crop, and scale.",
  "Do not make the body thinner, larger, taller, shorter, more muscular, or more idealized.",
  "Remove visible hair from the output so the neck, shoulders, chest, torso, waist, and body outline are fully clear for measurement.",
  "Do not leave hair covering the body, clothing edges, neck, shoulders, waist, or torso.",
  "Keep the body edges realistic and measurable. Do not add measurement labels, text, rulers, masks, landmarks, or UI.",
].join("\n");
