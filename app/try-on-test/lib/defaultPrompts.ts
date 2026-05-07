/**
 * Read-only copy of the prompt the backend's `pickBasePromptByCategory("apparel")`
 * sends to Gemini when no `customPrompt` and no `fitInfo` are supplied. The
 * page shows this so the user can see the baseline before editing it. Keep
 * this in sync with `primeStyleAI-backend/src/modules/vto/vto-pipeline.ts`
 * (the `TRYON_PROMPT` constant) when the production prompt changes.
 */
export const DEFAULT_APPAREL_PROMPT = `You are generating a virtual try-on image of a person wearing a garment.

Your primary objective is to produce a REALISTIC visual approximation of how the garment would look on this specific body — with careful attention to silhouette, fit behavior, and body proportions. Treat the output like a real fitting-room photo, not an idealized fashion render.

RULES:
- Output ONE person only — no duplicates, no side-by-side, no separate product shot.
- PRESERVE the person's face, skin tone, hair, body shape, and pose EXACTLY.
- PRESERVE the background EXACTLY.
- PRESERVE the garment's color, pattern, texture, and branding EXACTLY.
- Same aspect ratio AND SAME FRAMING as the user's photo.

FRAMING PRESERVATION (CRITICAL — this is the most common failure mode):
- Do NOT crop, zoom in, re-center, or change the framing in ANY way.
- If the user's photo shows them from HEAD TO TOE (full body), the output MUST also show them from HEAD TO TOE. Head must be fully visible at the top. Feet/shoes must be fully visible at the bottom. No trimming.
- If the user's photo is waist up (half-body), keep the half-body framing.
- The person's position within the frame (how much empty space surrounds them, where the feet/head land relative to the image borders) must match the user's photo EXACTLY.
- Treat the user's photo as a painter's reference canvas: you are ONLY repainting the garment area. Everything outside the garment — including how much of the body is in frame — must be untouched.

SILHOUETTE PRESERVATION (CRITICAL):
Identify the garment's intended silhouette (slim, tailored, boxy, oversized, A-line, straight, etc.). Preserve that silhouette in the output. Do NOT restyle the garment into a different shape — the outline and structural cut must match the original design.

BODY-AWARE FIT:
Adapt the garment to the user's actual body proportions. Reflect how the silhouette interacts with the body — tighter at contact points (chest, waist, hips) and looser where fabric naturally drapes (sleeves, torso length, hem). Respect gravity and natural draping.

SIZE-ACCURATE BEHAVIOR:
Reflect realistic looseness or tightness per area. Avoid "perfect fit everywhere" — real clothes don't fit uniformly.

FABRIC AND DRAPE:
Approximate fabric behavior from garment type: structured pieces (jackets, blazers) keep sharper edges; soft pieces (t-shirts, knits) show natural folds; flowy pieces (dresses, skirts) show fluid movement. Avoid unrealistic stiffness or unnatural stretching.

ALIGNMENT AND PROPORTION:
Maintain correct alignment at the shoulders, neckline, waist, and garment length. Proportions must match real-world wearing.

VISUAL REALISM:
Match the lighting, perspective, and pose of the user's photo. Blend the garment naturally onto the body. No distortions, no floating elements, no misalignment.

CONSERVATIVE OUTPUT (IMPORTANT):
Do NOT exaggerate fit or appearance. Do NOT imply perfection. The output must read as a realistic approximation, not an idealized glamour render.`;
