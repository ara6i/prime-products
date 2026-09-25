import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifest = JSON.parse(
  await readFile(`${reportDirectory}/visual-identity-decisions.json`, "utf8"),
);
const reviewedIdentities = new Set(manifest.entries.map((entry) => entry.identity));

const sources = [
  "output/reports/mens-ui-matrix-existing-candidates-20260912/index.json",
  "output/reports/mens-zara-taste-active-candidate-review-20260912/index.json",
  "output/reports/mens-zara-taste-candidate-review-20260912/index.json",
];

const slotOrder = new Map([
  ["outerwear", 0],
  ["bottom", 1],
  ["top", 2],
]);

const colorPreference = [
  "white",
  "cream",
  "ivory",
  "ecru",
  "apricot",
  "beige",
  "khaki",
  "light gray",
  "light blue",
  "yellow",
  "orange",
  "pink",
  "red",
  "green",
  "blue",
  "brown",
  "gray",
  "navy",
  "black",
];

const colorRank = (color) => {
  const normalized = String(color ?? "").toLowerCase();
  const index = colorPreference.findIndex((candidate) =>
    normalized.includes(candidate),
  );
  return index === -1 ? colorPreference.length : index;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const groupsByIdentity = new Map();
for (const sourcePath of sources) {
  const index = JSON.parse(await readFile(sourcePath, "utf8"));
  for (const [category, rows] of Object.entries(index.categories)) {
    for (const row of rows) {
      const identity = row.styleRagId ?? row.productId;
      if (!identity || reviewedIdentities.has(identity)) continue;
      if (!groupsByIdentity.has(identity)) {
        groupsByIdentity.set(identity, {
          identity,
          categories: new Set(),
          sources: new Set(),
          variants: new Map(),
        });
      }
      const group = groupsByIdentity.get(identity);
      group.categories.add(category);
      group.sources.add(path.basename(path.dirname(sourcePath)));
      group.variants.set(row.variantId ?? row.image, row);
    }
  }
}

const groups = [...groupsByIdentity.values()].map((group) => {
  const variants = [...group.variants.values()].sort(
    (left, right) =>
      colorRank(left.color) - colorRank(right.color) ||
      String(left.color).localeCompare(String(right.color)),
  );
  return {
    ...group,
    variants,
    representative: variants[0],
  };
});

groups.sort((left, right) => {
  const slotDifference =
    (slotOrder.get(left.representative.slot) ?? 99) -
    (slotOrder.get(right.representative.slot) ?? 99);
  if (slotDifference) return slotDifference;
  const categoryDifference = [...left.categories][0].localeCompare(
    [...right.categories][0],
  );
  if (categoryDifference) return categoryDifference;
  return left.representative.title.localeCompare(right.representative.title);
});

const slotCounts = Object.fromEntries(
  [...new Set(groups.map((group) => group.representative.slot))].map((slot) => [
    slot,
    groups.filter((group) => group.representative.slot === slot).length,
  ]),
);

const cards = groups
  .map((group, index) => {
    const item = group.representative;
    const variants = group.variants
      .map(
        (variant) => `
          <button class="thumb" type="button" data-image="${escapeHtml(variant.image)}" data-color="${escapeHtml(variant.color)}" title="${escapeHtml(variant.color)}">
            <img src="${escapeHtml(variant.image)}" alt="${escapeHtml(`${item.title} — ${variant.color}`)}" loading="lazy" />
          </button>`,
      )
      .join("");
    return `
      <article class="card" data-slot="${escapeHtml(item.slot)}" data-index="${index + 1}">
        <div class="hero">
          <span class="number">${index + 1}</span>
          <img class="hero-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" />
        </div>
        <div class="content">
          <div class="eyebrow"><span>${escapeHtml(item.slot)}</span><span>${escapeHtml(group.variants.map((variant) => variant.reviewId).join(", "))}</span></div>
          <h2>${escapeHtml(item.title)}</h2>
          <dl>
            <div><dt>Shown</dt><dd class="shown-color">${escapeHtml(item.color)}</dd></div>
            <div><dt>Type</dt><dd>${escapeHtml(item.garmentType)}</dd></div>
            <div><dt>Material</dt><dd>${escapeHtml(item.material ?? "Not recorded")}</dd></div>
            <div><dt>Price</dt><dd>${escapeHtml(`${item.currency ?? "USD"} ${Number(item.price ?? 0).toFixed(2)}`)}</dd></div>
            <div><dt>Pool</dt><dd>${escapeHtml([...group.categories].join(", "))}</dd></div>
          </dl>
          <div class="variants">${variants}</div>
          <code>${escapeHtml(group.identity)}</code>
        </div>
      </article>`;
  })
  .join("\n");

const filters = ["All", ...slotOrder.keys()]
  .map(
    (slot) =>
      `<button class="filter" type="button" data-filter="${escapeHtml(slot)}">${escapeHtml(slot)} <span>${slot === "All" ? groups.length : slotCounts[slot] ?? 0}</span></button>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Men's AI Stylist — Older Omitted Candidates</title>
  <style>
    :root { --ink:#171714; --muted:#6e695f; --paper:#f2f0ea; --card:#fff; --line:#ddd9d0; --accent:#3f604d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif; }
    header { position:sticky; top:0; z-index:5; padding:18px 30px 14px; border-bottom:1px solid var(--line); background:rgba(242,240,234,.96); backdrop-filter:blur(12px); }
    .kicker { margin:0 0 5px; color:var(--accent); font-size:11px; font-weight:850; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:0; font-family:Georgia,serif; font-size:38px; font-weight:500; letter-spacing:-.03em; }
    .truth { max-width:1050px; margin:7px 0 0; color:var(--muted); font-size:13px; line-height:1.4; }
    .controls { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
    button.filter { min-height:34px; padding:0 13px; border:1px solid var(--line); border-radius:99px; background:#fff; font:inherit; font-size:12px; font-weight:750; cursor:pointer; text-transform:capitalize; }
    button.filter.active { color:#fff; border-color:var(--ink); background:var(--ink); }
    button.filter span { margin-left:4px; color:#888278; }
    main { padding:20px 30px 60px; }
    .status { margin:0 0 13px; color:var(--muted); font-size:12px; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .card { overflow:hidden; display:grid; grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr); min-height:460px; border:1px solid var(--line); border-radius:15px; background:var(--card); break-inside:avoid; }
    .card[hidden] { display:none; }
    .hero { position:relative; min-height:460px; background:#f8f8f5; }
    .hero-image { width:100%; height:100%; object-fit:contain; display:block; }
    .number { position:absolute; z-index:2; top:11px; left:11px; display:grid; place-items:center; min-width:30px; height:30px; padding:0 7px; border-radius:99px; background:#1d1d1a; color:#fff; font-size:11px; font-weight:800; }
    .content { display:flex; flex-direction:column; min-width:0; padding:14px; }
    .eyebrow { display:flex; justify-content:space-between; gap:10px; color:var(--accent); font-size:9px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
    h2 { margin:8px 0 14px; font-size:17px; line-height:1.25; }
    dl { display:grid; gap:6px; margin:0; font-size:11px; }
    dl div { display:grid; grid-template-columns:52px 1fr; gap:8px; }
    dt { color:var(--muted); }
    dd { margin:0; }
    .variants { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-top:auto; padding-top:13px; }
    .thumb { overflow:hidden; height:62px; padding:0; border:1px solid var(--line); border-radius:7px; background:#fafafa; cursor:pointer; }
    .thumb img { width:100%; height:100%; object-fit:contain; }
    code { overflow:hidden; margin-top:9px; color:#8b867d; font-size:8px; text-overflow:ellipsis; white-space:nowrap; }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Local older pools · excluded by later capped collection</p>
    <h1>${groups.length} unreviewed identities</h1>
    <p class="truth">Nothing on this page is approved. These are older candidates absent from the current decision ledger. Visual acceptance requires a useful modern silhouette, credible product detail, season and occasion truth, and a colorway worth allocating exactly once.</p>
    <div class="controls">${filters}</div>
  </header>
  <main>
    <p class="status" id="status">Showing all ${groups.length} identities.</p>
    <section class="grid">${cards}</section>
  </main>
  <script>
    const filters = [...document.querySelectorAll('.filter')];
    const cards = [...document.querySelectorAll('.card')];
    const status = document.querySelector('#status');
    for (const filter of filters) filter.addEventListener('click', () => {
      const selected = filter.dataset.filter;
      for (const candidate of filters) candidate.classList.toggle('active', candidate === filter);
      let visible = 0;
      for (const card of cards) {
        card.hidden = selected !== 'All' && card.dataset.slot !== selected;
        if (!card.hidden) visible += 1;
      }
      status.textContent = 'Showing ' + visible + ' of ' + cards.length + ' identities.';
    });
    filters[0].classList.add('active');
    for (const thumb of document.querySelectorAll('.thumb')) thumb.addEventListener('click', () => {
      const card = thumb.closest('.card');
      card.querySelector('.hero-image').src = thumb.dataset.image;
      card.querySelector('.shown-color').textContent = thumb.dataset.color;
    });
  </script>
</body>
</html>`;

const outputPath = `${reportDirectory}/UNREVIEWED_OLDER_LOCAL_CANDIDATES_GALLERY.html`;
await writeFile(outputPath, html, "utf8");
console.log(
  JSON.stringify(
    { outputPath, identities: groups.length, slotCounts },
    null,
    2,
  ),
);
