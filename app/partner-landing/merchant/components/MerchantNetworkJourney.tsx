"use client";

import {
  Pulse,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookmarkSimple,
  ChartLineUp,
  Check,
  DeviceMobile,
  ImageSquare,
  InstagramLogo,
  MagnifyingGlass,
  MapPin,
  Package,
  PaperPlaneTilt,
  Play,
  Plus,
  Quotes,
  SealCheck,
  Sparkle,
  TiktokLogo,
  UsersThree,
  YoutubeLogo,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./merchantLanding.module.css";

type MerchantNetworkJourneyProps = {
  onPrimaryAction: () => void;
};

const creatorDirectoryProfiles = [
  {
    id: "susan",
    name: "Susan Adams",
    location: "Barcelona, ES",
    followers: "870K",
    focus: "Beauty",
    commission: "8%",
    image: "/media/partner-landing/merchant-network/creator-discovery/creator-susan.webp",
  },
  {
    id: "tamara",
    name: "Tamara Brown",
    location: "Wellington, NZ",
    followers: "440K",
    focus: "Lifestyle",
    commission: "5%",
    image: "/media/partner-landing/merchant-network/creator-discovery/creator-tamara.webp",
  },
  {
    id: "jay",
    name: "Jay Kollor",
    location: "New York, USA",
    followers: "315K",
    focus: "Fashion",
    commission: "2%",
    image: "/media/partner-landing/merchant-network/creator-discovery/creator-jay.webp",
  },
] as const;

const dashboardViews = {
  Overview: {
    title: "Network overview",
    note: "A live view of every product, creator request, and sale moving through your network.",
    metric: "+24.6%",
    metricLabel: "conversion lift",
  },
  Catalog: {
    title: "Catalog readiness",
    note: "See which products are ready for try-on, creator discovery, and richer PDP content.",
    metric: "96%",
    metricLabel: "catalog ready",
  },
  Creators: {
    title: "Creator activity",
    note: "Review requests, approve collaborations, and follow content from briefing to attributed order.",
    metric: "42",
    metricLabel: "stories live",
  },
  Performance: {
    title: "Commerce performance",
    note: "Understand commission, conversion, and product demand without separating the creator story from the sale.",
    metric: "$18.4K",
    metricLabel: "commission tracked",
  },
} as const;

const pdpOutputs = ["Background Removal", "AI Backgrounds", "Studio Photoshoot", "Batch Edits", "Retouch"] as const;

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className={styles.benefitList}>
      {items.map((item) => (
        <li key={item}><Check size={13} weight="bold" />{item}</li>
      ))}
    </ul>
  );
}

type PdpStoryVideoProps = {
  ariaLabel: string;
  mp4: string;
  poster: string;
  webm: string;
};

function PdpStoryVideo({ ariaLabel, mp4, poster, webm }: PdpStoryVideoProps) {
  return (
    <video
      className={styles.pdpStoryVideo}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-label={ariaLabel}
      onLoadedData={(event) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) event.currentTarget.pause();
      }}
    >
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}

export function MerchantNetworkJourney({ onPrimaryAction }: MerchantNetworkJourneyProps) {
  const [creatorSearch, setCreatorSearch] = useState("");
  const [creatorDirectoryTab, setCreatorDirectoryTab] = useState("Home");
  const [savedCreators, setSavedCreators] = useState<string[]>([]);
  const [dashboardView, setDashboardView] = useState<keyof typeof dashboardViews>("Overview");
  const [pdpOutput, setPdpOutput] = useState<(typeof pdpOutputs)[number]>("Background Removal");
  const normalizedCreatorSearch = creatorSearch.trim().toLowerCase();
  const visibleCreatorIds = new Set(
    creatorDirectoryProfiles
      .filter((creator) =>
        [creator.name, creator.location, creator.focus].some((value) => value.toLowerCase().includes(normalizedCreatorSearch)),
      )
      .map((creator) => creator.id),
  );

  function toggleSavedCreator(creatorId: string) {
    setSavedCreators((current) =>
      current.includes(creatorId) ? current.filter((id) => id !== creatorId) : [...current, creatorId],
    );
  }

  return (
    <>
      <section id="influencer-network" className={styles.creatorShowcase} aria-labelledby="creator-title">
        <div className={styles.creatorShowcaseFrame}>
          <header className={styles.creatorShowcaseHeader}>
            <div className={styles.creatorShowcaseIndex}>
              <span>02</span>
              <p><b>Influencer Network</b><small>Trusted discovery</small></p>
            </div>
            <div className={styles.creatorCommunity}>
              <div className={styles.creatorAvatars} aria-label="PrimeStyleAI creator community">
                <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-03-cobalt-tailoring.webp" alt="PrimeStyleAI fashion creator in cobalt tailoring" width={36} height={36} />
                <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-04-orange-editorial.webp" alt="PrimeStyleAI fashion creator in an orange editorial look" width={36} height={36} />
                <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-06-white-orange-glasses.webp" alt="PrimeStyleAI fashion creator wearing orange sunglasses" width={36} height={36} />
                <button type="button" onClick={onPrimaryAction} aria-label="Join the PrimeStyleAI creator network"><Plus size={16} weight="bold" /></button>
              </div>
              <span>Creators already moving product</span>
            </div>
          </header>

          <div className={styles.creatorShowcaseTitle}>
            <button type="button" onClick={onPrimaryAction} aria-label="Explore the influencer network"><Play size={16} weight="fill" /></button>
            <h2 id="creator-title">Turn products into<br /><span>trusted demand.</span></h2>
          </div>

          <div className={styles.creatorMosaic} aria-label="PrimeStyleAI creator content showcase">
            <div className={`${styles.creatorTile} ${styles.creatorLeftTop}`}>
              <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-01-orange-motion.webp" alt="Fashion creator in a vivid orange streetwear look" fill sizes="(max-width: 560px) 48vw, 18vw" unoptimized />
            </div>
            <div className={`${styles.creatorTile} ${styles.creatorLeftBottom}`}>
              <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-02-blue-orange-detail.webp" alt="Fashion creator in cobalt tailoring with orange accents" fill sizes="(max-width: 560px) 48vw, 18vw" unoptimized />
            </div>
            <div className={`${styles.creatorTile} ${styles.creatorTallLeft}`}>
              <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-03-cobalt-tailoring.webp" alt="Fashion creator presenting cobalt tailoring" fill sizes="(max-width: 560px) 48vw, 21vw" unoptimized />
            </div>
            <div className={`${styles.creatorTile} ${styles.creatorCenter}`}>
              <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-04-orange-editorial.webp" alt="Fashion creator in a sculptural orange editorial look" fill sizes="(max-width: 560px) 96vw, 22vw" unoptimized />
              <button type="button" onClick={onPrimaryAction}>Work with creators <ArrowUpRight size={14} weight="bold" /></button>
            </div>
            <div className={`${styles.creatorTile} ${styles.creatorTallRight}`}>
              <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-05-ice-blue-streetwear.webp" alt="Fashion creator presenting an ice-blue streetwear look" fill sizes="(max-width: 560px) 48vw, 21vw" unoptimized />
            </div>
            <div className={`${styles.creatorTile} ${styles.creatorRightTop}`}>
              <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-06-white-orange-glasses.webp" alt="Fashion creator in white wearing orange sunglasses" fill sizes="(max-width: 560px) 48vw, 18vw" unoptimized />
            </div>
            <div className={`${styles.creatorTile} ${styles.creatorRightBottom}`}>
              <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-07-blue-suit-strip.webp" alt="Fashion creator presenting a cobalt suit with an orange accent" fill sizes="(max-width: 560px) 48vw, 18vw" unoptimized />
            </div>
          </div>

          <footer className={styles.creatorShowcaseFooter}>
            <blockquote>
              <Quotes size={27} weight="fill" />
              <p>“The right creator turns a product detail into a reason to buy.”</p>
              <cite>— Maya Laurent, Fashion Creator</cite>
            </blockquote>
            <div className={styles.creatorStatement}>
              <div><span>02</span><small>Influencer Network</small></div>
              <h3>From creator story<br />to measurable sale.</h3>
              <p>Creators turn products into trusted stories, shoppable inspiration, and measurable demand.</p>
              <BenefitList items={["Match products to relevant creators", "Publish shoppable content at scale", "Track creator-driven demand"]} />
            </div>
          </footer>
        </div>
      </section>

      <section id="creator-discovery" className={styles.creatorDirectorySection} aria-labelledby="creator-directory-title">
        <div className={styles.creatorDirectoryShell}>
          <div className={styles.creatorDirectoryTop}>
            <nav className={styles.creatorDirectoryNav} aria-label="Creator discovery navigation">
              <span className={styles.creatorDirectoryMark}>
                <Image src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp" alt="" width={22} height={18} sizes="22px" />
              </span>
              {(["Home", "Search", "Requests", "Community", "Resources"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={creatorDirectoryTab === tab ? styles.creatorDirectoryNavActive : undefined}
                  onClick={() => setCreatorDirectoryTab(tab)}
                >
                  {tab}
                </button>
              ))}
              <span className={styles.creatorDirectoryLocation}><MapPin size={13} weight="fill" /> London, UK</span>
              <button type="button" className={styles.creatorDirectoryBell} aria-label="Creator network notifications"><Bell size={15} /></button>
              <span className={styles.creatorDirectoryUser}>Evelyn Munoz</span>
              <Image
                src="/media/partner-landing/merchant-network/creator-discovery/creator-susan.webp"
                alt="Evelyn Munoz"
                width={28}
                height={28}
                style={{ width: 28, height: 28 }}
              />
            </nav>

            <div className={styles.creatorDirectoryHero}>
              <div className={styles.creatorDirectoryHeadline}>
                <h2 id="creator-directory-title">
                  Find <span><MagnifyingGlass size={28} weight="bold" /></span> creators<br />
                  <span className={styles.creatorHeadlineAvatars} aria-hidden="true">
                    {creatorDirectoryProfiles.map((creator) => (
                      <Image key={creator.id} src={creator.image} alt="" width={38} height={38} />
                    ))}
                  </span>
                  to collaborate with
                </h2>
                <label className={styles.creatorDirectorySearch}>
                  <span className={styles.visuallyHidden}>Search creators</span>
                  <input
                    value={creatorSearch}
                    onChange={(event) => setCreatorSearch(event.target.value)}
                    placeholder="Search creators, cities, or specialties"
                  />
                  <MagnifyingGlass size={18} weight="bold" />
                </label>
              </div>

              <button type="button" className={styles.creatorDirectoryHow} onClick={onPrimaryAction}>
                <span><Play size={15} weight="fill" /></span>
                <b>See how<br />it&apos;s done</b>
                <ArrowUpRight size={28} weight="bold" />
              </button>
            </div>
          </div>

          <div className={styles.creatorDirectoryCards} aria-live="polite">
            {creatorDirectoryProfiles.slice(0, 2).map((creator) => (
              <article
                key={creator.id}
                className={`${styles.creatorProfileCard} ${visibleCreatorIds.has(creator.id) ? "" : styles.creatorProfileCardHidden}`}
              >
                <div className={styles.creatorProfileImage}>
                  <Image src={creator.image} alt={`${creator.name}, ${creator.focus} creator`} fill sizes="(max-width: 720px) 84vw, 19vw" unoptimized />
                </div>
                <div className={styles.creatorProfileIdentity}>
                  <span><strong>{creator.name}</strong><SealCheck size={12} weight="fill" /></span>
                  <b>{creator.followers}<small> followers</small></b>
                  <p>{creator.location}</p>
                </div>
                <div className={styles.creatorProfileMeta}>
                  <span><InstagramLogo size={14} /><YoutubeLogo size={14} /><TiktokLogo size={14} /></span>
                  <em>{creator.focus}</em>
                </div>
                <div className={styles.creatorProfileRate}><span>Commission</span><strong>{creator.commission}</strong></div>
                <div className={styles.creatorProfileActions}>
                  <button type="button" aria-label={`Request collaboration with ${creator.name}`} onClick={onPrimaryAction}><PaperPlaneTilt size={16} /></button>
                  <button
                    type="button"
                    aria-label={`${savedCreators.includes(creator.id) ? "Remove" : "Save"} ${creator.name}`}
                    aria-pressed={savedCreators.includes(creator.id)}
                    onClick={() => toggleSavedCreator(creator.id)}
                  >
                    <BookmarkSimple size={16} weight={savedCreators.includes(creator.id) ? "fill" : "regular"} />
                  </button>
                  <button type="button" onClick={onPrimaryAction}>Send request</button>
                </div>
              </article>
            ))}

            <button
              type="button"
              className={styles.creatorShowAllCard}
              onClick={() => {
                setCreatorSearch("");
                setCreatorDirectoryTab("Search");
              }}
            >
              <span><ArrowRight size={22} /></span>
              <strong>Show All</strong>
              <small>13,150 creators</small>
              <span className={styles.creatorShowAllAvatars} aria-hidden="true">
                {creatorDirectoryProfiles.map((creator) => (
                  <Image key={creator.id} src={creator.image} alt="" width={42} height={42} />
                ))}
              </span>
            </button>

            {creatorDirectoryProfiles.slice(2).map((creator) => (
              <article
                key={creator.id}
                className={`${styles.creatorProfileCard} ${visibleCreatorIds.has(creator.id) ? "" : styles.creatorProfileCardHidden}`}
              >
                <div className={styles.creatorProfileImage}>
                  <Image src={creator.image} alt={`${creator.name}, ${creator.focus} creator`} fill sizes="(max-width: 720px) 84vw, 19vw" unoptimized />
                </div>
                <div className={styles.creatorProfileIdentity}>
                  <span><strong>{creator.name}</strong><SealCheck size={12} weight="fill" /></span>
                  <b>{creator.followers}<small> followers</small></b>
                  <p>{creator.location}</p>
                </div>
                <div className={styles.creatorProfileMeta}>
                  <span><InstagramLogo size={14} /><YoutubeLogo size={14} /><TiktokLogo size={14} /></span>
                  <em>{creator.focus}</em>
                </div>
                <div className={styles.creatorProfileRate}><span>Commission</span><strong>{creator.commission}</strong></div>
                <div className={styles.creatorProfileActions}>
                  <button type="button" aria-label={`Request collaboration with ${creator.name}`} onClick={onPrimaryAction}><PaperPlaneTilt size={16} /></button>
                  <button
                    type="button"
                    aria-label={`${savedCreators.includes(creator.id) ? "Remove" : "Save"} ${creator.name}`}
                    aria-pressed={savedCreators.includes(creator.id)}
                    onClick={() => toggleSavedCreator(creator.id)}
                  >
                    <BookmarkSimple size={16} weight={savedCreators.includes(creator.id) ? "fill" : "regular"} />
                  </button>
                  <button type="button" onClick={onPrimaryAction}>Send request</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="merchant-dashboard" className={styles.dashboardFeature} aria-labelledby="dashboard-feature-title">
        <div className={styles.dashboardBackplate} aria-hidden="true" />
        <div className={styles.dashboardBackplateSecond} aria-hidden="true" />
        <div className={styles.dashboardFeatureFrame}>
          <header className={styles.featureMiniNav}>
            <span className={styles.featureBrand}>
              <Image src="/media/partner-landing/primestyleai-commerce-gateway-mark.webp" alt="" width={31} height={25} />
              <b>PrimeStyleAI</b>
            </span>
            <nav aria-label="Merchant dashboard views">
              {(Object.keys(dashboardViews) as Array<keyof typeof dashboardViews>).map((view) => (
                <button
                  key={view}
                  type="button"
                  className={dashboardView === view ? styles.featureMiniNavActive : undefined}
                  onClick={() => setDashboardView(view)}
                >
                  {view}
                </button>
              ))}
            </nav>
            <button type="button" className={styles.featureDarkButton} onClick={onPrimaryAction}>Open dashboard</button>
          </header>

          <div className={styles.dashboardFeatureIntro}>
            <p>03 · Merchant workspace</p>
            <h2 id="dashboard-feature-title">Your creator-commerce<br />command center.</h2>
            <span>{dashboardViews[dashboardView].note}</span>
          </div>

          <div className={styles.dashboardCanvas} aria-live="polite">
            <article className={styles.dashboardPulseCard}>
              <span><Pulse size={18} weight="fill" /> Live network</span>
              <strong>{dashboardViews[dashboardView].metric}</strong>
              <small>{dashboardViews[dashboardView].metricLabel}</small>
              <div className={styles.dashboardPulseBars} aria-hidden="true">
                {[34, 48, 42, 66, 58, 76, 70, 88, 82, 96].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
              </div>
            </article>

            <article className={styles.dashboardMainPanel}>
              <div className={styles.dashboardPanelHeader}>
                <span><ImageSquare size={20} weight="duotone" /></span>
                <div><small>Selected view</small><strong>{dashboardViews[dashboardView].title}</strong></div>
                <button type="button" onClick={onPrimaryAction}><ArrowUpRight size={17} weight="bold" /></button>
              </div>
              <div className={styles.dashboardTaskGrid}>
                <span><Package size={18} weight="duotone" /><b>Catalog health</b><strong>96%</strong><small>1,248 products ready</small></span>
                <span><UsersThree size={18} weight="duotone" /><b>Creator requests</b><strong>18</strong><small>5 need approval</small></span>
                <span><DeviceMobile size={18} weight="duotone" /><b>Active content</b><strong>42</strong><small>Across 8 channels</small></span>
                <span><ChartLineUp size={18} weight="duotone" /><b>Attributed orders</b><strong>1,904</strong><small>Up 16% this month</small></span>
              </div>
            </article>

            <article className={styles.dashboardRequestCard}>
              <div><Image src="/media/partner-landing/merchant-network/creator-discovery/creator-susan.webp" alt="Susan Adams" width={42} height={42} style={{ width: 42, height: 42 }} /><span><b>Susan Adams</b><small>Requested Runner 01</small></span></div>
              <p>New creator request</p>
              <button type="button" onClick={onPrimaryAction}>Review request <ArrowRight size={14} /></button>
            </article>

            <article className={styles.dashboardCommissionCard}>
              <span>Commission this month</span>
              <strong>$18,420</strong>
              <small><ChartLineUp size={14} weight="bold" /> 12.8% above last month</small>
            </article>
          </div>
        </div>
        <div className={styles.featureFooterLine}><span>Merchant dashboard</span><span>Products · creators · content · performance</span><span>PrimeStyleAI</span></div>
      </section>

      <section id="pdp-studio-feature" className={styles.pdpFeature} aria-labelledby="pdp-feature-title">
        <div className={styles.pdpFeatureFrame}>
          <header className={styles.pdpFeatureNav}>
            <span><b>PrimeStyleAI</b><small>PDP Studio</small></span>
            <nav aria-label="PDP Studio output views">
              {pdpOutputs.map((output) => (
                <button
                  key={output}
                  type="button"
                  className={pdpOutput === output ? styles.pdpOutputActive : undefined}
                  onClick={() => setPdpOutput(output)}
                >
                  {output}
                </button>
              ))}
            </nav>
            <Link href="/pdp-studio">Open Studio <ArrowUpRight size={14} weight="bold" /></Link>
          </header>

          <div className={styles.pdpFeatureHeading}>
            <div><Sparkle size={21} weight="fill" /><span>04 · Product storytelling</span></div>
            <h2 id="pdp-feature-title">Turn one product into<br />a complete selling story.</h2>
            <p>PrimeStyleAI turns your catalog images into polished product pages, lifestyle scenes, details, and commerce-ready content.</p>
          </div>

          <div className={styles.pdpStoryGrid}>
            <article className={`${styles.pdpStoryTile} ${styles.pdpStoryStudio} ${pdpOutput === "Background Removal" ? styles.pdpStoryTileActive : ""}`}>
              <PdpStoryVideo
                webm="/media/partner-landing/merchant-network/merchant-features/background-removal-demo.webm"
                mp4="/media/partner-landing/merchant-network/merchant-features/background-removal-demo.mp4"
                poster="/media/partner-landing/merchant-network/merchant-features/pdp-background-removal-v3.webp"
                ariaLabel="Background removal transforming a product image into a clean catalog cutout"
              />
              <span>Background removal</span>
            </article>
            <article className={`${styles.pdpStoryTile} ${styles.pdpStoryModel} ${pdpOutput === "AI Backgrounds" ? styles.pdpStoryTileActive : ""}`}>
              <PdpStoryVideo
                webm="/media/partner-landing/merchant-network/merchant-features/ai-backgrounds-demo.webm"
                mp4="/media/partner-landing/merchant-network/merchant-features/ai-backgrounds-demo.mp4"
                poster="/media/partner-landing/merchant-network/merchant-features/ai-backgrounds-demo-poster.webp"
                ariaLabel="One handbag transformed across several AI-generated product environments"
              />
              <span>AI backgrounds</span>
            </article>
            <article className={`${styles.pdpStoryTile} ${styles.pdpStoryDetail} ${pdpOutput === "Studio Photoshoot" ? styles.pdpStoryTileActive : ""}`}>
              <Image src="/media/partner-landing/merchant-network/merchant-features/pdp-studio-photoshoot-v3.webp" alt="Luxury studio photoshoot of gray technical sneakers on an ivory plinth" fill sizes="(max-width: 720px) 44vw, 21vw" />
              <span>Studio photoshoot</span>
            </article>
            <article className={`${styles.pdpStoryTile} ${styles.pdpStoryEditorial} ${pdpOutput === "Batch Edits" ? styles.pdpStoryTileActive : ""}`}>
              <PdpStoryVideo
                webm="/media/partner-landing/merchant-network/merchant-features/batch-edits-demo.webm"
                mp4="/media/partner-landing/merchant-network/merchant-features/batch-edits-demo.mp4"
                poster="/media/partner-landing/merchant-network/merchant-features/batch-edits-demo-poster.webp"
                ariaLabel="Multiple catalog products being processed together with batch edits"
              />
              <span>Batch edits</span>
            </article>
            <article className={`${styles.pdpStoryTile} ${styles.pdpStoryRetouch} ${pdpOutput === "Retouch" ? styles.pdpStoryTileActive : ""}`}>
              <PdpStoryVideo
                webm="/media/partner-landing/merchant-network/merchant-features/retouch-demo.webm"
                mp4="/media/partner-landing/merchant-network/merchant-features/retouch-demo.mp4"
                poster="/media/partner-landing/merchant-network/merchant-features/retouch-demo-poster.webp"
                ariaLabel="A brush retouching unwanted details from a product photo"
              />
              <span>Retouch</span>
            </article>
            <div className={styles.pdpStoryCopy}>
              <span>Selected output · {pdpOutput}</span>
              <h3>One upload.<br />Every product moment.</h3>
              <ul>
                <li><Check size={15} weight="bold" /> Clean cutouts with precise background removal</li>
                <li><Check size={15} weight="bold" /> Branded AI backgrounds and campaign scenes</li>
                <li><Check size={15} weight="bold" /> Studio photoshoots, faster batch editing, and precise retouching</li>
              </ul>
              <Link href="/pdp-studio">Build a product story <ArrowRight size={15} weight="bold" /></Link>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
