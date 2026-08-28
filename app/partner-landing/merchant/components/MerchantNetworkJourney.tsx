"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookmarkSimple,
  Check,
  InstagramLogo,
  MagnifyingGlass,
  MapPin,
  PaperPlaneTilt,
  Play,
  Plus,
  Quotes,
  SealCheck,
  Sparkle,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { MerchantDashboardShowcase } from "./MerchantDashboardShowcase";
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
              <span>03</span>
              <p><b>Influencer Network</b><small>Trusted discovery</small></p>
            </div>
            <div className={styles.creatorCommunity}>
              <div className={styles.creatorAvatars} aria-label="PrimeStyleAI creator community">
                <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-03-cobalt-tailoring.webp" alt="PrimeStyleAI fashion creator in cobalt tailoring" width={36} height={36} />
                <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-04-orange-editorial.webp" alt="PrimeStyleAI fashion creator in an orange editorial look" width={36} height={36} />
                <Image src="/media/partner-landing/merchant-network/influencer-showcase/creator-06-white-orange-glasses.webp" alt="PrimeStyleAI fashion creator wearing orange sunglasses" width={36} height={36} />
                <button type="button" onClick={onPrimaryAction} aria-label="Join the waitlist"><Plus size={16} weight="bold" /></button>
              </div>
              <span>Creators already moving product</span>
            </div>
          </header>

          <div className={styles.creatorShowcaseTitle}>
            <button type="button" onClick={onPrimaryAction} aria-label="Join the waitlist"><Play size={16} weight="fill" /></button>
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
              <button type="button" onClick={onPrimaryAction}>Join the waitlist <ArrowUpRight size={14} weight="bold" /></button>
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
              <div><span>03</span><small>Influencer Network</small></div>
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
                <b>Join the<br />waitlist</b>
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
                  <button type="button" aria-label="Join the waitlist" onClick={onPrimaryAction}><PaperPlaneTilt size={16} /></button>
                  <button
                    type="button"
                    aria-label={`${savedCreators.includes(creator.id) ? "Remove" : "Save"} ${creator.name}`}
                    aria-pressed={savedCreators.includes(creator.id)}
                    onClick={() => toggleSavedCreator(creator.id)}
                  >
                    <BookmarkSimple size={16} weight={savedCreators.includes(creator.id) ? "fill" : "regular"} />
                  </button>
                  <button type="button" onClick={onPrimaryAction}>Join the waitlist</button>
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
                  <button type="button" aria-label="Join the waitlist" onClick={onPrimaryAction}><PaperPlaneTilt size={16} /></button>
                  <button
                    type="button"
                    aria-label={`${savedCreators.includes(creator.id) ? "Remove" : "Save"} ${creator.name}`}
                    aria-pressed={savedCreators.includes(creator.id)}
                    onClick={() => toggleSavedCreator(creator.id)}
                  >
                    <BookmarkSimple size={16} weight={savedCreators.includes(creator.id) ? "fill" : "regular"} />
                  </button>
                  <button type="button" onClick={onPrimaryAction}>Join the waitlist</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MerchantDashboardShowcase onPrimaryAction={onPrimaryAction} />

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
            <button type="button" className={styles.pdpWaitlistCta} onClick={onPrimaryAction}>Join the waitlist <ArrowUpRight size={14} weight="bold" /></button>
          </header>

          <div className={styles.pdpFeatureHeading}>
            <div><Sparkle size={21} weight="fill" /><span>05 · Product storytelling</span></div>
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
              <button type="button" className={styles.pdpWaitlistCta} onClick={onPrimaryAction}>Join the waitlist <ArrowRight size={15} weight="bold" /></button>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
