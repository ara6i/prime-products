"use client";

import {
  ArrowLeft,
  Bell,
  ChartLineUp,
  Check,
  GearSix,
  House,
  ImageSquare,
  Lifebuoy,
  LinkSimple,
  MagicWand,
  MagnifyingGlass,
  Package,
  Plus,
  Receipt,
  Storefront,
  Trash,
  VideoCamera,
  Wallet,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import styles from "./outfitStudio.module.css";

type StudioMode = "campaign" | "free";
type OutputType = "image" | "video";
type ReferenceKey = "identity" | "pose" | "mood";

type StudioProduct = {
  id: string;
  title: string;
  category: "Tops" | "Knitwear" | "Workwear";
  image: string;
  price: string;
};

const products: StudioProduct[] = [
  {
    id: "lemon-cardigan",
    title: "Lemon Cream Cardigan",
    category: "Knitwear",
    image: "/images/landing/product-cardigan-yellow.png",
    price: "$128",
  },
  {
    id: "breton-cardigan",
    title: "Breton Stripe Cardigan",
    category: "Knitwear",
    image: "/images/landing/product-cardigan-stripe.png",
    price: "$134",
  },
  {
    id: "sunset-cardigan",
    title: "Sunset Orange Cardigan",
    category: "Knitwear",
    image: "/images/landing/product-cardigan-red.png",
    price: "$128",
  },
  {
    id: "floral-top",
    title: "Floral Tie Shoulder Top",
    category: "Tops",
    image: "/images/landing/product-straps-black.png",
    price: "$156",
  },
  {
    id: "ruffle-blouse",
    title: "Ruffle Collar Blouse",
    category: "Workwear",
    image: "/images/landing/product-blouse-blue.png",
    price: "$142",
  },
];

const dashboardNavItems = [
  { label: "Overview", href: "/influencers/dashboard", icon: House },
  { label: "Campaigns", href: "/influencers/dashboard#campaigns", icon: Storefront },
  { label: "Products and links", href: "/influencers/dashboard#products", icon: Package },
  { label: "Tracked links", href: "/influencers/dashboard#links", icon: LinkSimple },
  { label: "Earnings", href: "/influencers/dashboard#earnings", icon: ChartLineUp },
  { label: "Transactions", href: "/influencers/dashboard#transactions", icon: Receipt },
  { label: "Payouts", href: "/influencers/dashboard#payouts", icon: Wallet },
];

const initialReferences: Record<ReferenceKey, string | null> = {
  identity: "/images/landing/avatar-elena.png",
  pose: "/images/pdp-studio/clothing-photoshoot/poses/european-model/back-over-shoulder.png",
  mood: "/images/pdp-studio/presets/window-light.png",
};

function ReferenceCard({
  referenceKey,
  label,
  src,
  onReplace,
  onRemove,
}: {
  referenceKey: ReferenceKey;
  label: string;
  src: string | null;
  onReplace: (key: ReferenceKey, file: File) => void;
  onRemove: (key: ReferenceKey) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <article className={styles.referenceCard}>
      <strong>{label}</strong>
      <button
        className={styles.referenceVisual}
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={`Replace ${label.toLowerCase()}`}
      >
        {src ? (
          <Image
            src={src}
            alt={`${label} reference`}
            fill
            unoptimized={src.startsWith("blob:")}
            loading={referenceKey === "identity" ? "eager" : undefined}
            sizes="(max-width: 900px) 42vw, 190px"
            className={referenceKey === "pose" ? styles.poseImage : undefined}
          />
        ) : (
          <span><Plus size={24} /> Add {label.toLowerCase()}</span>
        )}
      </button>
      <div className={styles.referenceActions}>
        <button type="button" onClick={() => inputRef.current?.click()}><MagicWand size={14} /> Replace</button>
        <button type="button" onClick={() => onRemove(referenceKey)} disabled={!src}><Trash size={14} /> Remove</button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onReplace(referenceKey, file);
          event.currentTarget.value = "";
        }}
      />
    </article>
  );
}

function ProductRow({
  product,
  index,
  selected,
  onSelect,
}: {
  product: StudioProduct;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={styles.productRow}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={styles.productImage}>
        <Image src={product.image} alt={product.title} fill sizes="112px" />
      </span>
      <span className={styles.productDetails}>
        <strong>{index + 1}. {product.title}</strong>
        <small>Maison Rue</small>
        <span className={styles.productTerms}>
          <b>{product.price}</b>
          <em>8% commission</em>
          <i>Eligible</i>
        </span>
      </span>
      <span className={`${styles.checkbox} ${selected ? styles.checkboxChecked : ""}`} aria-hidden="true">
        {selected ? <Check size={13} weight="bold" /> : null}
      </span>
    </button>
  );
}

export function OutfitStudioExperience() {
  const [mode, setMode] = useState<StudioMode>("campaign");
  const [outputType, setOutputType] = useState<OutputType>("video");
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(products[0].id);
  const [prompt, setPrompt] = useState("Warm editorial movement with a confident turn.");
  const [references, setReferences] = useState(initialReferences);
  const [extraReference, setExtraReference] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<"idle" | "generating" | "ready">("idle");
  const [noticeVisible, setNoticeVisible] = useState(false);
  const addReferenceInput = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];
  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesFilter = activeFilter === "All" || product.category === activeFilter;
      const matchesSearch = !normalizedSearch || product.title.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  const replaceReference = (key: ReferenceKey, file: File) => {
    setReferences((current) => ({ ...current, [key]: URL.createObjectURL(file) }));
    setGenerationState("idle");
  };

  const generate = () => {
    if (generationState === "generating") return;
    setGenerationState("generating");
    window.setTimeout(() => setGenerationState("ready"), 1400);
  };

  return (
    <main className={styles.stage}>
      <aside className={styles.sidebar}>
        <Link href="/influencers" className={styles.brand} aria-label="Back to PrimeStyleAI influencers">
          <Image src="/icon.svg" alt="PrimeStyleAI" width={42} height={42} priority />
        </Link>
        <nav className={styles.primaryNav} aria-label="Creator dashboard">
          {dashboardNavItems.map((item) => {
            const Icon = item.icon;
            return <Link key={item.label} href={item.href} title={item.label} aria-label={item.label}><Icon size={21} /></Link>;
          })}
          <Link className={styles.navActive} href="/influencers/dashboard/outfit-studio" title="Outfit Studio" aria-label="Outfit Studio" aria-current="page">
            <MagicWand size={21} weight="fill" />
          </Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <Link href="/influencers/dashboard#support" title="Support and claims" aria-label="Support and claims"><Lifebuoy size={21} /></Link>
          <Link href="/influencers/dashboard#profile" title="Profile and compliance" aria-label="Profile and compliance"><GearSix size={21} /></Link>
          <Link href="/influencers/dashboard#profile" className={styles.miniAvatar} title="Creator profile" aria-label="Creator profile">
            <Image src="/images/landing/avatar-elena.png" alt="" width={36} height={36} />
          </Link>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.workspaceHeader}>
          <Link href="/influencers" aria-label="Back to influencer page"><ArrowLeft size={19} /></Link>
          <span>Creator workspace · Outfit studio</span>
          <button type="button" aria-label="Notifications" onClick={() => setNoticeVisible((current) => !current)}><Bell size={20} /><i /></button>
          {noticeVisible ? <div className={styles.notification} role="status">You&apos;re all caught up.</div> : null}
        </header>

        <div className={styles.studio}>
          <section className={styles.intro}>
            <div className={styles.introTitle}>
              <p>Outfit Studio</p>
              <h1>Direct every detail.</h1>
            </div>
            <div className={styles.modeSwitch} aria-label="Creation mode">
              <button type="button" className={mode === "campaign" ? styles.segmentActive : undefined} aria-pressed={mode === "campaign"} onClick={() => { setMode("campaign"); setGenerationState("idle"); }}>Campaign mode</button>
              <button type="button" className={mode === "free" ? styles.segmentActive : undefined} aria-pressed={mode === "free"} onClick={() => { setMode("free"); setGenerationState("idle"); }}>Free mode</button>
            </div>
            <time dateTime="2026-08-02">August 2, 2026</time>
            <div className={styles.campaignStrip}>
              {mode === "campaign" ? (
                <><strong>Summer style edit</strong><span>Maison Rue</span><span>8% commission</span><span>148 approved products</span></>
              ) : (
                <><strong>Free creation</strong><span>Use any product</span><span>Add your references</span><span>Image or video</span></>
              )}
            </div>
          </section>

          <section className={styles.studioGrid}>
            <section className={styles.referenceRoom}>
              <h2>Reference room</h2>
              <div className={styles.referenceGrid}>
                <ReferenceCard referenceKey="identity" label="Identity" src={references.identity} onReplace={replaceReference} onRemove={(key) => { setReferences((current) => ({ ...current, [key]: null })); setGenerationState("idle"); }} />
                <ReferenceCard referenceKey="pose" label="Pose" src={references.pose} onReplace={replaceReference} onRemove={(key) => { setReferences((current) => ({ ...current, [key]: null })); setGenerationState("idle"); }} />
                <ReferenceCard referenceKey="mood" label="Mood and light" src={references.mood} onReplace={replaceReference} onRemove={(key) => { setReferences((current) => ({ ...current, [key]: null })); setGenerationState("idle"); }} />
                <article className={styles.addReference}>
                  {extraReference ? <Image src={extraReference} alt="Additional reference" fill unoptimized sizes="190px" /> : <button type="button" onClick={() => addReferenceInput.current?.click()}><Plus size={25} /><span>Add reference</span></button>}
                  {extraReference ? <button type="button" className={styles.removeExtra} onClick={() => setExtraReference(null)}><Trash size={14} /> Remove</button> : null}
                  <input ref={addReferenceInput} type="file" accept="image/*" hidden onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setExtraReference(URL.createObjectURL(file));
                    event.currentTarget.value = "";
                  }} />
                </article>
              </div>
              <label className={styles.promptField}>
                <span>Prompt</span>
                <textarea value={prompt} onChange={(event) => { setPrompt(event.target.value); setGenerationState("idle"); }} aria-label="Generation prompt" />
              </label>
            </section>

            <section className={styles.wardrobe}>
              <h2>Campaign wardrobe</h2>
              <div className={styles.wardrobeToolbar}>
                <div className={styles.filters}>
                  {["All", "Tops", "Knitwear", "Workwear"].map((filter) => (
                    <button key={filter} type="button" className={activeFilter === filter ? styles.filterActive : undefined} aria-pressed={activeFilter === filter} onClick={() => setActiveFilter(filter)}>{filter}</button>
                  ))}
                </div>
                <label className={styles.search}><MagnifyingGlass size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label>
              </div>
              <div className={styles.productList}>
                {visibleProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    index={products.indexOf(product)}
                    selected={selectedProductId === product.id}
                    onSelect={() => { setSelectedProductId(product.id); setGenerationState("idle"); }}
                  />
                ))}
                {visibleProducts.length === 0 ? <div className={styles.emptyProducts}><Package size={25} /><span>No campaign products match.</span></div> : null}
              </div>
            </section>

            <section className={styles.previewPanel}>
              <div className={styles.previewHeading}>
                <h2>Try-on preview</h2>
                <div className={styles.outputSwitch}>
                  <button type="button" className={outputType === "image" ? styles.outputActive : undefined} onClick={() => { setOutputType("image"); setGenerationState("idle"); }}><ImageSquare size={15} /> Image</button>
                  <button type="button" className={outputType === "video" ? styles.outputActive : undefined} onClick={() => { setOutputType("video"); setGenerationState("idle"); }}><VideoCamera size={15} /> Video</button>
                </div>
              </div>
              <div className={styles.previewImage}>
                <Image src="/media/influencer-dashboard/outfit-studio/try-on-preview-hq-final.png" alt="Elena wearing the selected campaign outfit" fill priority sizes="(max-width: 900px) 100vw, 380px" />
                {generationState === "generating" ? <span className={styles.generating}>Creating {outputType}…</span> : null}
                {generationState === "ready" ? <span className={styles.readyBadge}><Check size={14} weight="bold" /> {outputType === "video" ? "Video" : "Image"} ready</span> : null}
              </div>
              <div className={styles.selectedHeading}><strong>Selected items</strong><span>3 pieces</span></div>
              <div className={styles.selectedItems}>
                <span><Image src={selectedProduct.image} alt={selectedProduct.title} fill sizes="120px" /></span>
                <span><Image src="/media/influencer-dashboard/outfit-studio/cream-trousers-hq.png" alt="Cream wide-leg trousers" fill sizes="120px" /></span>
                <span><Image src="/media/influencer-dashboard/outfit-studio/beige-slingbacks-hq.png" alt="Neutral slingback shoes" fill sizes="120px" /></span>
              </div>
              <div className={styles.outputControls}>
                <select aria-label="Aspect ratio" defaultValue="9:16"><option>9:16</option><option>4:5</option><option>1:1</option></select>
                <select aria-label="Duration" defaultValue="8 sec" disabled={outputType === "image"}><option>5 sec</option><option>8 sec</option><option>12 sec</option></select>
              </div>
              <button className={styles.generateButton} type="button" onClick={generate} disabled={!prompt.trim() || generationState === "generating"}>
                {generationState === "generating" ? "Generating…" : generationState === "ready" ? `Generate another ${outputType}` : `Generate ${outputType}`}
              </button>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
