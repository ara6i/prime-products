"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowClockwise,
  ArrowRight,
  ArrowsDownUp,
  CaretDown,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  CloudArrowUp,
  DownloadSimple,
  FileCsv,
  FileText,
  Funnel,
  Globe,
  Heartbeat,
  Key,
  LinkSimple,
  MagnifyingGlass,
  Package,
  PlugsConnected,
  Ruler,
  ShieldCheck,
  ShoppingBagOpen,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { CSSProperties, ChangeEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import type { MerchantTabView } from "../types";
import {
  IMPORT_METHODS,
  MERCHANT_PRODUCTS,
  PRODUCT_HEALTH_CHECKS,
  SIZE_CHARTS,
  type ImportMethod,
  type MerchantProduct,
  type ProductReadiness,
  type SizeChartRecord,
} from "../data/productOperationsData";
import styles from "./productOperations.module.css";

type Props = {
  activeTabId: string;
  tabs: MerchantTabView[];
};

const tabMeta = {
  "all-products": {
    icon: Package,
    step: "01",
    label: "All products",
    helper: "Find, inspect and manage merchant products",
    summary: "4,812 products",
  },
  "import-products": {
    icon: CloudArrowUp,
    step: "02",
    label: "Import products",
    helper: "Connect a source and preview the import",
    summary: "4 source choices",
  },
  "size-charts": {
    icon: Ruler,
    step: "03",
    label: "Size charts",
    helper: "Find, approve and assign sizing evidence",
    summary: "12 need review",
  },
  "product-health": {
    icon: Heartbeat,
    step: "04",
    label: "Product health",
    helper: "Understand every lost completeness point",
    summary: "126 need a fix",
  },
} as const;

type ProductTabId = keyof typeof tabMeta;
type Tone = "positive" | "warning" | "critical" | "info" | "neutral";

function toneForReadiness(readiness: ProductReadiness): Tone {
  if (readiness === "Ready") return "positive";
  if (readiness === "Needs information") return "warning";
  if (readiness === "Conflicting information") return "info";
  return "critical";
}

function toneForChart(status: MerchantProduct["sizeChart"] | SizeChartRecord["status"]): Tone {
  if (status === "Connected" || status === "Approved") return "positive";
  if (status === "Problem") return "critical";
  if (status === "Missing" || status === "Missing values") return "critical";
  return "warning";
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const Icon = tone === "positive" ? CheckCircle : tone === "neutral" ? FileText : WarningCircle;
  return (
    <span className={`${styles.statusPill} ${styles[`statusPill_${tone}`]}`}>
      <Icon size={14} weight="fill" aria-hidden />
      {label}
    </span>
  );
}

function TaskCard({
  tab,
  active,
  firstTabId,
  mobile = false,
}: {
  tab: MerchantTabView;
  active: boolean;
  firstTabId: string;
  mobile?: boolean;
}) {
  const meta = tabMeta[tab.id as ProductTabId] ?? tabMeta["all-products"];
  const Icon = meta.icon;
  return (
    <Link
      id={mobile ? undefined : `${tab.id}-tab`}
      href={`/merchants/dashboard/products${tab.id === firstTabId ? "" : `?tab=${tab.id}`}`}
      aria-current={active ? "page" : undefined}
      aria-controls="merchant-tab-panel"
      className={active ? styles.taskCardActive : undefined}
      onClick={(event) => {
        if (mobile) event.currentTarget.closest("details")?.removeAttribute("open");
      }}
    >
      <span className={styles.taskCardIcon}>
        <Icon size={24} weight="duotone" aria-hidden />
      </span>
      <span className={styles.taskCardCopy}>
        <small>{meta.step} · Products</small>
        <strong>{meta.label}</strong>
        <span>{meta.helper}</span>
      </span>
      <span className={styles.taskCardStatus}>
        {meta.summary}
        <ArrowRight size={15} weight="bold" aria-hidden />
      </span>
    </Link>
  );
}

function WorkflowNavigation({ activeTabId, tabs }: Props) {
  const activeMeta = tabMeta[activeTabId as ProductTabId] ?? tabMeta["all-products"];
  const ActiveIcon = activeMeta.icon;
  const firstTabId = tabs[0]?.id ?? "all-products";
  return (
    <>
      <nav className={styles.desktopTaskNav} aria-label="Choose a product task">
        {tabs.map((tab) => (
          <TaskCard key={tab.id} tab={tab} active={tab.id === activeTabId} firstTabId={firstTabId} />
        ))}
      </nav>
      <details className={styles.mobileTaskPicker}>
        <summary>
          <span><ActiveIcon size={21} weight="duotone" aria-hidden /></span>
          <span><small>Current product task</small><strong>{activeMeta.label}</strong></span>
          <span>Change <CaretDown size={16} weight="bold" aria-hidden /></span>
        </summary>
        <div aria-label="Choose another product task">
          {tabs.map((tab) => (
            <TaskCard key={tab.id} tab={tab} active={tab.id === activeTabId} firstTabId={firstTabId} mobile />
          ))}
        </div>
      </details>
    </>
  );
}

function WorkspaceHeading({
  eyebrow,
  title,
  detail,
  actions,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.workspaceHeading}>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {actions ? <div className={styles.headingActions}>{actions}</div> : null}
    </header>
  );
}

function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.demoNotice} role="status">
      <ShieldCheck size={17} weight="fill" aria-hidden />
      {children}
    </p>
  );
}

function scoreTone(score: number): Tone {
  if (score >= 90) return "positive";
  if (score >= 75) return "warning";
  return "critical";
}

function ProductScore({ score, compact = false }: { score: number; compact?: boolean }) {
  return (
    <span
      className={`${styles.productScore} ${styles[`productScore_${scoreTone(score)}`]} ${compact ? styles.productScoreCompact : ""}`}
      aria-label={`Product completeness score ${score} out of 100`}
    >
      <strong>{score}</strong>
      {!compact ? <small>/100</small> : null}
    </span>
  );
}

function ProductDetailPanel({ product, onClose }: { product: MerchantProduct; onClose: () => void }) {
  return (
    <div className={styles.detailBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <aside className={styles.productDetail} role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
        <header>
          <div>
            <span>Merchant product</span>
            <h3 id="product-detail-title">{product.name}</h3>
            <p>{product.sku} · {product.id}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close product details"><X size={20} /></button>
        </header>
        <div className={styles.detailIdentity}>
          <span><Image src={product.image} alt={`${product.name} product image`} fill sizes="120px" /></span>
          <div>
            <StatusPill label={product.readiness} tone={toneForReadiness(product.readiness)} />
            <ProductScore score={product.score} />
          </div>
        </div>
        <section className={styles.detailSection}>
          <h4>Product information</h4>
          <dl>
            <div><dt>Merchant product ID</dt><dd>{product.merchantProductId}</dd></div>
            <div><dt>Barcode</dt><dd>{product.barcode}</dd></div>
            <div><dt>Category</dt><dd>{product.category}</dd></div>
            <div><dt>Price / stock</dt><dd>${product.price.toFixed(2)} · {product.stock} units</dd></div>
            <div><dt>Material</dt><dd>{product.material}</dd></div>
            <div><dt>Fit</dt><dd>{product.fit}</dd></div>
          </dl>
        </section>
        <section className={styles.detailSection}>
          <h4>Options</h4>
          <div className={styles.optionGroups}>
            <div><span>Sizes</span><p>{product.sizes.map((size) => <b key={size}>{size}</b>)}</p></div>
            <div><span>Colors</span><p>{product.colors.map((color) => <b key={color}>{color}</b>)}</p></div>
          </div>
        </section>
        <section className={styles.detailSection}>
          <h4>Source</h4>
          <p className={styles.sourceEvidence}><LinkSimple size={17} />{product.sourceDetail}</p>
        </section>
        <section className={styles.detailSection}>
          <h4>Exact problems</h4>
          {product.problems.length ? (
            <ul className={styles.problemList}>{product.problems.map((problem) => <li key={problem}><WarningCircle size={17} weight="fill" />{problem}</li>)}</ul>
          ) : <p className={styles.noProblems}><CheckCircle size={17} weight="fill" />No product problems found.</p>}
        </section>
        <section className={styles.detailSection}>
          <h4>Changes</h4>
          <ol className={styles.changeHistory}>{product.changeHistory.map((item) => (
            <li key={`${item.date}-${item.title}`}><span /><div><small>{item.date}</small><strong>{item.title}</strong><p>{item.detail}</p></div></li>
          ))}</ol>
        </section>
      </aside>
    </div>
  );
}

function downloadProductsReport(products: MerchantProduct[], filename: string) {
  const header = ["Product", "SKU", "Source", "Category", "Stock", "Size chart", "Score", "Status", "Problems"];
  const rows = products.map((product) => [
    product.name,
    product.sku,
    product.source,
    product.category,
    String(product.stock),
    product.sizeChart,
    String(product.score),
    product.readiness,
    product.problems.join(" | "),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function AllProductsExperience() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [chart, setChart] = useState("all");
  const [score, setScore] = useState("all");
  const [problem, setProblem] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const [sort, setSort] = useState("last-update");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailProduct, setDetailProduct] = useState<MerchantProduct | null>(null);
  const [notice, setNotice] = useState("");

  const categories = useMemo(() => Array.from(new Set(MERCHANT_PRODUCTS.map((item) => item.category))).sort(), []);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = MERCHANT_PRODUCTS.filter((item) => {
      const matchesSearch = !query || [item.name, item.sku, item.barcode, item.merchantProductId].some((value) => value.toLowerCase().includes(query));
      const matchesSource = source === "all" || item.source === source;
      const matchesCategory = category === "all" || item.category === category;
      const matchesStock = stock === "all" || (stock === "in" && item.stock > 0) || (stock === "low" && item.stock > 0 && item.stock <= 10) || (stock === "out" && item.stock === 0);
      const matchesChart = chart === "all" || item.sizeChart === chart;
      const matchesScore = score === "all" || (score === "90" && item.score >= 90) || (score === "75" && item.score >= 75 && item.score < 90) || (score === "under75" && item.score < 75);
      const matchesProblem = problem === "all" || (problem === "has" && item.problems.length > 0) || (problem === "none" && item.problems.length === 0) || item.problems.some((itemProblem) => itemProblem.toLowerCase().includes(problem));
      const matchesReadiness = readiness === "all" || item.readiness === readiness || (readiness === "not-ready" && item.readiness !== "Ready");
      return matchesSearch && matchesSource && matchesCategory && matchesStock && matchesChart && matchesScore && matchesProblem && matchesReadiness;
    });
    return result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "newest") return b.createdOrder - a.createdOrder;
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "stock") return b.stock - a.stock;
      if (sort === "score") return b.score - a.score;
      if (sort === "problems") return b.problems.length - a.problems.length;
      return b.updatedOrder - a.updatedOrder;
    });
  }, [category, chart, problem, readiness, score, search, sort, source, stock]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((item) => selectedIds.includes(item.id));
  const selectedProducts = MERCHANT_PRODUCTS.filter((item) => selectedIds.includes(item.id));
  const hasActiveFilters = source !== "all" || category !== "all" || stock !== "all" || chart !== "all" || score !== "all" || problem !== "all" || readiness !== "all";

  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearch(""); setSource("all"); setCategory("all"); setStock("all"); setChart("all");
    setScore("all"); setProblem("all"); setReadiness("all"); setSort("last-update"); setPage(1);
  };
  const applyQuickView = (view: "all" | "ready" | "attention" | "missing-chart" | "low-stock") => {
    clearFilters();
    if (view === "ready") setReadiness("Ready");
    if (view === "attention") setReadiness("not-ready");
    if (view === "missing-chart") setChart("Missing");
    if (view === "low-stock") setStock("low");
  };
  const runBulkPreview = (label: string) => setNotice(`${label} prepared for ${selectedIds.length} selected product${selectedIds.length === 1 ? "" : "s"}. No merchant data was changed.`);

  return (
    <div className={styles.experienceStack}>
      <WorkspaceHeading
        eyebrow="Catalog"
        title="Products"
        detail="Manage every product your store sends to PrimeStyleAI. Shopper-facing product pages stay separate."
        actions={<button type="button" className={styles.primaryButton} onClick={() => setNotice("Add-product choices are available in Import products.")}><CloudArrowUp size={18} />Add products</button>}
      />

      <section className={styles.catalogAnalytics} aria-labelledby="catalog-summary-title">
        <header>
          <div><span>Catalog summary</span><h3 id="catalog-summary-title">Product data health</h3><p>A compact overview; detailed analysis stays in Product health.</p></div>
          <Link href="/merchants/dashboard/products?tab=product-health">View product health <ArrowRight size={15} weight="bold" /></Link>
        </header>
        <div className={styles.catalogMetricGrid}>
          <article><span>Products</span><strong>4,812</strong><small>12,944 variants</small></article>
          <article><span>Ready</span><strong>4,686</strong><small>97.4% usable</small></article>
          <article><span>Need attention</span><strong>126</strong><small>12 blocked</small></article>
          <article><span>Health score</span><strong>94</strong><small>average / 100</small></article>
        </div>
      </section>

      <section className={styles.catalogListSection} aria-labelledby="product-catalog-title">
        <header className={styles.catalogListHeader}>
          <div><span>Product catalog</span><h3 id="product-catalog-title">All products</h3><p>Search inventory and fix missing information directly from each product row.</p></div>
          <strong>{filtered.length} <small>shown</small></strong>
        </header>
        <section className={styles.productControlPanel} aria-label="Product search and filters">
        <div className={styles.searchSortRow}>
          <label className={styles.searchField}>
            <MagnifyingGlass size={18} aria-hidden />
            <span className={styles.srOnly}>Search products</span>
            <input value={search} onChange={(event) => changeFilter(setSearch, event.target.value)} placeholder="Search name, SKU, barcode or merchant product ID" />
            {search ? <button type="button" onClick={() => changeFilter(setSearch, "")} aria-label="Clear search"><X size={16} /></button> : null}
          </label>
          <label className={styles.sortField}>
            <ArrowsDownUp size={17} aria-hidden />
            <span>Sort</span>
            <select value={sort} onChange={(event) => changeFilter(setSort, event.target.value)}>
              <option value="last-update">Last update</option><option value="newest">Newest</option><option value="name">Name</option>
              <option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option>
              <option value="stock">Stock</option><option value="score">Score</option><option value="problems">Number of problems</option>
            </select>
          </label>
          <button type="button" className={styles.filterToggle} aria-expanded={showFilters} onClick={() => setShowFilters((value) => !value)}>
            <Funnel size={17} />Filters{hasActiveFilters ? <span /> : null}
          </button>
        </div>
        <div className={styles.quickViews} aria-label="Quick product views">
          <button type="button" aria-pressed={!hasActiveFilters} onClick={() => applyQuickView("all")}>All <strong>4,812</strong></button>
          <button type="button" aria-pressed={readiness === "Ready"} onClick={() => applyQuickView("ready")}>Ready <strong>4,686</strong></button>
          <button type="button" aria-pressed={readiness === "not-ready"} onClick={() => applyQuickView("attention")}>Needs attention <strong>126</strong></button>
          <button type="button" aria-pressed={chart === "Missing"} onClick={() => applyQuickView("missing-chart")}>Missing size chart <strong>84</strong></button>
          <button type="button" aria-pressed={stock === "low"} onClick={() => applyQuickView("low-stock")}>Low stock <strong>37</strong></button>
        </div>
        {showFilters ? <div className={styles.filterGrid}>
            <span className={styles.filterLabel}><Funnel size={16} />Advanced filters</span>
            <label><span>Source</span><select value={source} onChange={(event) => changeFilter(setSource, event.target.value)}><option value="all">All sources</option><option>Shopify</option><option>Merchant API</option><option>CSV</option><option>Website</option></select></label>
            <label><span>Category</span><select value={category} onChange={(event) => changeFilter(setCategory, event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Stock</span><select value={stock} onChange={(event) => changeFilter(setStock, event.target.value)}><option value="all">Any stock</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select></label>
            <label><span>Size chart</span><select value={chart} onChange={(event) => changeFilter(setChart, event.target.value)}><option value="all">Any chart status</option><option>Connected</option><option>Missing</option><option>Problem</option><option>Waiting approval</option></select></label>
            <label><span>Score</span><select value={score} onChange={(event) => changeFilter(setScore, event.target.value)}><option value="all">Any score</option><option value="90">90–100</option><option value="75">75–89</option><option value="under75">Below 75</option></select></label>
            <label><span>Problem</span><select value={problem} onChange={(event) => changeFilter(setProblem, event.target.value)}><option value="all">Any problem</option><option value="has">Has a problem</option><option value="none">No problems</option><option value="size">Sizing</option><option value="material">Material</option><option value="stock">Stock</option><option value="shipping">Shipping</option></select></label>
            <label><span>Readiness</span><select value={readiness} onChange={(event) => changeFilter(setReadiness, event.target.value)}><option value="all">Ready and not ready</option><option>Ready</option><option value="not-ready">Not ready</option><option>Needs information</option><option>Conflicting information</option><option>Blocked</option></select></label>
            <button type="button" className={styles.clearFilters} onClick={clearFilters}>Clear all</button>
          </div> : null}
        </section>

      {selectedIds.length ? (
        <section className={styles.bulkBar} aria-label="Bulk product actions">
          <strong>{selectedIds.length} selected</strong>
          <div>
            <button type="button" onClick={() => runBulkPreview("Re-import")}><ArrowClockwise size={17} />Re-import</button>
            <button type="button" onClick={() => runBulkPreview("Exclude")}><X size={17} />Exclude</button>
            <button type="button" onClick={() => runBulkPreview("Size-chart assignment")}><Ruler size={17} />Assign size chart</button>
            <button type="button" onClick={() => { downloadProductsReport(selectedProducts, "selected-products-report.csv"); setNotice("Selected-product report downloaded."); }}><DownloadSimple size={17} />Export report</button>
          </div>
          <button type="button" onClick={() => setSelectedIds([])} aria-label="Clear product selection"><X size={18} /></button>
        </section>
      ) : null}
      {notice ? <DemoNotice>{notice}</DemoNotice> : null}

      <section className={styles.productTableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.productTable}>
            <thead><tr>
              <th><input type="checkbox" aria-label="Select all products on this page" checked={allVisibleSelected} onChange={() => {
                const visibleIds = visibleProducts.map((item) => item.id);
                setSelectedIds(allVisibleSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds])));
              }} /></th>
              <th>Product</th><th>Price</th><th>Inventory</th><th>Variants</th><th>Size chart</th><th>Status</th><th>Needs attention</th>
            </tr></thead>
            <tbody>
              {visibleProducts.map((item) => (
                <tr key={item.id} className={selectedIds.includes(item.id) ? styles.productRowSelected : undefined}>
                  <td><input type="checkbox" aria-label={`Select ${item.name}`} checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /></td>
                  <td><button type="button" className={styles.productIdentity} onClick={() => setDetailProduct(item)}><span><Image src={item.image} alt="" fill sizes="52px" /></span><span><strong>{item.name}</strong><small>{item.sku} · {item.category} · {item.source}</small></span></button></td>
                  <td><strong>${item.price.toFixed(2)}</strong></td>
                  <td><span className={styles.inventoryCell}><b className={item.stock === 0 ? styles.stockOut : item.stock <= 10 ? styles.stockLow : styles.stockGood}>{item.stock}</b><small>{item.stock === 0 ? "Out of stock" : item.stock <= 10 ? "Low stock" : "In stock"}</small></span></td>
                  <td><strong>{item.sizes.length} sizes</strong><small className={styles.cellSubline}>{item.colors.length} colors</small></td>
                  <td><StatusPill label={item.sizeChart} tone={toneForChart(item.sizeChart)} /></td>
                  <td><StatusPill label={item.readiness} tone={toneForReadiness(item.readiness)} /></td>
                  <td>{item.problems.length ? <button type="button" className={styles.catalogIssue} onClick={() => setDetailProduct(item)}><WarningCircle size={16} weight="fill" /><span><strong>{item.problems[0]}</strong><small>{item.problems.length > 1 ? `+${item.problems.length - 1} more` : "Open details"}</small></span></button> : <span className={styles.noProblemCell}><Check size={15} />No issues</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleProducts.length ? <div className={styles.emptyState}><MagnifyingGlass size={28} /><strong>No products match these filters</strong><button type="button" onClick={clearFilters}>Clear filters</button></div> : null}
        <footer className={styles.paginationBar}>
          <p>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} products <span>· 4,812 total connected</span></p>
          <label>Products per page <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={5}>5</option><option value={10}>10</option><option value={25}>25</option></select></label>
          <nav aria-label="Product table pages"><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button></nav>
        </footer>
      </section>
      </section>
      {detailProduct ? <ProductDetailPanel product={detailProduct} onClose={() => setDetailProduct(null)} /> : null}
    </div>
  );
}

const importPreviewRows = [
  { name: "Silk column dress", sku: "NTA-DR-10412", result: "Update existing", detail: "Matched by Shopify product ID", tone: "positive" as Tone },
  { name: "Marais satin top", sku: "NTA-TP-10502", result: "New product", detail: "All required fields matched", tone: "info" as Tone },
  { name: "Nadia poplin shirt", sku: "NTA-SH-10463", result: "Possible duplicate", detail: "Similar barcode already connected", tone: "warning" as Tone },
  { name: "Leather slingback pump", sku: "NTA-SH-10442", result: "Import error", detail: "EU 39–40 measurements missing", tone: "critical" as Tone },
];

function ImportMethodIcon({ id }: { id: ImportMethod["id"] }) {
  const Icon = id === "shopify" ? ShoppingBagOpen : id === "api" ? Key : id === "file" ? FileCsv : Globe;
  return <Icon size={24} weight="duotone" aria-hidden />;
}

function ImportProductsExperience() {
  const [selectedMethodId, setSelectedMethodId] = useState<ImportMethod["id"]>("shopify");
  const [fileName, setFileName] = useState("");
  const [schedule, setSchedule] = useState("automatic");
  const [notice, setNotice] = useState("");
  const selected = IMPORT_METHODS.find((method) => method.id === selectedMethodId) ?? IMPORT_METHODS[0];
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setNotice(`${file.name} selected locally. The preview below is demo data; the file has not been uploaded or parsed.`);
  };

  return (
    <div className={styles.experienceStack}>
      <WorkspaceHeading eyebrow="Catalog source" title="Import products" detail="Choose exactly how PrimeStyleAI receives merchant-authorized products. Review access, preview data and errors, then choose one-time or automatic updates." />
      <section className={styles.importMethodGrid} aria-label="Product import choices">
        {IMPORT_METHODS.map((method) => (
          <button key={method.id} type="button" aria-pressed={selectedMethodId === method.id} className={selectedMethodId === method.id ? styles.importMethodActive : undefined} onClick={() => { setSelectedMethodId(method.id); setNotice(""); }}>
            <span className={styles.importMethodIcon}><ImportMethodIcon id={method.id} /></span>
            <span><small>{method.eyebrow}</small><strong>{method.title}</strong><p>{method.description}</p></span>
            <StatusPill label={method.status} tone={method.status === "Connected" ? "positive" : method.status === "Needs permission" ? "warning" : "info"} />
          </button>
        ))}
      </section>

      <section className={styles.importWorkspace}>
        <article className={styles.connectionPanel}>
          <header><div><span>Selected source</span><h3>{selected.title}</h3><p>{selected.description}</p></div><StatusPill label={selected.status} tone={selected.status === "Connected" ? "positive" : "warning"} /></header>
          <ol className={styles.setupSteps}>
            <li className={selected.status === "Connected" ? styles.stepComplete : styles.stepCurrent}><span>{selected.status === "Connected" ? <Check size={16} /> : "1"}</span><div><strong>Connect & approve</strong><small>Merchant reviews access before data is read.</small></div></li>
            <li className={styles.stepCurrent}><span>2</span><div><strong>Preview & match</strong><small>Map fields, find duplicates and inspect errors.</small></div></li>
            <li><span>3</span><div><strong>Choose products</strong><small>Select exactly what PrimeStyleAI may import.</small></div></li>
            <li><span>4</span><div><strong>Set updates</strong><small>One-time import or merchant-approved schedule.</small></div></li>
          </ol>
          <div className={styles.permissionBox}>
            <ShieldCheck size={22} weight="duotone" />
            <div><span>Approved read access</span><strong>{selected.access}</strong><p>Secret keys are encrypted outside the UI and are never displayed here.</p></div>
          </div>
          {selected.id === "file" ? (
            <label className={styles.uploadDropzone}><input className={styles.srOnly} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} /><UploadSimple size={25} /><span><strong>{fileName || "Choose a CSV or Excel file"}</strong><small>Nothing uploads until the merchant confirms.</small></span></label>
          ) : selected.id === "website" ? (
            <div className={styles.websiteFields}><label>Approved domain<input defaultValue="northstar.demo" /></label><label>Sitemap or product URLs<input placeholder="https://northstar.demo/sitemap.xml" /></label><label>Maximum request rate<select defaultValue="2"><option value="1">1 request / second</option><option value="2">2 requests / second</option><option value="5">5 requests / second</option></select></label><p><ShieldCheck size={16} />Requires DNS/file proof and written permission. Never bypasses a login, CAPTCHA or blocked page.</p></div>
          ) : selected.id === "api" ? (
            <div className={styles.apiFields}><label>API base URL<input placeholder="https://api.merchant.com/catalog" /></label><label>Authentication<select defaultValue="approved-signin"><option value="approved-signin">Merchant-approved sign-in</option><option value="read-only-key">Read-only API key</option></select></label><p><Key size={16} />A secret can be entered in the secure connection step, but it will never be shown again.</p></div>
          ) : (
            <div className={styles.shopifyConnection}><ShoppingBagOpen size={28} weight="duotone" /><div><strong>Northstar Atelier</strong><span>northstar-atelier.myshopify.com</span><small>Products access approved. Inventory and locations are enabled for live stock.</small></div></div>
          )}
          <div className={styles.connectionActions}>
            <button type="button" className={styles.primaryButton} onClick={() => setNotice(`${selected.title} connection test preview passed. No external connection was changed.`)}><PlugsConnected size={18} />{selected.status === "Connected" ? "Test connection" : `Connect ${selected.title}`}</button>
            {selected.status === "Connected" ? <><button type="button" onClick={() => setNotice("Credential rotation preview opened. No credential was changed.")}><ArrowClockwise size={17} />Rotate access</button><button type="button" onClick={() => setNotice("Disconnect preview opened. The source remains connected.")}><X size={17} />Disconnect</button></> : null}
          </div>
        </article>

        <aside className={styles.connectionStatusPanel}>
          <span>Connection record</span><h3>Access & update health</h3>
          <dl><div><dt>Health</dt><dd>{selected.health}</dd></div><div><dt>Approved by</dt><dd>{selected.approvedBy}</dd></div><div><dt>Last import</dt><dd>{selected.lastImport}</dd></div><div><dt>Next update</dt><dd>{selected.nextUpdate}</dd></div><div><dt>Import errors</dt><dd>{selected.id === "shopify" ? "3 products need review" : "No completed import"}</dd></div></dl>
          <p><ShieldCheck size={17} />Read-only access. PrimeStyleAI cannot edit the merchant’s source catalog.</p>
        </aside>
      </section>
      {notice ? <DemoNotice>{notice}</DemoNotice> : null}

      <section className={styles.importPreviewPanel}>
        <WorkspaceHeading eyebrow="Import preview" title="Match fields, duplicates and errors" detail="Review the proposed result before importing anything." />
        <div className={styles.mappingSummary}>
          <article><span>Matched fields</span><strong>18 / 20</strong><small>Title, SKU, variants and more</small></article>
          <article><span>Needs mapping</span><strong>2</strong><small>Fit and return policy</small></article>
          <article><span>Possible duplicates</span><strong>1</strong><small>Review before import</small></article>
          <article><span>Rows with errors</span><strong>1</strong><small>Will not import silently</small></article>
        </div>
        <div className={styles.fieldMappingRow}><label>Merchant column<select defaultValue="material"><option value="material">fabric_composition</option></select></label><ArrowRight size={18} /><label>PrimeStyleAI field<select defaultValue="material"><option value="material">Material</option><option value="fit">Fit</option><option value="ignore">Do not import</option></select></label><StatusPill label="Matched" tone="positive" /></div>
        <div className={styles.tableScroll}><table className={styles.previewTable}><thead><tr><th>Import</th><th>Product</th><th>SKU</th><th>Proposed result</th><th>Reason</th></tr></thead><tbody>{importPreviewRows.map((row) => <tr key={row.sku}><td><input type="checkbox" defaultChecked={row.tone !== "critical"} aria-label={`Import ${row.name}`} /></td><td><strong>{row.name}</strong></td><td>{row.sku}</td><td><StatusPill label={row.result} tone={row.tone} /></td><td>{row.detail}</td></tr>)}</tbody></table></div>
        <footer className={styles.importSchedule}><div><span>Update schedule</span><label><input type="radio" name="schedule" value="once" checked={schedule === "once"} onChange={() => setSchedule("once")} />One-time import</label><label><input type="radio" name="schedule" value="automatic" checked={schedule === "automatic"} onChange={() => setSchedule("automatic")} />Automatic hourly updates</label></div><button type="button" className={styles.primaryButton} onClick={() => setNotice(`Import preview prepared for a ${schedule === "once" ? "one-time" : "scheduled"} update. No products were imported.`)}>Review 3 products<ArrowRight size={17} /></button></footer>
      </section>
    </div>
  );
}

function SizeChartsExperience() {
  const [selectedId, setSelectedId] = useState(SIZE_CHARTS[0].id);
  const [notice, setNotice] = useState("");
  const [uploadName, setUploadName] = useState("");
  const selected = SIZE_CHARTS.find((chart) => chart.id === selectedId) ?? SIZE_CHARTS[0];
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    setNotice(`${file.name} selected locally. No chart was uploaded or assigned.`);
  };
  const firstColumnLabel = selected.basis === "Foot length" ? "Foot length" : selected.category === "Trousers" ? "Waist" : "Bust";
  const secondColumnLabel = selected.category === "Trousers" ? "Hip" : "Waist";
  const thirdColumnLabel = selected.category === "Trousers" ? "Inseam" : "Hip";
  return (
    <div className={styles.experienceStack}>
      <WorkspaceHeading eyebrow="Sizing data" title="Size charts" detail="Find, upload and connect the correct merchant-approved chart to every product. Detected evidence is never used before merchant approval." actions={<><button type="button" onClick={() => setNotice("Automatic detection preview completed: 2 possible charts found; nothing was approved.")}><MagnifyingGlass size={17} />Detect charts</button><label className={styles.actionLabel}><input className={styles.srOnly} type="file" accept=".csv,.xlsx,.xls,.pdf,image/*" onChange={handleUpload} /><UploadSimple size={17} />{uploadName ? "File selected" : "Upload chart"}</label><button type="button" className={styles.primaryButton} onClick={() => setNotice("Manual measurement entry preview opened. No chart was created.")}><FileText size={17} />Enter measurements</button></>} />
      <section className={styles.summaryStrip} aria-label="Size chart coverage">
        <article><span>With a chart</span><strong>4,686</strong><small>97.4% coverage</small></article><article><span>Without a chart</span><strong>84</strong><small>Cannot answer sizing</small></article><article><span>Chart problems</span><strong>12</strong><small>Conflicts or missing values</small></article><article><span>Waiting approval</span><strong>30</strong><small>Detected, not in use</small></article>
      </section>
      {notice ? <DemoNotice>{notice}</DemoNotice> : null}
      <section className={styles.chartWorkspace}>
        <aside className={styles.chartList}>
          <header><span>Chart library</span><strong>{SIZE_CHARTS.length} examples</strong></header>
          <label><MagnifyingGlass size={16} /><input placeholder="Find a chart or category" /></label>
          <div>{SIZE_CHARTS.map((chart) => <button key={chart.id} type="button" aria-pressed={chart.id === selectedId} className={chart.id === selectedId ? styles.chartCardActive : undefined} onClick={() => { setSelectedId(chart.id); setNotice(""); }}><span><strong>{chart.name}</strong><small>{chart.source}</small></span><StatusPill label={chart.status} tone={toneForChart(chart.status)} /><p>{chart.issue}</p><em>{chart.products} products · {chart.version}</em></button>)}</div>
        </aside>
        <article className={styles.chartDetail}>
          <header><div><span>Selected chart</span><h3>{selected.name}</h3><p>{selected.issue}</p></div><StatusPill label={selected.status} tone={toneForChart(selected.status)} /></header>
          <dl className={styles.chartMeta}><div><dt>Source</dt><dd>{selected.source}</dd></div><div><dt>Category</dt><dd>{selected.category}</dd></div><div><dt>Region</dt><dd>{selected.region}</dd></div><div><dt>Units</dt><dd>{selected.units}</dd></div><div><dt>Measurement basis</dt><dd>{selected.basis}</dd></div><div><dt>Used by</dt><dd>{selected.products} products</dd></div></dl>
          <div className={styles.measurementTableWrap}><table className={styles.measurementTable}><thead><tr><th>Size</th><th>{firstColumnLabel} ({selected.units})</th><th>{secondColumnLabel} ({selected.units})</th><th>{thirdColumnLabel} ({selected.units})</th></tr></thead><tbody>{selected.measurements.map((row) => <tr key={row.size}><th>{row.size}</th><td className={row.first === "Missing" ? styles.missingValue : undefined}>{row.first}</td><td>{row.second}</td><td>{row.third}</td></tr>)}</tbody></table></div>
          <div className={`${styles.chartIssueBox} ${selected.status === "Approved" ? styles.chartIssueHealthy : ""}`}><span>{selected.status === "Approved" ? <CheckCircle size={24} weight="fill" /> : <WarningCircle size={24} weight="fill" />}</span><div><small>{selected.status === "Approved" ? "Latest check" : "Merchant decision needed"}</small><strong>{selected.issue}</strong><p>Changing this chart will recheck affected products and keep the previous version in history.</p></div></div>
          <footer className={styles.chartActions}><button type="button" onClick={() => setNotice(`Assignment preview opened for ${selected.products} matching products. Nothing was changed.`)}><Package size={17} />Assign to matching products</button><button type="button" className={styles.primaryButton} disabled={selected.status === "Approved"} onClick={() => setNotice("Approval preview completed. The chart remains unchanged in this demo.")}><CheckCircle size={17} />{selected.status === "Approved" ? "Already approved" : "Review & approve"}</button></footer>
        </article>
      </section>
      <section className={styles.chartReports}>
        <WorkspaceHeading eyebrow="Coverage & problem report" title="What still needs merchant attention" detail="Missing, overlapping, unusual and incorrectly assigned charts are kept separate." />
        <div><article><span><Ruler size={20} /></span><div><small>Missing chart</small><strong>84 products</strong><p>Footwear and dresses are most affected.</p></div><button type="button" onClick={() => setNotice("Missing-chart product list previewed.")}>View products</button></article><article><span><WarningCircle size={20} /></span><div><small>Overlapping ranges</small><strong>12 products</strong><p>Women’s dresses M/L bust ranges conflict.</p></div><button type="button" onClick={() => setSelectedId("SIZ-03142")}>Open chart</button></article><article><span><ArrowsDownUp size={20} /></span><div><small>Unusual numbers</small><strong>7 products</strong><p>Measurements are outside the category range.</p></div><button type="button" onClick={() => setNotice("Unusual-measurement report previewed.")}>Review</button></article><article><span><LinkSimple size={20} /></span><div><small>Wrong chart</small><strong>5 products</strong><p>A tailoring chart is assigned to dresses.</p></div><button type="button" onClick={() => setNotice("Wrong-chart assignment report previewed.")}>Fix assignment</button></article></div>
        <footer><ClockCounterClockwise size={18} /><span><strong>Version history is on</strong><small>Previous chart versions and affected-product rechecks are retained.</small></span><button type="button" onClick={() => setNotice("Chart version-history preview opened.")}>View history</button></footer>
      </section>
    </div>
  );
}

function scoreReasons(product: MerchantProduct) {
  if (!product.problems.length) return [{ label: "No points lost", points: 0 }];
  const available = 100 - product.score;
  return product.problems.map((problem, index) => ({
    label: problem,
    points: index === product.problems.length - 1 ? available - Math.floor(available / product.problems.length) * index : Math.floor(available / product.problems.length),
  }));
}

function checkIsProblem(product: MerchantProduct, check: string) {
  const words: Record<string, string[]> = {
    Images: ["image"], Stock: ["stock"], Material: ["material"], Fit: ["fit"], "Size chart": ["size", "measurement", "chart"], Shipping: ["shipping"], Returns: ["return"], Variants: ["variant"],
  };
  return (words[check] ?? []).some((word) => product.problems.some((problem) => problem.toLowerCase().includes(word)));
}

function ProductHealthExperience() {
  const healthProducts = useMemo(() => [...MERCHANT_PRODUCTS].sort((a, b) => a.score - b.score), []);
  const [selectedId, setSelectedId] = useState(healthProducts[0].id);
  const [statusFilter, setStatusFilter] = useState("all");
  const [problemFilter, setProblemFilter] = useState("");
  const [notice, setNotice] = useState("");
  const selected = healthProducts.find((item) => item.id === selectedId) ?? healthProducts[0];
  const filtered = healthProducts.filter((item) => (statusFilter === "all" || item.readiness === statusFilter) && (!problemFilter || item.problems.some((problem) => problem.toLowerCase().includes(problemFilter.toLowerCase()))));
  const reasons = scoreReasons(selected);
  return (
    <div className={styles.experienceStack}>
      <WorkspaceHeading eyebrow="Catalog quality" title="Product health" detail="A 0–100 completeness score shows how much required merchant product information is present. Every lost point has a plain-language reason." actions={<><button type="button" onClick={() => setNotice("Safe bulk-fix preview opened. PrimeStyleAI will never invent or silently change merchant data.")}><CheckCircle size={17} />Safe bulk fixes</button><button type="button" className={styles.primaryButton} onClick={() => { downloadProductsReport(healthProducts, "product-health-report.csv"); setNotice("Product-health report downloaded."); }}><DownloadSimple size={17} />Export report</button></>} />
      <section className={styles.summaryStrip} aria-label="Product health summary"><article><span>Ready</span><strong>4,686</strong><small>90–100 and no blocker</small></article><article><span>Needs information</span><strong>96</strong><small>Merchant fields missing</small></article><article><span>Conflicting</span><strong>18</strong><small>Sources disagree</small></article><article><span>Blocked</span><strong>12</strong><small>Required evidence missing</small></article></section>
      {notice ? <DemoNotice>{notice}</DemoNotice> : null}
      <section className={styles.healthWorkspace}>
        <aside className={styles.healthQueue}>
          <header><span>Prioritized fix list</span><strong>Lowest score first</strong></header>
          <div className={styles.healthFilters}><label><span className={styles.srOnly}>Filter by product state</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All product states</option><option>Ready</option><option>Needs information</option><option>Conflicting information</option><option>Blocked</option></select></label><label><MagnifyingGlass size={16} /><span className={styles.srOnly}>Filter problems</span><input value={problemFilter} onChange={(event) => setProblemFilter(event.target.value)} placeholder="Filter problems" /></label></div>
          <div>{filtered.map((product) => <button key={product.id} type="button" aria-pressed={product.id === selectedId} className={product.id === selectedId ? styles.healthCardActive : undefined} onClick={() => { setSelectedId(product.id); setNotice(""); }}><span className={styles.healthThumb}><Image src={product.image} alt="" fill sizes="58px" /></span><span><strong>{product.name}</strong><small>{product.sku}</small><em>{product.problems[0] ?? "All required information is present"}</em></span><ProductScore score={product.score} compact /></button>)}</div>
        </aside>
        <article className={styles.healthDetail}>
          <header><div><span>Completeness score</span><h3>{selected.name}</h3><p>{selected.readiness}</p></div><div className={styles.scoreRing} style={{ "--score": selected.score } as CSSProperties}><strong>{selected.score}</strong><small>/100</small></div></header>
          <div className={styles.nextFix}><span>Recommended next fix</span><strong>{selected.problems[0] ?? "Keep product information current"}</strong><p>{selected.problems.length ? "Fix the highest-impact merchant field first, then score the product again." : "No product change is suggested. Recheck after the next source update."}</p></div>
          <section className={styles.lostPoints}><h4>Why points were lost</h4>{reasons.map((reason) => <div key={reason.label}><span>{reason.points ? <WarningCircle size={17} weight="fill" /> : <CheckCircle size={17} weight="fill" />}</span><strong>{reason.label}</strong><b>{reason.points ? `−${reason.points}` : "0"} points</b></div>)}</section>
          <section className={styles.checkGrid}><h4>15 required information checks</h4><div>{PRODUCT_HEALTH_CHECKS.map((check) => { const hasProblem = checkIsProblem(selected, check); return <span key={check} className={hasProblem ? styles.checkProblem : styles.checkPassed}>{hasProblem ? <WarningCircle size={14} weight="fill" /> : <Check size={14} weight="bold" />}{check}</span>; })}</div></section>
          <footer className={styles.healthActions}><button type="button" onClick={() => setNotice(`Fix preview opened for ${selected.name}. No merchant product information was changed.`)}>Open product fix<ArrowRight size={16} /></button><button type="button" className={styles.primaryButton} onClick={() => setNotice(`${selected.name} rescored in preview. The saved score and history were not changed.`)}><ArrowClockwise size={17} />Score again</button></footer>
        </article>
      </section>
      <section className={styles.qualityReports}>
        <WorkspaceHeading eyebrow="Product-quality reports" title="Fix the largest product gaps first" detail="Reports stay tied to merchant facts and can be filtered, fixed safely and exported." />
        <div><article><span>Missing charts</span><strong>84</strong><p>Products cannot answer sizing without merchant evidence.</p><button type="button" onClick={() => setNotice("Missing-chart health report previewed.")}>Open report</button></article><article><span>Missing images</span><strong>23</strong><p>Products have no usable main or variant image.</p><button type="button" onClick={() => setNotice("Missing-image report previewed.")}>Open report</button></article><article><span>Incomplete variants</span><strong>41</strong><p>Sizes, colors, prices or identifiers are incomplete.</p><button type="button" onClick={() => setNotice("Incomplete-variant report previewed.")}>Open report</button></article><article><span>Zero stock</span><strong>118</strong><p>All variants are currently unavailable.</p><button type="button" onClick={() => setNotice("Zero-stock report previewed.")}>Open report</button></article><article><span>Duplicates</span><strong>9</strong><p>Products share a barcode or merchant identifier.</p><button type="button" onClick={() => setNotice("Duplicate-product report previewed.")}>Open report</button></article><article><span>Old information</span><strong>67</strong><p>Key fields have not been rechecked in 60 days.</p><button type="button" onClick={() => setNotice("Old-information report previewed.")}>Open report</button></article></div>
        <footer><ClockCounterClockwise size={19} /><span><strong>Score and change history</strong><small>Every import, fix, score change and previous value stays attributable.</small></span><button type="button" onClick={() => setNotice("Product score-history preview opened.")}>View history</button></footer>
      </section>
    </div>
  );
}

export function ProductOperationsExperience({ activeTabId, tabs }: Props) {
  return (
    <section className={styles.productOperations}>
      <WorkflowNavigation activeTabId={activeTabId} tabs={tabs} />
      <div id="merchant-tab-panel" role="tabpanel" aria-labelledby={`${activeTabId}-tab`}>
        {activeTabId === "all-products" ? <AllProductsExperience /> : null}
        {activeTabId === "import-products" ? <ImportProductsExperience /> : null}
        {activeTabId === "size-charts" ? <SizeChartsExperience /> : null}
        {activeTabId === "product-health" ? <ProductHealthExperience /> : null}
      </div>
    </section>
  );
}
