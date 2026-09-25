import { readFile, writeFile } from "node:fs/promises";

const batchNumber = String(process.argv[2] ?? "01").padStart(2, "0");
if (!/^\d{2}$/.test(batchNumber)) {
  throw new Error("Pass a numeric two-digit batch number, for example 11.");
}

const poolPath =
  "output/reports/mens-nonwedding-scenario-pools-20260911.json";
const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const batchPath = `${reportDirectory}/raw-priority-batch-${batchNumber}.json`;
const outputPath = `${reportDirectory}/UNREVIEWED_RAW_PRIORITY_BATCH_${batchNumber}.html`;

const pool = JSON.parse(await readFile(poolPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const reviewedIdentities = new Set(
  manifest.entries.map((entry) => entry.identity),
);

const positiveRules = {
  top: [
    ["linen", 12],
    ["camp collar", 12],
    ["open collar", 10],
    ["knit polo", 12],
    ["polo", 8],
    ["corduroy", 7],
    ["striped", 5],
    ["button-up shirt", 5],
    ["button-down shirt", 5],
    ["ribbed", 4],
    ["cotton", 3],
  ],
  bottom: [
    ["tailored", 15],
    ["straight", 12],
    ["pleated", 10],
    ["chino", 10],
    ["linen", 8],
    ["corduroy", 6],
    ["drawstring", 4],
    ["shorts", 3],
  ],
  outerwear: [
    ["overshirt", 15],
    ["shacket", 14],
    ["trench", 12],
    ["harrington", 12],
    ["corduroy", 10],
    ["suede", 10],
    ["cardigan", 8],
    ["bomber", 7],
    ["lightweight", 7],
    ["denim jacket", 5],
    ["jacket", 2],
  ],
};

const negativeRules = [
  ["graphic", -30],
  ["skull", -30],
  ["letter", -20],
  ["oversized", -12],
  ["skinny", -20],
  ["slim", -15],
  ["wide-leg", -12],
  ["cargo", -10],
  ["distressed", -12],
  ["ripped", -15],
  ["hooded", -8],
  ["puffer", -8],
  ["tuxedo", -20],
  ["rhinestone", -30],
  ["sequins", -30],
  ["motorcycle", -8],
  ["moto", -8],
  ["vest", -7],
  [" set", -10],
];

const scoreProduct = (product, slot) => {
  const text = `${product.title} ${product.garmentType} ${product.material} ${(product.styleTags ?? []).join(" ")}`.toLowerCase();
  let score = Math.min(product.colors?.length ?? 0, 5) * 0.25;
  for (const [needle, value] of positiveRules[slot]) {
    if (text.includes(needle)) score += value;
  }
  for (const [needle, value] of negativeRules) {
    if (text.includes(needle)) score += value;
  }
  return score;
};

const limits = { top: 16, bottom: 12, outerwear: 12 };
const identitiesBySlot = Object.fromEntries(
  Object.keys(limits).map((slot) => [slot, new Set()]),
);
for (const scenarioPool of pool.pools) {
  const { gender, occasion } = scenarioPool.scenario;
  if (gender !== "male") continue;
  if (["wedding", "wedding-guest"].includes(occasion)) continue;
  for (const slot of Object.keys(limits)) {
    for (const identity of scenarioPool.productIdsBySlot?.[slot] ?? []) {
      if (!reviewedIdentities.has(identity)) {
        identitiesBySlot[slot].add(identity);
      }
    }
  }
}

const candidatesBySlot = Object.fromEntries(
  Object.keys(limits).map((slot) => [
    slot,
    [...identitiesBySlot[slot]]
    .map((identity) => ({
      identity,
      slot,
      score: scoreProduct(pool.products[identity], slot),
      product: pool.products[identity],
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.product.title.localeCompare(right.product.title),
    ),
  ]),
);

const selectedBySlot = Object.fromEntries(
  Object.keys(limits).map((slot) => [
    slot,
    candidatesBySlot[slot].slice(0, limits[slot]),
  ]),
);

const expectedCount = Math.min(
  40,
  Object.values(candidatesBySlot).reduce(
    (total, candidates) => total + candidates.length,
    0,
  ),
);

while (
  Object.values(selectedBySlot).reduce(
    (total, candidates) => total + candidates.length,
    0,
  ) < expectedCount
) {
  const slot = Object.keys(limits)
    .filter(
      (candidateSlot) =>
        selectedBySlot[candidateSlot].length <
        candidatesBySlot[candidateSlot].length,
    )
    .sort(
      (left, right) =>
        selectedBySlot[left].length - selectedBySlot[right].length ||
        (candidatesBySlot[right].length - selectedBySlot[right].length) -
          (candidatesBySlot[left].length - selectedBySlot[left].length) ||
        left.localeCompare(right),
    )[0];
  if (!slot) break;
  selectedBySlot[slot].push(
    candidatesBySlot[slot][selectedBySlot[slot].length],
  );
}

const selected = Object.keys(limits).flatMap((slot) => selectedBySlot[slot]);

if (selected.length !== expectedCount || selected.length === 0) {
  throw new Error(`Expected ${expectedCount} candidates, found ${selected.length}`);
}

const batch = {
  generatedAt: new Date().toISOString(),
  localOnly: true,
  scope: `men non-wedding raw priority batch ${batchNumber}`,
  selectionMethod:
    "Deterministic metadata prioritization for likely modern linen, knit, straight, tailored, overshirt, shacket, trench, corduroy, and lightweight pieces; visual review remains authoritative.",
  products: selected.map(({ identity, slot, score, product }, index) => ({
    card: index + 1,
    identity,
    slot,
    score,
    title: product.title,
    garmentType: product.garmentType,
    colors: product.colors.map((color) => ({
      color: color.color,
      variantId: color.variantId,
      image: color.sourceImageUrl,
    })),
  })),
};
await writeFile(batchPath, `${JSON.stringify(batch, null, 2)}\n`, "utf8");

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const cards = selected
  .map(({ identity, slot, score, product }, index) => {
    const colors = product.colors ?? [];
    const initial = colors[0] ?? {};
    const thumbs = colors
      .map(
        (color) => `
          <button class="thumb" type="button" data-image="${escapeHtml(color.sourceImageUrl)}" data-color="${escapeHtml(color.color)}" title="${escapeHtml(color.color)}">
            <img src="${escapeHtml(color.sourceImageUrl)}" alt="${escapeHtml(`${product.title} — ${color.color}`)}" loading="eager" />
          </button>`,
      )
      .join("");
    return `
      <article class="card" data-index="${index + 1}" data-slot="${escapeHtml(slot)}">
        <div class="hero">
          <span class="number">${index + 1}</span>
          <img class="hero-image" src="${escapeHtml(initial.sourceImageUrl)}" alt="${escapeHtml(product.title)}" loading="eager" />
        </div>
        <div class="content">
          <p class="eyebrow">${escapeHtml(slot)} · raw priority score ${score.toFixed(2)}</p>
          <h2>${escapeHtml(product.title)}</h2>
          <dl>
            <div><dt>Shown</dt><dd class="shown-color">${escapeHtml(initial.color)}</dd></div>
            <div><dt>Type</dt><dd>${escapeHtml(product.garmentType)}</dd></div>
            <div><dt>Material</dt><dd>${escapeHtml(product.material ?? "Not recorded")}</dd></div>
            <div><dt>Price</dt><dd>${escapeHtml(`${product.currency ?? "USD"} ${Number(product.price ?? 0).toFixed(2)}`)}</dd></div>
            <div><dt>Colors</dt><dd>${colors.length}</dd></div>
          </dl>
          <div class="variants">${thumbs}</div>
          <code>${escapeHtml(identity)}</code>
        </div>
      </article>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Men's AI Stylist — Raw Priority Batch ${batchNumber}</title>
  <style>
    :root { --ink:#171714; --muted:#6e695f; --paper:#f2f0ea; --card:#fff; --line:#ddd9d0; --accent:#3f604d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif; }
    header { padding:18px 30px 14px; border-bottom:1px solid var(--line); background:#f2f0ea; }
    .kicker { margin:0 0 5px; color:var(--accent); font-size:11px; font-weight:850; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:0; font-family:Georgia,serif; font-size:38px; font-weight:500; letter-spacing:-.03em; }
    .truth { max-width:1120px; margin:7px 0 0; color:var(--muted); font-size:13px; line-height:1.45; }
    main { padding:20px 30px 60px; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .card { overflow:hidden; display:grid; grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr); min-height:460px; border:1px solid var(--line); border-radius:15px; background:var(--card); break-inside:avoid; }
    .card[hidden] { display:none; }
    .hero { position:relative; min-height:460px; background:#f8f8f5; }
    .hero-image { width:100%; height:100%; object-fit:contain; display:block; }
    .number { position:absolute; z-index:2; top:11px; left:11px; display:grid; place-items:center; min-width:30px; height:30px; padding:0 7px; border-radius:99px; background:#1d1d1a; color:#fff; font-size:11px; font-weight:800; }
    .content { display:flex; flex-direction:column; min-width:0; padding:14px; }
    .eyebrow { margin:0; color:var(--accent); font-size:9px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
    h2 { margin:8px 0 14px; font-size:17px; line-height:1.25; }
    dl { display:grid; gap:6px; margin:0; font-size:11px; }
    dl div { display:grid; grid-template-columns:52px 1fr; gap:8px; }
    dt { color:var(--muted); }
    dd { margin:0; }
    .variants { display:grid; grid-template-columns:repeat(5,1fr); gap:5px; margin-top:auto; padding-top:13px; }
    .thumb { overflow:hidden; height:58px; padding:0; border:1px solid var(--line); border-radius:7px; background:#fafafa; cursor:pointer; }
    .thumb img { width:100%; height:100%; object-fit:contain; }
    code { overflow:hidden; margin-top:9px; color:#8b867d; font-size:8px; text-overflow:ellipsis; white-space:nowrap; }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Local-only visual recovery · men · wedding excluded</p>
    <h1>Raw priority batch ${batchNumber} · ${selected.length} identities</h1>
    <p class="truth">Nothing on this page is approved. Metadata only selected a likely-useful review order; every identity and every color still requires full visual judgment for adult-male fit, controlled silhouette, product truth, useful color, season, occasion, and Zara-led modern quality.</p>
  </header>
  <main><section class="grid">${cards}</section></main>
  <script>
    for (const thumb of document.querySelectorAll('.thumb')) thumb.addEventListener('click', () => {
      const card = thumb.closest('.card');
      card.querySelector('.hero-image').src = thumb.dataset.image;
      card.querySelector('.shown-color').textContent = thumb.dataset.color;
    });
  </script>
</body>
</html>`;

await writeFile(outputPath, html, "utf8");
console.log(
  JSON.stringify(
    {
      batchPath,
      outputPath,
      counts: Object.fromEntries(
        Object.keys(limits).map((slot) => [
          slot,
          selected.filter((candidate) => candidate.slot === slot).length,
        ]),
      ),
    },
    null,
    2,
  ),
);
