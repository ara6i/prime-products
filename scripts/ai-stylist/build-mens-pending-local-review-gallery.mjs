import { readFile, writeFile } from "node:fs/promises";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifest = JSON.parse(
  await readFile(`${reportDirectory}/visual-identity-decisions.json`, "utf8"),
);
const reviewedIdentities = new Set(manifest.entries.map((entry) => entry.identity));

const sources = [
  {
    label: "Formal blazers",
    path: "output/reports/mens-ui-matrix-formal-blazers-20260912/index.json",
    key: "formal-blazers",
  },
  {
    label: "Formal trousers / sets",
    path: "output/reports/mens-ui-matrix-formal-trousers-20260912/index.json",
    key: "formal-trousers",
  },
  {
    label: "Bags / watches",
    path: "output/reports/mens-ui-matrix-addon-candidates-20260912/index.json",
    key: null,
  },
];

const colorPreference = [
  "white",
  "cream",
  "ivory",
  "ecru",
  "apricot",
  "beige",
  "khaki",
  "gray green",
  "light gray",
  "light blue",
  "blue",
  "green",
  "brown",
  "gray",
  "navy",
  "black",
];

const colorRank = (color) => {
  const normalized = String(color ?? "").toLowerCase();
  const index = colorPreference.findIndex((candidate) => normalized.includes(candidate));
  return index === -1 ? colorPreference.length : index;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const groups = [];
for (const source of sources) {
  const index = JSON.parse(await readFile(source.path, "utf8"));
  const rows = source.key
    ? index.categories[source.key]
    : Object.values(index.categories).flat();
  const grouped = Map.groupBy(rows, (row) => row.styleRagId ?? row.productId);
  for (const [identity, variants] of grouped.entries()) {
    if (reviewedIdentities.has(identity)) continue;
    const orderedVariants = [...variants].sort(
      (left, right) => colorRank(left.color) - colorRank(right.color),
    );
    groups.push({
      category: source.label,
      identity,
      representative: orderedVariants[0],
      variants: orderedVariants,
    });
  }
}

groups.sort((left, right) =>
  `${left.category}-${left.representative.title}`.localeCompare(
    `${right.category}-${right.representative.title}`,
  ),
);

const categoryCounts = Object.fromEntries(
  [...new Set(groups.map((group) => group.category))].map((category) => [
    category,
    groups.filter((group) => group.category === category).length,
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
      <article class="card" data-category="${escapeHtml(group.category)}" data-index="${index + 1}">
        <div class="hero">
          <span class="number">${index + 1}</span>
          <img class="hero-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" />
        </div>
        <div class="content">
          <div class="eyebrow"><span>${escapeHtml(group.category)}</span><span>${escapeHtml(group.variants.map((variant) => variant.reviewId).join(", "))}</span></div>
          <h2>${escapeHtml(item.title)}</h2>
          <dl>
            <div><dt>Shown</dt><dd class="shown-color">${escapeHtml(item.color)}</dd></div>
            <div><dt>Type</dt><dd>${escapeHtml(item.garmentType)}</dd></div>
            <div><dt>Material</dt><dd>${escapeHtml(item.material ?? "Not recorded")}</dd></div>
            <div><dt>Price</dt><dd>${escapeHtml(`${item.currency ?? "USD"} ${Number(item.price ?? 0).toFixed(2)}`)}</dd></div>
          </dl>
          <div class="variants">${variants}</div>
          <code>${escapeHtml(group.identity)}</code>
        </div>
      </article>`;
  })
  .join("\n");

const filters = ["All", ...Object.keys(categoryCounts)]
  .map(
    (category) =>
      `<button class="filter" type="button" data-filter="${escapeHtml(category)}">${escapeHtml(category)} <span>${category === "All" ? groups.length : categoryCounts[category]}</span></button>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Men's AI Stylist — Pending Local Visual Review</title>
  <style>
    :root { --ink:#171714; --muted:#6e695f; --paper:#f2f0ea; --card:#fff; --line:#ddd9d0; --accent:#3f604d; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif; }
    header { position:sticky; top:0; z-index:5; padding:22px 34px 17px; border-bottom:1px solid var(--line); background:rgba(242,240,234,.95); backdrop-filter:blur(12px); }
    .kicker { margin:0 0 5px; color:var(--accent); font-size:11px; font-weight:850; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:0; font-family:Georgia,serif; font-size:42px; font-weight:500; letter-spacing:-.03em; }
    .truth { max-width:980px; margin:8px 0 0; color:var(--muted); font-size:13px; line-height:1.45; }
    .controls { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
    button.filter { min-height:36px; padding:0 13px; border:1px solid var(--line); border-radius:99px; background:#fff; font:inherit; font-size:12px; font-weight:750; cursor:pointer; }
    button.filter.active { color:#fff; border-color:var(--ink); background:var(--ink); }
    button.filter span { margin-left:4px; color:#888278; }
    main { padding:22px 34px 60px; }
    .status { margin:0 0 15px; color:var(--muted); font-size:12px; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
    .card { overflow:hidden; display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr); min-height:485px; border:1px solid var(--line); border-radius:16px; background:var(--card); }
    .card[hidden] { display:none; }
    .hero { position:relative; min-height:485px; background:#f8f8f5; }
    .hero-image { width:100%; height:100%; object-fit:contain; display:block; }
    .number { position:absolute; z-index:2; top:11px; left:11px; display:grid; place-items:center; min-width:30px; height:30px; padding:0 7px; border-radius:99px; background:#1d1d1a; color:#fff; font-size:11px; font-weight:800; }
    .content { display:flex; flex-direction:column; min-width:0; padding:14px; }
    .eyebrow { display:flex; justify-content:space-between; gap:10px; color:var(--accent); font-size:9px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
    h2 { margin:8px 0 15px; font-size:18px; line-height:1.25; }
    dl { display:grid; gap:6px; margin:0; font-size:11px; }
    dl div { display:grid; grid-template-columns:52px 1fr; gap:8px; }
    dt { color:var(--muted); }
    dd { margin:0; }
    .variants { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-top:auto; padding-top:14px; }
    .thumb { overflow:hidden; height:66px; padding:0; border:1px solid var(--line); border-radius:7px; background:#fafafa; cursor:pointer; }
    .thumb img { width:100%; height:100%; object-fit:contain; }
    code { overflow:hidden; margin-top:9px; color:#8b867d; font-size:8px; text-overflow:ellipsis; white-space:nowrap; }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Local refined inventory · not yet decided</p>
    <h1>${groups.length} unreviewed identities</h1>
    <p class="truth">These products were omitted from the current decision ledger. Nothing here is approved by this gallery. Use the thumbnails to inspect every recorded variant; acceptance still requires full image-level judgment and one global identity allocation.</p>
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
        card.hidden = selected !== 'All' && card.dataset.category !== selected;
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

const outputPath = `${reportDirectory}/UNREVIEWED_LOCAL_FORMAL_ADDONS_GALLERY.html`;
await writeFile(outputPath, html, "utf8");
console.log(JSON.stringify({ outputPath, identities: groups.length, categoryCounts }, null, 2));
