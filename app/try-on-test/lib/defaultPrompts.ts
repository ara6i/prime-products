/**
 * Read-only snapshot of the prompt the production SDK try-on actually
 * sends to Gemini — the static skeleton of `buildFitAwarePrompt()` in
 * `primeStyleAI-backend/src/modules/vto/vto-pipeline.ts`. The dynamic
 * `User's body measurements:` and per-area `FIT DIRECTIVES` blocks are
 * inserted at request time and aren't part of this baseline. Keep this
 * file in sync whenever that builder changes.
 */
export const DEFAULT_APPAREL_PROMPT = `Put the garment on MY model. Use the reference image (image 2) ONLY to understand the garment itself — its drape, tightness, length, fabric behaviour, and the accessories the brand styles it with (shoes, bag, jewelry, belt, etc.). Replicate the GARMENT and STYLING on my model. DO NOT copy the reference model's pose, framing, zoom, or cropping. DO NOT replace my model with the reference model. My model's pose, body, framing, and aspect ratio stay EXACTLY as the input photo.

You are generating a virtual try-on image of a person wearing a garment.

GARMENT (image 2) — design reference. Reproduce the garment's color, pattern, print, logo, seam placement, lapel shape, button count and placement, collar, cuff, hem cut, stitching, embroidery, hardware, lining, and branding from the reference. Do not swap, restyle, or 'improve' the cut.
- The garment's WIDTH on the output is set by the BODY UNDERNEATH plus the FIT DIRECTIVES above — NOT by the body shape on the reference model. If the reference is slim-cut on a slim model and the user's body is wider, the garment renders wider with visible strain. That is correct.
- ACCESSORIES — match what the reference model is wearing alongside the garment. If the reference shows shoes, a bag, jewelry, a hat, eyewear, a belt, gloves, hosiery, or any other styling, REPLICATE that exact item on the user. Do not invent extras the reference doesn't show.
- FOOTWEAR — replace the user's shoes with the footwear the reference model wears. If the reference is shot from the waist up and no footwear is visible, keep the user's original shoes.
- FABRIC — drape correctly for the named material. Fluid for silks/satins/chiffons, structured for denim/wool/leather, conforming with mild stretch for jersey/knit, anti-static and clinging for synthetics. Render the appropriate weight, sheen, and natural fold behavior.

PRESERVE FROM INPUT (everything outside the garment region):
- BODY. Same weight, same proportions, same width at every level (chest, waist, hips, thighs). The body in the OUTPUT occupies the SAME horizontal width as the body in the INPUT — measured at the visible belly bulge, the widest hip point, the widest chest point. If the output looks slimmer than the input, you violated this rule. When the FIT DIRECTIVES say the garment is smaller than the body, the FABRIC strains over the unchanged body (tension lines, gaping fasteners, fabric pulling diagonally, belly pushing against buttons). DO NOT add slimming illusions (vertical lines, dark contouring, perspective tricks).
- HANDS. Keep my model's hands in the same natural rest position as the input photo. Do NOT put hands in pockets, on hips, crossed, behind the back, or in any 'fashion-shoot' pose copied from the reference model. If the input has hands at the sides, render hands at the sides; if relaxed in front, keep them relaxed in front. A neutral, normal hand pose is mandatory.
- POSE. Same shoulders, hips, leg stance, and head angle as the input. Do not lean, twist, or shift weight to mimic the reference model. The reference is for the GARMENT only.
- FACE. Same features, expression, head angle, gaze, hairline, hair length, hair color.
- SKIN. Same tone, same texture, same blemishes/marks. No retouching, smoothing, or beautifying.
- BACKGROUND. Same pixels as the input, including lighting and shadows.
- FRAMING. Same aspect ratio and dimensions as the input. Output exactly one person.

REALISM CHECK — treat the output like a real fitting-room photo, not a fashion shoot. Match the lighting and perspective of the input. Blend the garment naturally onto the body. If you find yourself producing pixels that differ from the input photo outside the garment region, stop and copy those pixels from the input.`;
