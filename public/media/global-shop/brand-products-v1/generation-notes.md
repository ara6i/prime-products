# Brand product previews — v1

Generated on 2026-08-31 using the Codex built-in `image_gen` tool in the logged-in ChatGPT session. No external generation API was used.

## Deliverables

64 separate product-referenced front catalog previews: eight each for Judy Blue, Zenana, BIBI, Umgee, HYFVE, Heimish, BOMBOM, and Davi & Dani.

- Final previews: `{productId}-front.png` in this directory.
- Original supplier photographs: `references/{productId}.webp`, retained without image edits.
- Exact prompts, source URLs and file mappings: `generation-manifest.json`.
- Accepted IDs: `app/shop/brand/data/generatedBrandProducts.data.ts`.

Every output was visually inspected. The source photograph was provided to the generator for that specific SKU. Umgee 07 received one correction to remove a skin-colored artifact inside its distressed knee openings. The final correction prompt is included in the manifest.

## Use and limitations

The previews share a warm ivory studio background and garment-only presentation. These are AI-generated interpretations, not verified supplier photography; fine details, proportions and print placement can differ. They do not establish inventory, material composition or product measurements. The UI identifies the previews and includes the original supplier photo as the second gallery image. No unseen back views were invented.

Brand catalog cards, category cards, Just Dropped product cards, related items and PDP primary images all derive from the same SKU mapping. PDP galleries no longer append unrelated runway images.

Imported prices, size lists and style codes remain unchanged. The imported snapshot itself remains unchanged. Display-only metadata corrections:

- Zenana 08: removed conflicting V-neck wording; the supplier photo shows a round neckline.
- BOMBOM 04: removed conflicting round-neck wording; the supplier photo shows a shallow V neckline.
- Davi & Dani 06: corrected the peplum top's category from Bottoms to Tops.

Brand PDPs no longer fabricate review counts, fallback sizes or material composition.

## Verification

134 focused Vitest tests passed, including 94 new brand photography tests. They cover all 64 route mappings, matching prices and sizes, original/preview gallery files, image dimensions, unique file hashes, clickable cards and gallery switching in both mobile and desktop modes. Scoped ESLint passed. The full-project typecheck reported an unrelated missing `AiadBenchmark448Lab` module in the WEAR work.

At generation completion, live browser verification of localhost was blocked by the browser's URL policy; no bypass was attempted. The generated deliverables were saved locally first; deployment is verified separately when requested.
