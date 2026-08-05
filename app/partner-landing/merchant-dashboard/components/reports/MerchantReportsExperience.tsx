"use client";

import {
  ArrowClockwise,
  ArrowDown,
  ArrowUp,
  ChartLineUp,
  CheckCircle,
  DownloadSimple,
  GlobeHemisphereWest,
  Handbag,
  Package,
  Receipt,
  Ruler,
  ShoppingCart,
  TrendDown,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MerchantCountriesWorldMap } from "./MerchantCountriesWorldMap";
import styles from "./merchantReports.module.css";

type RangeKey = "7d" | "30d" | "90d";
type MetricTone = "blue" | "rose" | "mint" | "orange";

type Icon = ComponentType<{
  size?: number;
  weight?: "regular" | "fill" | "duotone" | "bold";
  "aria-hidden"?: boolean;
}>;

interface RangeData {
  catalog: number;
  catalogDelta: string;
  productViews: number;
  carts: number;
  cartDelta: string;
  orders: number;
  orderDelta: string;
  returns: number;
  returnRate: string;
  returnDelta: string;
  refunds: number;
  refundAmount: string;
  refundRate: string;
  cancellations: number;
  cancelRate: string;
  tryOns: number;
  reruns: number;
  rerunRate: string;
}

const RANGE_OPTIONS: Array<{ id: RangeKey; label: string }> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

const RANGE_DATA: Record<RangeKey, RangeData> = {
  "7d": {
    catalog: 1286,
    catalogDelta: "+0.8%",
    productViews: 4418,
    carts: 1124,
    cartDelta: "+8.1%",
    orders: 396,
    orderDelta: "+5.6%",
    returns: 23,
    returnRate: "5.8%",
    returnDelta: "-0.6 pts",
    refunds: 19,
    refundAmount: "$1,940",
    refundRate: "2.1%",
    cancellations: 11,
    cancelRate: "2.8%",
    tryOns: 1568,
    reruns: 421,
    rerunRate: "26.8%",
  },
  "30d": {
    catalog: 1286,
    catalogDelta: "+2.4%",
    productViews: 18920,
    carts: 5284,
    cartDelta: "+14.8%",
    orders: 1486,
    orderDelta: "+9.2%",
    returns: 86,
    returnRate: "5.8%",
    returnDelta: "-1.1 pts",
    refunds: 71,
    refundAmount: "$8,420",
    refundRate: "2.3%",
    cancellations: 42,
    cancelRate: "2.8%",
    tryOns: 6784,
    reruns: 1859,
    rerunRate: "27.4%",
  },
  "90d": {
    catalog: 1314,
    catalogDelta: "+5.9%",
    productViews: 56280,
    carts: 15742,
    cartDelta: "+18.2%",
    orders: 4428,
    orderDelta: "+12.6%",
    returns: 248,
    returnRate: "5.6%",
    returnDelta: "-1.5 pts",
    refunds: 206,
    refundAmount: "$24,960",
    refundRate: "2.2%",
    cancellations: 119,
    cancelRate: "2.7%",
    tryOns: 20160,
    reruns: 5443,
    rerunRate: "27.0%",
  },
};

const TREND_DATA = {
  "7d": [
    { label: "Mon", views: 522, carts: 132, orders: 42 },
    { label: "Tue", views: 608, carts: 148, orders: 51 },
    { label: "Wed", views: 574, carts: 143, orders: 48 },
    { label: "Thu", views: 712, carts: 184, orders: 66 },
    { label: "Fri", views: 756, carts: 202, orders: 72 },
    { label: "Sat", views: 694, carts: 171, orders: 61 },
    { label: "Sun", views: 552, carts: 144, orders: 56 },
  ],
  "30d": [
    { label: "Week 1", views: 3920, carts: 1024, orders: 278 },
    { label: "Week 2", views: 4370, carts: 1190, orders: 326 },
    { label: "Week 3", views: 4860, carts: 1412, orders: 402 },
    { label: "Week 4", views: 5770, carts: 1658, orders: 480 },
  ],
  "90d": [
    { label: "Jun", views: 15620, carts: 4118, orders: 1132 },
    { label: "Jul", views: 18140, carts: 5014, orders: 1426 },
    { label: "Aug", views: 22520, carts: 6610, orders: 1870 },
  ],
} satisfies Record<RangeKey, Array<Record<string, string | number>>>;

const COUNTRIES = [
  { code: "US", name: "United States", visits: 6984, share: 37 },
  { code: "GB", name: "United Kingdom", visits: 3406, share: 18 },
  { code: "CA", name: "Canada", visits: 2458, share: 13 },
  { code: "DE", name: "Germany", visits: 1892, share: 10 },
  { code: "FR", name: "France", visits: 1325, share: 7 },
];

const SIZES = [
  { label: "M", count: 1842, share: 34 },
  { label: "S", count: 1416, share: 26 },
  { label: "L", count: 1192, share: 22 },
  { label: "XL", count: 596, share: 11 },
  { label: "XS", count: 379, share: 7 },
];

const PRODUCTS = [
  {
    name: "Silk column dress",
    views: 2846,
    carts: "31.2%",
    orders: 286,
    returnRate: "4.2%",
  },
  {
    name: "Tailored wool blazer",
    views: 2391,
    carts: "28.7%",
    orders: 224,
    returnRate: "5.1%",
  },
  {
    name: "Sculpted knit midi",
    views: 1984,
    carts: "26.4%",
    orders: 178,
    returnRate: "3.8%",
  },
  {
    name: "Wide-leg trouser",
    views: 1662,
    carts: "24.9%",
    orders: 142,
    returnRate: "6.3%",
  },
];

const RETURN_REASONS = [
  { label: "Fit too small", value: 34 },
  { label: "Fit too large", value: 27 },
  { label: "Changed mind", value: 22 },
  { label: "Other", value: 17 },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function Delta({
  value,
  positive = true,
}: {
  value: string;
  positive?: boolean;
}) {
  const DeltaIcon = positive ? ArrowUp : ArrowDown;
  return (
    <span className={positive ? styles.deltaUp : styles.deltaDown}>
      <DeltaIcon size={11} weight="bold" aria-hidden />
      {value}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  delta,
  positive = true,
  icon: IconComponent,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  delta: string;
  positive?: boolean;
  icon: Icon;
  tone: MetricTone;
}) {
  return (
    <article className={styles.metricCard} data-tone={tone}>
      <div className={styles.metricIcon}>
        <IconComponent size={18} weight="duotone" aria-hidden />
      </div>
      <div className={styles.metricCopy}>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <Delta value={delta} positive={positive} />
    </article>
  );
}

function SectionTitle({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: string;
  aside?: string;
}) {
  return (
    <header className={styles.panelHeading}>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {aside ? <small>{aside}</small> : null}
    </header>
  );
}

function FunnelCard({ data }: { data: RangeData }) {
  const steps = [
    { label: "Product views", value: data.productViews, width: 100 },
    {
      label: "Added to cart",
      value: data.carts,
      width: Math.max(28, Math.round((data.carts / data.productViews) * 100)),
    },
    {
      label: "Orders",
      value: data.orders,
      width: Math.max(18, Math.round((data.orders / data.productViews) * 100)),
    },
  ];
  return (
    <section className={styles.funnelCard}>
      <SectionTitle
        eyebrow="Catalog to order"
        title="Commerce funnel"
        aside={formatNumber(data.catalog) + " active products"}
      />
      <div className={styles.funnelRows}>
        {steps.map((step, index) => (
          <div className={styles.funnelRow} key={step.label}>
            <span>{step.label}</span>
            <div className={styles.funnelTrack}>
              <div style={{ width: step.width + "%" }} data-step={index}>
                <strong>{formatNumber(step.value)}</strong>
              </div>
            </div>
            <small>
              {index === 0
                ? "100%"
                : ((step.value / data.productViews) * 100).toFixed(1) + "%"}
            </small>
          </div>
        ))}
      </div>
      <footer className={styles.funnelFooter}>
        <span>
          <ShoppingCart size={15} weight="duotone" aria-hidden />
          Cart-to-order
        </span>
        <strong>{((data.orders / data.carts) * 100).toFixed(1)}%</strong>
        <small>Assisted sessions convert 1.6× higher</small>
      </footer>
    </section>
  );
}

function RefundCard({ data }: { data: RangeData }) {
  return (
    <section className={styles.refundCard}>
      <div className={styles.refundTop}>
        <div>
          <span>Refunds</span>
          <h2>{data.refundAmount}</h2>
        </div>
        <Receipt size={28} weight="duotone" aria-hidden />
      </div>
      <div className={styles.refundStats}>
        <div>
          <strong>{formatNumber(data.refunds)}</strong>
          <span>refunded orders</span>
        </div>
        <div>
          <strong>{data.refundRate}</strong>
          <span>of paid revenue</span>
        </div>
      </div>
      <small>Refund amount from Shopify order and refund events.</small>
    </section>
  );
}

function ReturnCard({ data }: { data: RangeData }) {
  return (
    <section className={styles.returnCard}>
      <SectionTitle eyebrow="Post-purchase" title="Cancellations & returns" />
      <div className={styles.returnStats}>
        <div>
          <XCircle size={19} weight="duotone" aria-hidden />
          <span>Cancelled</span>
          <strong>{formatNumber(data.cancellations)}</strong>
          <small>{data.cancelRate} of orders</small>
        </div>
        <div>
          <ArrowClockwise size={19} weight="duotone" aria-hidden />
          <span>Returned</span>
          <strong>{formatNumber(data.returns)}</strong>
          <small>{data.returnRate} of orders</small>
        </div>
      </div>
      <div className={styles.reasonBars}>
        {RETURN_REASONS.map((reason) => (
          <div key={reason.label}>
            <span>{reason.label}</span>
            <div>
              <i style={{ width: reason.value + "%" }} />
            </div>
            <b>{reason.value}%</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function CountryCard() {
  return (
    <section className={styles.countryCard}>
      <SectionTitle
        eyebrow="Visitors"
        title="Visitor countries"
        aside="18 active markets"
      />
      <div className={styles.countryBody}>
        <MerchantCountriesWorldMap countries={COUNTRIES} />
        <aside
          className={styles.countryRanking}
          aria-label="Top visitor countries"
        >
          <div className={styles.countryLead}>
            <GlobeHemisphereWest size={34} weight="duotone" aria-hidden />
            <div>
              <strong>18,920</strong>
              <span>product visits</span>
            </div>
          </div>
          <div className={styles.countryRows}>
            {COUNTRIES.map((country) => (
              <div key={country.code}>
                <b>{country.code}</b>
                <span>{country.name}</span>
                <div>
                  <i style={{ width: country.share + "%" }} />
                </div>
                <strong>{country.share}%</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function TrendCard({ range, data }: { range: RangeKey; data: RangeData }) {
  const [series, setSeries] = useState<"views" | "carts" | "orders">("views");
  const seriesLabel =
    series === "views"
      ? "Product views"
      : series === "carts"
        ? "Cart adds"
        : "Orders";
  return (
    <section className={styles.trendCard}>
      <div className={styles.trendHeader}>
        <SectionTitle
          eyebrow="Activity"
          title="Commerce trend"
          aside={seriesLabel}
        />
        <div
          className={styles.seriesControl}
          role="group"
          aria-label="Trend series"
        >
          {(["views", "carts", "orders"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={series === item}
              onClick={() => setSeries(item)}
            >
              {item === "views"
                ? "Views"
                : item === "carts"
                  ? "Carts"
                  : "Orders"}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.trendSummary}>
        <strong>
          {formatNumber(
            series === "views"
              ? data.productViews
              : series === "carts"
                ? data.carts
                : data.orders,
          )}
        </strong>
        <Delta
          value={
            series === "views"
              ? "+11.6%"
              : series === "carts"
                ? data.cartDelta
                : data.orderDelta
          }
        />
        <span>vs previous period</span>
      </div>
      <div className={styles.chartWrap} aria-label={seriesLabel + " trend"}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={TREND_DATA[range]}>
            <CartesianGrid
              stroke="#ececf2"
              strokeDasharray="4 6"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#777986", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9698a3", fontSize: 10 }}
              width={42}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #e8e8ef",
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(29,29,50,.12)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey={series}
              stroke="#315ef5"
              strokeWidth={3}
              fill="#dfe7ff"
              fillOpacity={0.68}
              activeDot={{
                r: 5,
                fill: "#ffb7c5",
                stroke: "#1d1d32",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function RerunCard({ data }: { data: RangeData }) {
  const firstRuns = data.tryOns - data.reruns;
  return (
    <section className={styles.rerunCard}>
      <SectionTitle eyebrow="Try-on" title="Rerun rate" aside="+2.3 pts" />
      <div className={styles.rerunValue}>
        <ArrowClockwise size={30} weight="duotone" aria-hidden />
        <strong>{data.rerunRate}</strong>
        <span>of try-ons were generated again</span>
      </div>
      <div
        className={styles.rerunBar}
        aria-label={"Try-on rerun rate " + data.rerunRate}
      >
        <i style={{ width: data.rerunRate }} />
      </div>
      <div className={styles.rerunBreakdown}>
        <div>
          <span>First generations</span>
          <strong>{formatNumber(firstRuns)}</strong>
        </div>
        <div>
          <span>Reruns</span>
          <strong>{formatNumber(data.reruns)}</strong>
        </div>
      </div>
    </section>
  );
}

function SizesCard() {
  return (
    <section className={styles.sizesCard}>
      <SectionTitle
        eyebrow="Sizing"
        title="Most generated sizes"
        aside="5,425 recommendations"
      />
      <div className={styles.sizeRows}>
        {SIZES.map((size, index) => (
          <div key={size.label}>
            <b data-rank={index}>{size.label}</b>
            <div>
              <span>
                <i style={{ width: size.share + "%" }} />
              </span>
              <small>{formatNumber(size.count)}</small>
            </div>
            <strong>{size.share}%</strong>
          </div>
        ))}
      </div>
      <footer>
        <Ruler size={16} weight="duotone" aria-hidden />M is the top
        recommendation across 34% of generated sizes.
      </footer>
    </section>
  );
}

function ProductsCard() {
  return (
    <section className={styles.productsCard}>
      <SectionTitle
        eyebrow="Demand"
        title="Most viewed products"
        aside="Ranked by product views"
      />
      <div
        className={styles.productTable}
        role="table"
        aria-label="Most viewed products"
      >
        <div role="row" className={styles.productHead}>
          <span role="columnheader">Product</span>
          <span role="columnheader">Views</span>
          <span role="columnheader">Cart rate</span>
          <span role="columnheader">Orders</span>
          <span role="columnheader">Return rate</span>
        </div>
        {PRODUCTS.map((product, index) => (
          <div role="row" className={styles.productRow} key={product.name}>
            <span role="cell">
              <b>{index + 1}</b>
              <strong>{product.name}</strong>
            </span>
            <span role="cell" data-label="Views">
              {formatNumber(product.views)}
            </span>
            <span role="cell" data-label="Cart rate">
              {product.carts}
            </span>
            <span role="cell" data-label="Orders">
              {formatNumber(product.orders)}
            </span>
            <span role="cell" data-label="Return rate">
              {product.returnRate}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MerchantReportsExperience() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [exported, setExported] = useState(false);
  const data = RANGE_DATA[range];

  const reportRows = useMemo(
    () => [
      ["Metric", "Value"],
      ["Catalog products", String(data.catalog)],
      ["Product views", String(data.productViews)],
      ["Cart adds", String(data.carts)],
      ["Orders", String(data.orders)],
      ["Refunded orders", String(data.refunds)],
      ["Cancelled orders", String(data.cancellations)],
      ["Returned orders", String(data.returns)],
      ["Try-on rerun rate", data.rerunRate],
    ],
    [data],
  );

  const exportReport = () => {
    const csv = reportRows
      .map((row) =>
        row.map((cell) => '"' + cell.replaceAll('"', '""') + '"').join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "primestyleai-commerce-report-" + range + ".csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 3000);
  };

  return (
    <div className={styles.reportScene}>
      <header className={styles.reportHeader}>
        <div className={styles.reportTitle}>
          <p>Performance report</p>
          <h1>Every commerce signal, in one view.</h1>
          <span>
            Catalog, shopping, orders, refunds, cancellations, returns, visitor
            geography, and PrimeStyleAI engagement.
          </span>
        </div>
        <div className={styles.headerControls}>
          <div
            className={styles.rangeControl}
            role="group"
            aria-label="Report date range"
          >
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={range === option.id}
                onClick={() => setRange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.exportButton}
            onClick={exportReport}
          >
            {exported ? (
              <>
                <CheckCircle size={17} weight="fill" aria-hidden />
                Downloaded
              </>
            ) : (
              <>
                <DownloadSimple size={17} weight="bold" aria-hidden />
                Export CSV
              </>
            )}
          </button>
        </div>
      </header>

      <section
        className={styles.metricGrid}
        aria-label="Commerce summary metrics"
      >
        <MetricCard
          label="Catalog"
          value={formatNumber(data.catalog)}
          detail="active products"
          delta={data.catalogDelta}
          icon={Package}
          tone="blue"
        />
        <MetricCard
          label="Cart adds"
          value={formatNumber(data.carts)}
          detail="shopper cart events"
          delta={data.cartDelta}
          icon={ShoppingCart}
          tone="rose"
        />
        <MetricCard
          label="Orders"
          value={formatNumber(data.orders)}
          detail="confirmed orders"
          delta={data.orderDelta}
          icon={Handbag}
          tone="mint"
        />
        <MetricCard
          label="Return rate"
          value={data.returnRate}
          detail={formatNumber(data.returns) + " returned orders"}
          delta={data.returnDelta}
          positive={false}
          icon={TrendDown}
          tone="orange"
        />
      </section>

      <div className={styles.reportGrid}>
        <FunnelCard data={data} />
        <RefundCard data={data} />
        <ReturnCard data={data} />
        <CountryCard />
        <TrendCard range={range} data={data} />
        <RerunCard data={data} />
        <SizesCard />
        <ProductsCard />
      </div>

      <footer className={styles.reportFooter}>
        <WarningCircle size={15} weight="duotone" aria-hidden />
        <span>
          Demo values only. The report structure is grounded in the Shopify
          behavior, revenue, refund, return-impact, country, product, and sizing
          analytics already present in PrimeStyleAI. Cancellation data still
          needs a live cancellation webhook before it can be connected.
        </span>
        <ChartLineUp size={16} weight="duotone" aria-hidden />
      </footer>
    </div>
  );
}
