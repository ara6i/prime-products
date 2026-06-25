"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ArrowUpRight, Camera, Ruler, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/app/shared/lib/utils";
import type { DemoProductCard } from "../types";
import {
  DEMO_PRODUCT_GROUPS,
  formatDemoFitType,
  groupDemoProducts,
  type DemoProductGroupId,
} from "../utils/demoProductGroups";

interface DemoProductShowcaseProps {
  products: DemoProductCard[];
}

export function DemoProductShowcase({ products }: DemoProductShowcaseProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const groupedProducts = useMemo(() => groupDemoProducts(products), [products]);
  const categoryAnchorRef = useRef<HTMLDivElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<DemoProductGroupId>("women");
  const [categoryDocked, setCategoryDocked] = useState(false);
  const [introProgress, setIntroProgress] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [transitionProduct, setTransitionProduct] = useState<DemoProductCard | null>(null);
  const [viewCursorVisible, setViewCursorVisible] = useState(false);
  const hoverX = useMotionValue(-420);
  const hoverY = useMotionValue(-420);
  const hoverCursorX = useSpring(hoverX, { stiffness: 420, damping: 34, mass: 0.7 });
  const hoverCursorY = useSpring(hoverY, { stiffness: 420, damping: 34, mass: 0.7 });

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 920;

    const tick = (now: number) => {
      const elapsed = Math.min(now - start, duration);
      const progress = Math.round((elapsed / duration) * 100);
      setIntroProgress(progress);

      if (elapsed < duration) {
        frame = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => setIntroComplete(true), 140);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion]);

  useEffect(() => {
    let frame = 0;

    const updateCategoryDock = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const anchor = categoryAnchorRef.current;
        if (!anchor) {
          setCategoryDocked(false);
          return;
        }

        const topOffset = window.matchMedia("(min-width: 1024px)").matches ? 0 : 64;
        const activationBuffer = window.matchMedia("(min-width: 1024px)").matches ? 12 : 18;
        const shouldDock = anchor.getBoundingClientRect().top <= topOffset + activationBuffer;
        setCategoryDocked((current) => (current === shouldDock ? current : shouldDock));
      });
    };

    updateCategoryDock();
    window.addEventListener("scroll", updateCategoryDock, { passive: true });
    window.addEventListener("resize", updateCategoryDock);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateCategoryDock);
      window.removeEventListener("resize", updateCategoryDock);
    };
  }, []);

  const fallbackGroup = DEMO_PRODUCT_GROUPS.find((group) => groupedProducts[group.id].length > 0)?.id ?? "women";
  const activeGroup = groupedProducts[selectedGroup].length > 0 ? selectedGroup : fallbackGroup;
  const activeConfig = DEMO_PRODUCT_GROUPS.find((group) => group.id === activeGroup) ?? DEMO_PRODUCT_GROUPS[0];
  const activeProducts = groupedProducts[activeGroup];
  const featuredProduct = activeProducts[0] ?? products[0];
  const heroSupportingProducts = activeProducts.slice(1, 4);

  function openProduct(event: MouseEvent<HTMLAnchorElement>, product: DemoProductCard) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    setTransitionProduct(product);
    window.setTimeout(() => {
      router.push(`/demo/products/${product.id}`);
    }, reduceMotion ? 0 : 560);
  }

  function moveHoverPreview(event: MouseEvent<HTMLElement>) {
    if (reduceMotion) return;
    hoverX.set(event.clientX - 48);
    hoverY.set(event.clientY - 48);
  }

  return (
    <main className="min-h-screen bg-white text-[#101828]">
      <IntroOverlay progress={reduceMotion ? 100 : introProgress} complete={introComplete || !!reduceMotion} />
      <ProductRouteTransition product={transitionProduct} />
      <ViewMoreCursor visible={viewCursorVisible && !reduceMotion} x={hoverCursorX} y={hoverCursorY} />
      {categoryDocked ? (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-[#d9e6ff] bg-white/92 px-5 py-3 shadow-[0_14px_34px_rgba(33,84,239,0.08)] backdrop-blur-xl md:px-8 lg:top-0 lg:px-10">
          <div className="mx-auto max-w-[1440px]">
            <CategoryTabs
              activeGroup={activeGroup}
              groupedProducts={groupedProducts}
              onChange={setSelectedGroup}
            />
          </div>
        </div>
      ) : null}

      <section className="relative min-h-[calc(100svh-72px)] bg-white text-[#101828]">
        <div className="absolute inset-x-0 top-0 h-px bg-[#2154EF]/20" />
        <EditorialTicker reduceMotion={!!reduceMotion} />

        <div className="mx-auto grid min-h-[calc(100svh-72px)] w-full max-w-[1440px] grid-cols-1 gap-8 px-5 pb-10 pt-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.62fr)] lg:items-end lg:px-10 lg:pb-12">
          <div className="relative z-10 flex min-h-[58svh] flex-col justify-center gap-8 lg:min-h-[68vh]">
            <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-[#2154EF]/65 lg:absolute lg:left-0 lg:right-0 lg:top-0">
              <span>PrimeStyleAI demo</span>
              <span>{String(products.length).padStart(3, "0")} products</span>
            </div>

            <div className="flex -translate-y-4 flex-col justify-center gap-8 pt-8 lg:-translate-y-16 lg:pt-24">
              <div>
                <motion.p
                  key={`${activeGroup}-kicker`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-5 text-xs uppercase tracking-[0.2em] text-[#2154EF]"
                >
                  {activeConfig.kicker}
                </motion.p>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeGroup}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, clipPath: "inset(0 0 22% 0)" }}
                    animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, clipPath: "inset(18% 0 0 0)" }}
                    transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <h1 className="max-w-[980px] text-5xl font-semibold leading-[0.95] tracking-normal md:text-7xl lg:text-8xl">
                      {activeConfig.title}
                    </h1>
                    <p className="mt-6 max-w-[620px] text-base leading-7 text-[#475467] md:text-lg">
                      {activeConfig.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div
                ref={categoryAnchorRef}
              >
                {categoryDocked ? (
                  <div aria-hidden className="h-[34px] md:h-[46px]" />
                ) : (
                  <CategoryTabs
                    activeGroup={activeGroup}
                    groupedProducts={groupedProducts}
                    onChange={setSelectedGroup}
                  />
                )}
              </div>
            </div>
          </div>

          <HeroProductPanel
            product={featuredProduct}
            supportingProducts={heroSupportingProducts}
            onOpenProduct={openProduct}
          />
        </div>
      </section>

      <section className="relative bg-[#f5f8ff] px-5 py-8 md:px-8 lg:px-10 lg:py-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-8 flex flex-col gap-4 border-b border-[#2154EF]/15 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#2154EF]/70">Selected rack</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">{activeConfig.label}</h2>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#475467]">
              <span>{activeProducts.length} pieces</span>
              <span className="h-1 w-1 bg-[#2154EF]/40" />
              <span>Category accurate</span>
            </div>
          </div>

          {activeProducts.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeGroup}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
                transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 gap-5 md:grid-cols-12"
              >
                {activeProducts.map((product, index) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    index={index}
                    reduceMotion={!!reduceMotion}
                    onOpenProduct={openProduct}
                    onHoverStart={(event) => {
                      setViewCursorVisible(true);
                      moveHoverPreview(event);
                    }}
                    onHoverMove={moveHoverPreview}
                    onHoverEnd={() => setViewCursorVisible(false)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>
    </main>
  );
}

function CategoryTabs({
  activeGroup,
  groupedProducts,
  onChange,
}: {
  activeGroup: DemoProductGroupId;
  groupedProducts: Record<DemoProductGroupId, DemoProductCard[]>;
  onChange: (group: DemoProductGroupId) => void;
}) {
  return (
    <div className="relative -mx-5 px-5 md:mx-0 md:px-0">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent md:hidden" />
      <div className="flex snap-x gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-2 md:overflow-visible md:border md:border-[#d9e6ff] md:bg-[#f4f7ff] md:p-1">
        {DEMO_PRODUCT_GROUPS.map((group) => {
          const active = activeGroup === group.id;
          const count = groupedProducts[group.id].length;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onChange(group.id)}
              disabled={count === 0}
              aria-pressed={active}
              aria-label={`${group.label} category, ${count} products`}
              className={cn(
                "relative min-w-[120px] snap-start overflow-hidden rounded-full border px-4 py-2.5 text-left transition-all duration-300 md:min-w-0 md:rounded-none md:border-0 md:px-4 md:py-4 md:transition-colors",
                active
                  ? "border-[#2154EF] text-white shadow-[0_14px_32px_rgba(33,84,239,0.22)] md:shadow-none"
                  : "border-[#d9e6ff] bg-white/95 text-[#1b2b52] shadow-[0_8px_22px_rgba(33,84,239,0.07)] hover:border-[#2154EF]/40 md:bg-transparent md:shadow-none md:hover:bg-white",
                count === 0 && "cursor-not-allowed opacity-35",
              )}
            >
              {active && (
                <motion.span
                  layoutId="demo-active-category"
                  className="absolute inset-0 rounded-full bg-[#2154EF] md:rounded-none"
                  transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2 md:justify-between md:gap-4">
                <span className="h-1.5 w-1.5 rounded-full bg-current/70 md:hidden" />
                <span className="text-[12px] font-semibold leading-none md:text-sm">{group.label}</span>
                <span
                  className={cn(
                    "hidden rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none sm:inline md:bg-transparent md:p-0 md:text-xs md:text-current",
                    active ? "bg-white/20 text-white" : "bg-[#eef4ff] text-[#2154EF]",
                  )}
                >
                  {String(count).padStart(2, "0")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeroProductPanel({
  product,
  supportingProducts,
  onOpenProduct,
}: {
  product?: DemoProductCard;
  supportingProducts: DemoProductCard[];
  onOpenProduct: (event: MouseEvent<HTMLAnchorElement>, product: DemoProductCard) => void;
}) {
  if (!product) {
    return <div className="hidden lg:block" />;
  }

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 34, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10"
    >
      <Link
        href={`/demo/products/${product.id}`}
        onClick={(event) => onOpenProduct(event, product)}
        className="group block"
      >
        <div className="relative aspect-[4/5] overflow-hidden border border-[#d9e6ff] bg-[#f4f7ff]">
          <ProductImage product={product} className="transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f5e]/75 via-[#2154EF]/10 to-transparent" />
          <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/80">
            <span>Featured</span>
            <span>{formatDemoFitType(product.fitType)}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{product.category}</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <h3 className="max-w-[72%] text-2xl font-semibold leading-tight tracking-normal text-white md:text-3xl">
                {product.name}
              </h3>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/25 bg-white text-[#2154EF] transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </Link>

      {supportingProducts.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {supportingProducts.map((item) => (
            <Link
              key={item.id}
              href={`/demo/products/${item.id}`}
              onClick={(event) => onOpenProduct(event, item)}
              className="group block"
            >
              <div className="relative aspect-square overflow-hidden border border-[#d9e6ff] bg-white">
                <ProductImage product={item} useOriginal className="object-contain p-3 transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[#2154EF]/0 transition-colors duration-300 group-hover:bg-[#2154EF]/8" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ProductTile({
  product,
  index,
  reduceMotion,
  onOpenProduct,
  onHoverStart,
  onHoverMove,
  onHoverEnd,
}: {
  product: DemoProductCard;
  index: number;
  reduceMotion: boolean;
  onOpenProduct: (event: MouseEvent<HTMLAnchorElement>, product: DemoProductCard) => void;
  onHoverStart: (event: MouseEvent<HTMLElement>) => void;
  onHoverMove: (event: MouseEvent<HTMLElement>) => void;
  onHoverEnd: () => void;
}) {
  const featured = index === 0;

  return (
    <motion.article
      custom={index}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 44, scale: 0.97, clipPath: "inset(18% 0 0 0)" }}
      animate={{ opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0 0 0)" }}
      transition={{ delay: reduceMotion ? 0 : index * 0.045, duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group md:col-span-4",
        featured && "md:col-span-6",
        index === 1 && "md:col-span-3",
        index === 2 && "md:col-span-3",
      )}
    >
      <Link
        href={`/demo/products/${product.id}`}
        onClick={(event) => onOpenProduct(event, product)}
        onMouseEnter={onHoverStart}
        onMouseMove={onHoverMove}
        onMouseLeave={onHoverEnd}
        className="block cursor-none"
      >
        <div className="relative overflow-hidden border border-[#d9e6ff] bg-white transition-all duration-500 group-hover:-translate-y-1 group-hover:border-[#2154EF]/45 group-hover:shadow-[0_22px_70px_rgba(33,84,239,0.16)]">
          <div className={cn("relative overflow-hidden", featured ? "aspect-[5/4] md:aspect-[4/3]" : "aspect-[4/5]")}>
            <ProductImageSlider product={product} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f5e]/70 via-[#2154EF]/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[#2154EF] transition-transform duration-500 group-hover:scale-x-100" />
            <div className="absolute bottom-4 left-4 right-4 flex translate-y-5 items-center justify-between gap-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
              <span className="text-sm font-semibold text-white">View more</span>
              <span className="flex h-10 w-10 items-center justify-center bg-white text-[#2154EF]">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#2154EF]/15 py-4 transition-colors duration-300 group-hover:border-[#2154EF]/45">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-[#2154EF]/60">{product.category}</p>
            <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight tracking-normal text-[#101828] transition-transform duration-300 group-hover:translate-x-2 group-hover:text-[#2154EF] md:text-xl">
              {product.name}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#475467]">
              <span className="border border-[#d9e6ff] bg-white px-2 py-1">{formatDemoFitType(product.fitType)}</span>
              {product.subcategory && <span className="border border-[#d9e6ff] bg-white px-2 py-1">{product.subcategory}</span>}
            </div>
          </div>
          <div className="text-right text-sm font-semibold text-[#101828]">
            {product.price !== null ? formatProductPrice(product.price, product.currency) : "Demo"}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function ViewMoreCursor({
  visible,
  x,
  y,
}: {
  visible: boolean;
  x: ReturnType<typeof useSpring>;
  y: ReturnType<typeof useSpring>;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.65 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{ x, y }}
          className="pointer-events-none fixed left-0 top-0 z-[80] hidden h-24 w-24 items-center justify-center rounded-full border border-[#2154EF] bg-[#2154EF] text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_50px_rgba(33,84,239,0.32)] lg:flex"
        >
          View more
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProductImageSlider({ product }: { product: DemoProductCard }) {
  const [baseSrc, setBaseSrc] = useState<string>(product.generatedCover || product.image);
  const hoverSrc = product.hoverImage || product.image;
  const hasHoverImage = !!hoverSrc && hoverSrc !== baseSrc;
  const [generating, setGenerating] = useState(!product.coverChecked && !!product.image);

  useEffect(() => {
    if (product.coverChecked || !product.image) return;

    let cancelled = false;

    fetch("/api/demo/cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.coverUrl) setBaseSrc(data.coverUrl);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product.coverChecked, product.id, product.image]);

  if (!baseSrc) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#eef4ff] text-sm uppercase tracking-[0.16em] text-[#2154EF]/45">
        No image
      </div>
    );
  }

  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={baseSrc}
          alt={product.name}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-transform delay-0 duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:delay-[260ms] group-hover:scale-[1.04]",
            hasHoverImage && "group-hover:-translate-x-full",
          )}
          loading="lazy"
        />
        {hasHoverImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hoverSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full translate-x-full object-cover transition-transform delay-0 duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:delay-[260ms] group-hover:translate-x-0 group-hover:scale-[1.04]"
              loading="lazy"
            />
          </>
        )}
      </div>
      {generating && <div className="absolute inset-0 animate-pulse bg-white/20" />}
    </>
  );
}

function ProductImage({ product, className, useOriginal = false }: { product: DemoProductCard; className?: string; useOriginal?: boolean }) {
  const initialSrc = useOriginal ? product.image : product.generatedCover || product.image;
  const [coverSrc, setCoverSrc] = useState<string>(initialSrc);
  const [generating, setGenerating] = useState(!useOriginal && !product.coverChecked && !!product.image);

  useEffect(() => {
    if (useOriginal) return;
    if (product.coverChecked || !product.image) return;

    let cancelled = false;

    fetch("/api/demo/cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.coverUrl) setCoverSrc(data.coverUrl);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product.coverChecked, product.id, product.image, useOriginal]);

  if (!coverSrc) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#eef4ff] text-sm uppercase tracking-[0.16em] text-[#2154EF]/45">
        No image
      </div>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverSrc}
        alt={product.name}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
        loading="lazy"
      />
      {generating && <div className="absolute inset-0 animate-pulse bg-white/20" />}
    </>
  );
}

function EditorialTicker({ reduceMotion }: { reduceMotion: boolean }) {
  const ticker = "AI sizing / virtual try-on / men / women / accessories / uniform / ";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden border-y border-[#2154EF]/10 py-3 text-xs uppercase tracking-[0.22em] text-[#2154EF]/35">
      <motion.div
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 52, ease: "linear", repeat: Infinity }}
        className="flex w-max gap-10 whitespace-nowrap"
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index}>{ticker}</span>
        ))}
      </motion.div>
    </div>
  );
}

function IntroOverlay({ progress, complete }: { progress: number; complete: boolean }) {
  return (
    <AnimatePresence>
      {!complete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: "-100%" }}
          transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex flex-col justify-between bg-white p-5 text-[#101828] md:p-8"
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#2154EF]/60">
            <span>PrimeStyleAI</span>
            <span>Live demo</span>
          </div>
          <div>
            <div className="mb-4 h-px w-full bg-[#d9e6ff]">
              <motion.div className="h-px bg-[#2154EF]" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-end justify-between gap-6">
              <p className="max-w-[520px] text-xl font-medium leading-tight md:text-3xl">
                Preparing the fitting room.
              </p>
              <span className="font-mono text-5xl leading-none md:text-7xl">{String(progress).padStart(3, "0")}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProductRouteTransition({ product }: { product: DemoProductCard | null }) {
  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.56, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[90] flex items-end bg-white p-5 text-[#101828] md:p-8"
        >
          <div className="w-full">
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#2154EF]">Opening product</p>
            <div className="flex flex-col gap-4 border-t border-[#2154EF]/15 pt-5 md:flex-row md:items-end md:justify-between">
              <h2 className="max-w-[780px] text-4xl font-semibold leading-none tracking-normal md:text-7xl">{product.name}</h2>
              <div className="flex items-center gap-3 text-sm text-[#475467]">
                <Camera className="h-4 w-4" />
                <span>Try-on</span>
                <Ruler className="h-4 w-4" />
                <span>Size match</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EmptyState() {
  return (
    <div className="border border-[#d9e6ff] bg-white px-5 py-16 text-center">
      <Sparkles className="mx-auto mb-4 h-8 w-8 text-[#2154EF]/45" />
      <h3 className="text-xl font-semibold tracking-normal text-[#101828]">No demo products yet</h3>
      <p className="mx-auto mt-2 max-w-[420px] text-sm leading-6 text-[#475467]">
        Sync the demo catalog before testing the category experience.
      </p>
    </div>
  );
}

function formatProductPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}
