import { readFile, writeFile } from "node:fs/promises";

const poolPath =
  "output/reports/mens-nonwedding-scenario-pools-20260911.json";
const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;

const pool = JSON.parse(await readFile(poolPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const reviewedIdentities = new Set(
  manifest.entries.map((entry) => entry.identity),
);

const shoeIdentities = new Set();
for (const scenarioPool of pool.pools) {
  const { gender, occasion } = scenarioPool.scenario;
  if (gender !== "male") continue;
  if (["wedding", "wedding-guest"].includes(occasion)) continue;
  for (const identity of scenarioPool.productIdsBySlot?.shoe ?? []) {
    if (!reviewedIdentities.has(identity)) shoeIdentities.add(identity);
  }
}

const products = [...shoeIdentities]
  .map((identity) => pool.products[identity])
  .filter(Boolean)
  .sort((left, right) => left.title.localeCompare(right.title));

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const cards = products
  .map((product, index) => {
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
      <article class="card" data-index="${index + 1}">
        <div class="hero">
          <span class="number">${index + 1}</span>
          <img class="hero-image" src="${escapeHtml(initial.sourceImageUrl)}" alt="${escapeHtml(product.title)}" loading="eager" />
        </div>
        <div class="content">
          <p class="eyebrow">Unreviewed raw men pool · shoe</p>
          <h2>${escapeHtml(product.title)}</h2>
          <dl>
            <div><dt>Shown</dt><dd class="shown-color">${escapeHtml(initial.color)}</dd></div>
            <div><dt>Type</dt><dd>${escapeHtml(product.garmentType)}</dd></div>
            <div><dt>Material</dt><dd>${escapeHtml(product.material ?? "Not recorded")}</dd></div>
            <div><dt>Price</dt><dd>${escapeHtml(`${product.currency ?? "USD"} ${Number(product.price ?? 0).toFixed(2)}`)}</dd></div>
            <div><dt>Colors</dt><dd>${colors.length}</dd></div>
          </dl>
          <div class="variants">${thumbs}</div>
          <code>${escapeHtml(product.productId)}</code>
        </div>
      </article>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Men's AI Stylist — Unreviewed Raw Shoes</title>
  <style>
    :root { --ink:#171714; --muted:#6e695f; --paper:#f2f0ea; --card:#fff; --line:#ddd9d0; --accent:#3f604d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif; }
    header { padding:18px 30px 14px; border-bottom:1px solid var(--line); background:#f2f0ea; }
    .kicker { margin:0 0 5px; color:var(--accent); font-size:11px; font-weight:850; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:0; font-family:Georgia,serif; font-size:38px; font-weight:500; letter-spacing:-.03em; }
    .truth { max-width:1080px; margin:7px 0 0; color:var(--muted); font-size:13px; line-height:1.45; }
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
    <p class="kicker">Local-only recovery · men · wedding excluded</p>
    <h1>${products.length} unreviewed raw shoe identities</h1>
    <p class="truth">Nothing on this page is approved. Each supplier identity must pass men-specific visual truth, modern silhouette, season and occasion fit, useful color, image detail, and the strict no-repeat rule. Variants remain one identity.</p>
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

const outputPath = `${reportDirectory}/UNREVIEWED_RAW_SHOES_GALLERY.html`;
await writeFile(outputPath, html, "utf8");
console.log(JSON.stringify({ outputPath, identities: products.length }, null, 2));
