import { readFile, writeFile } from "node:fs/promises";
import { relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const reportDirectory =
  "output/reports/ai-stylist-mens-global-unique-visual-v16-20260913";
const manifestPath = `${reportDirectory}/visual-identity-decisions.json`;
const manualAlphaPath = `${reportDirectory}/cj-manual-gemini-final-alpha/alpha-approval-manifest.json`;
const manualCandidatesPath = `${reportDirectory}/cj-manual-approved-candidates.json`;
const outputPath = `${reportDirectory}/APPROVED_PRODUCTS_GALLERY.html`;

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const manualAlpha = JSON.parse(await readFile(manualAlphaPath, "utf8"));
const manualCandidates = JSON.parse(await readFile(manualCandidatesPath, "utf8"));

const categoryFor = (entry) => {
  const variant = entry.selectedVariant ?? {};
  if (entry.sourceCollection === "refined-cj-shoes") return "Shoes";
  if (entry.sourceCollection === "cj-mens-extras") {
    const kind = String(variant.productKind ?? "accessory").toLowerCase();
    if (kind === "shoes") return "Shoes";
    if (kind === "bag") return "Bags";
    if (kind === "watch") return "Watches";
    if (kind === "suit") return "Suits";
    return "Accessories";
  }

  const slot = String(variant.slot ?? "").toLowerCase();
  const garmentType = String(variant.garmentType ?? "").toLowerCase();
  if (slot === "watch" || garmentType.includes("watch")) return "Watches";
  if (slot === "top") return "Tops";
  if (slot === "bottom") return "Bottoms";
  if (slot === "outerwear") return "Outerwear";
  if (slot === "shoe") return "Shoes";
  if (slot === "bag") return "Bags";
  if (slot === "accessory") return "Accessories";
  return "Other";
};

const imageSource = (image) => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image) || /^data:/i.test(image)) return image;
  const repoRelativeImage = relative(process.cwd(), image);
  if (!repoRelativeImage.startsWith("..") && !repoRelativeImage.startsWith(sep)) {
    return `/${repoRelativeImage.split(sep).join("/")}`;
  }
  return pathToFileURL(image).href;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const ledgerProducts = manifest.entries
  .filter((entry) => entry.status === "accept")
  .map((entry) => {
    const variant = entry.selectedVariant ?? {};
    return {
      identity: entry.identity,
      reviewId: variant.reviewId ?? entry.sourceReviewIds?.join(", ") ?? "—",
      title: variant.title ?? "Untitled accepted product",
      category: categoryFor(entry),
      garmentType: variant.garmentType ?? variant.productKind ?? "—",
      color: variant.color ?? "unspecified",
      image: imageSource(variant.image),
      price:
        Number.isFinite(Number(variant.price)) && variant.price !== null
          ? `${variant.currency ?? "USD"} ${Number(variant.price).toFixed(2)}`
          : "Price not recorded",
      collection: entry.sourceCollection,
      constraints: entry.constraints ?? [],
      cjPageUrl: variant.cjPageUrl ?? "",
    };
  })
;

const candidateByProductId = new Map(
  manualCandidates.products.map((candidate) => [
    String(candidate.productId).toLowerCase(),
    candidate,
  ]),
);

const manualCategoryFor = (candidate) => {
  switch (String(candidate?.productKind ?? "").toLowerCase()) {
    case "shoe":
      return "Shoes";
    case "bag":
      return "Bags";
    case "bottom":
      return "Bottoms";
    case "outerwear":
      return "Outerwear";
    case "top":
      return "Tops";
    default:
      return "Accessories";
  }
};

const manualAlphaProducts = manualAlpha.entries
  .filter((entry) => {
    if (entry.alphaVisualDecision !== "approved") return false;
    const candidate = candidateByProductId.get(String(entry.productId).toLowerCase());
    return String(candidate?.status ?? "").startsWith("approved-for");
  })
  .map((entry) => {
    const productId = String(entry.productId);
    const candidate = candidateByProductId.get(productId.toLowerCase()) ?? {};
    return {
      identity: `cj:${productId.toLowerCase()}`,
      reviewId: `MANUAL-CJ-${String(entry.index).padStart(2, "0")}`,
      title: candidate.title ?? entry.garmentType ?? "Manual CJ product",
      category: manualCategoryFor(candidate),
      garmentType: candidate.garmentType ?? entry.garmentType ?? "—",
      color: candidate.color ?? entry.color ?? "unspecified",
      image: imageSource(entry.finalPath),
      price:
        Number.isFinite(Number(candidate.price)) && candidate.price !== null
          ? `${candidate.currency ?? "USD"} ${Number(candidate.price).toFixed(2)}`
          : "Price not recorded",
      collection: "manual-cj-gemini-final-alpha",
      constraints: [
        entry.alphaVisualReason,
        candidate.scenarioFit?.length
          ? `Candidate use: ${candidate.scenarioFit.join(", ")}. Complete outfit approval is still required.`
          : "Complete outfit approval is still required.",
      ].filter(Boolean),
      cjPageUrl: candidate.cjPageUrl ?? "",
    };
  });

const productsByIdentity = new Map();
for (const product of [...ledgerProducts, ...manualAlphaProducts]) {
  if (productsByIdentity.has(product.identity)) {
    throw new Error(`Duplicate accepted product identity: ${product.identity}`);
  }
  productsByIdentity.set(product.identity, product);
}

const products = [...productsByIdentity.values()].sort((left, right) =>
  `${left.category}-${left.title}`.localeCompare(`${right.category}-${right.title}`),
);

const categories = [...new Set(products.map((product) => product.category))];
const counts = Object.fromEntries(
  categories.map((category) => [
    category,
    products.filter((product) => product.category === category).length,
  ]),
);

const cards = products
  .map((product, index) => {
    const restriction = product.constraints.length
      ? product.constraints.map(escapeHtml).join(" ")
      : "Approved once; final outfit still requires season, occasion, color, budget, and proportion review.";
    const sourceLink = product.cjPageUrl
      ? `<a href="${escapeHtml(product.cjPageUrl)}" target="_blank" rel="noreferrer">Exact CJ page</a>`
      : "Existing refined catalog";

    return `
      <article class="card" data-category="${escapeHtml(product.category)}" data-search="${escapeHtml(
        `${product.title} ${product.color} ${product.garmentType} ${product.reviewId}`.toLowerCase(),
      )}">
        <div class="image-wrap">
          <span class="number">${index + 1}</span>
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" />
        </div>
        <div class="content">
          <div class="eyebrow"><span>${escapeHtml(product.category)}</span><span>${escapeHtml(product.reviewId)}</span></div>
          <h2>${escapeHtml(product.title)}</h2>
          <dl>
            <div><dt>Color</dt><dd>${escapeHtml(product.color)}</dd></div>
            <div><dt>Type</dt><dd>${escapeHtml(product.garmentType)}</dd></div>
            <div><dt>Price</dt><dd>${escapeHtml(product.price)}</dd></div>
          </dl>
          <p class="restriction">${restriction}</p>
          <div class="source"><span>${sourceLink}</span><code>${escapeHtml(product.identity)}</code></div>
        </div>
      </article>`;
  })
  .join("\n");

const filters = ["All", ...categories]
  .map(
    (category) =>
      `<button type="button" data-filter="${escapeHtml(category)}">${escapeHtml(category)} <span>${
        category === "All" ? products.length : counts[category]
      }</span></button>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" />
  <title>Men's AI Stylist — ${products.length} Visually Approved Products</title>
  <style>
    :root { color-scheme: light; --ink:#181714; --muted:#6e6a61; --line:#dedbd3; --paper:#f3f1ec; --card:#fff; --accent:#355746; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    header { position:sticky; top:0; z-index:5; padding:24px clamp(18px,3vw,48px) 18px; border-bottom:1px solid var(--line); background:rgba(243,241,236,.94); backdrop-filter:blur(14px); }
    .kicker { margin:0 0 7px; color:var(--accent); font-size:12px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:0; font-family:Georgia,"Times New Roman",serif; font-size:clamp(28px,4vw,52px); font-weight:500; letter-spacing:-.035em; }
    .truth { max-width:920px; margin:10px 0 0; color:var(--muted); font-size:14px; line-height:1.5; }
    .controls { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
    button,input { border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:999px; min-height:38px; padding:0 14px; font:inherit; }
    button { cursor:pointer; font-size:12px; font-weight:750; }
    button span { color:var(--muted); margin-left:4px; }
    button.active { background:var(--ink); border-color:var(--ink); color:#fff; }
    button.active span { color:#d8d5cc; }
    input { flex:1 1 260px; min-width:220px; border-radius:10px; }
    main { padding:22px clamp(14px,2.4vw,38px) 60px; }
    .status { margin:0 0 16px; color:var(--muted); font-size:13px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:14px; }
    .card { overflow:hidden; border:1px solid var(--line); border-radius:16px; background:var(--card); box-shadow:0 8px 28px rgba(30,27,20,.045); }
    .card[hidden] { display:none; }
    .image-wrap { position:relative; height:290px; background:#f8f8f5; }
    img { width:100%; height:100%; object-fit:contain; display:block; }
    .number { position:absolute; top:10px; left:10px; z-index:1; display:grid; place-items:center; min-width:30px; height:30px; padding:0 7px; border-radius:99px; background:rgba(20,20,18,.9); color:#fff; font-size:11px; font-weight:800; }
    .content { padding:14px; }
    .eyebrow { display:flex; justify-content:space-between; gap:12px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    h2 { min-height:44px; margin:7px 0 12px; font-size:17px; line-height:1.3; }
    dl { display:grid; gap:5px; margin:0; font-size:12px; }
    dl div { display:grid; grid-template-columns:48px 1fr; gap:8px; }
    dt { color:var(--muted); }
    dd { margin:0; }
    .restriction { min-height:58px; margin:13px 0 0; padding:10px; border-radius:10px; background:#f3f5f0; color:#4a5148; font-size:11px; line-height:1.45; }
    .source { display:flex; flex-direction:column; gap:7px; margin-top:12px; padding-top:11px; border-top:1px solid #ece9e2; font-size:11px; }
    a { color:var(--accent); font-weight:750; }
    code { overflow:hidden; color:#888279; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
    @media (max-width:620px) { header { position:relative; } .grid { grid-template-columns:1fr 1fr; gap:8px; } .image-wrap { height:205px; } .content { padding:10px; } h2 { font-size:14px; } .restriction,.source,dl { font-size:10px; } }
    @media (max-width:410px) { .grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Local visual QA · men only · wedding excluded</p>
    <h1>${products.length} approved products</h1>
    <p class="truth">These ${ledgerProducts.length} existing-ledger products and ${manualAlphaProducts.length} manual-CJ final-alpha products passed individual image review and identity deduplication. They are not automatically approved as outfits: each can be used once only, and the complete outfit still needs visual season, occasion, silhouette, palette, and budget approval.</p>
    <div class="controls">${filters}<input id="search" type="search" placeholder="Search title, color, type, or review ID" aria-label="Search approved products" /></div>
  </header>
  <main>
    <p class="status" id="status">Showing all ${products.length} products.</p>
    <section class="grid" id="grid">${cards}</section>
  </main>
  <script>
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('.card')];
    const search = document.querySelector('#search');
    const status = document.querySelector('#status');
    let active = 'All';
    const update = () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;
      for (const card of cards) {
        const categoryMatch = active === 'All' || card.dataset.category === active;
        const queryMatch = !query || card.dataset.search.includes(query);
        card.hidden = !(categoryMatch && queryMatch);
        if (!card.hidden) visible += 1;
      }
      status.textContent = 'Showing ' + visible + ' of ' + cards.length + ' approved products.';
    };
    for (const button of buttons) button.addEventListener('click', () => {
      active = button.dataset.filter;
      for (const candidate of buttons) candidate.classList.toggle('active', candidate === button);
      update();
    });
    buttons[0].classList.add('active');
    search.addEventListener('input', update);
  </script>
</body>
</html>`;

await writeFile(outputPath, html, "utf8");
console.log(
  JSON.stringify(
    {
      outputPath,
      acceptedProducts: products.length,
      existingLedgerProducts: ledgerProducts.length,
      manualCjFinalAlphaProducts: manualAlphaProducts.length,
      duplicateIdentities: ledgerProducts.length + manualAlphaProducts.length - products.length,
      counts,
    },
    null,
    2,
  ),
);
