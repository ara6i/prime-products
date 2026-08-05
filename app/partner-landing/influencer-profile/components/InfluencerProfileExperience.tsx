"use client";

import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Check,
  MagnifyingGlass,
  MapPin,
  Play,
  SealCheck,
  ShareNetwork,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { postFilters, profileSections } from "../data/influencerProfileData";
import { useInfluencerProfile } from "../hooks/useInfluencerProfile";
import type { CreatorPost, CreatorProduct } from "../types";
import styles from "./influencerProfile.module.css";

function ProductStory({
  product,
  onShop,
}: {
  product: CreatorProduct;
  onShop: (name: string) => void;
}) {
  return (
    <article className={styles.productStory}>
      <span className={styles.sequence}>{product.sequence}</span>
      <div className={styles.productImage}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 760px) 44vw, 13vw"
          loading="eager"
          unoptimized
        />
      </div>
      <div className={styles.productMeta}>
        <h3>{product.name}</h3>
        <p>{product.merchant}</p>
        <strong>{product.price}</strong>
        <small>Sponsored&nbsp; · &nbsp;PrimeStyleAI may earn commission</small>
        <button type="button" onClick={() => onShop(product.name)}>
          Shop item <ArrowRight aria-hidden="true" weight="bold" />
        </button>
      </div>
    </article>
  );
}

function RecentPost({ post, onPlay }: { post: CreatorPost; onPlay: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => undefined);
          return;
        }

        video.pause();
      },
      { threshold: 0.35 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [post.videoSource]);

  function handlePostClick() {
    const video = videoRef.current;
    if (!video) {
      onPlay();
      return;
    }

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  }

  return (
    <button
      type="button"
      className={styles.recentPost}
      onClick={handlePostClick}
      aria-label={post.videoSource ? `Pause or play ${post.title} inline` : `Open ${post.title}`}
    >
      <span className={styles.recentImage}>
        {post.videoSource ? (
          <video
            ref={videoRef}
            src={post.videoSource}
            poster={post.image}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
        ) : (
          <Image
            src={post.image}
            alt=""
            fill
            sizes="(max-width: 760px) 46vw, 18vw"
            style={{ objectPosition: post.objectPosition }}
            loading="eager"
            unoptimized
          />
        )}
        {post.videoSource ? (
          <span className={styles.videoPill}>
            <Play aria-hidden="true" weight="fill" /> Film
          </span>
        ) : null}
        <span className={styles.duration}>{post.duration}</span>
      </span>
      <span className={styles.recentCopy}>
        <strong>{post.title}</strong>
        <small>{post.published}</small>
        <span>
          <Play aria-hidden="true" weight="fill" /> {post.views}
        </span>
      </span>
    </button>
  );
}

export function InfluencerProfileExperience() {
  const profile = useInfluencerProfile();
  const { data } = profile;

  return (
    <div className={styles.page}>
      <header className={styles.publicHeader}>
        <Link href="/" className={styles.wordmark} aria-label="PrimeStyleAI home">
          PrimeStyle<span>AI</span>
        </Link>
        <nav className={styles.publicNav} aria-label="Public navigation">
          <Link href="/">Discover</Link>
          <Link href="/influencers">Creators</Link>
        </nav>
        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <MagnifyingGlass aria-hidden="true" />
            <input
              value={profile.searchQuery}
              onChange={(event) => profile.setSearchQuery(event.target.value)}
              placeholder="Search creators, looks, items..."
              aria-label="Search Maya's profile"
            />
            {profile.searchQuery ? (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => profile.setSearchQuery("")}
                aria-label="Clear search"
              >
                <X aria-hidden="true" />
              </button>
            ) : null}
            {profile.searchQuery ? (
              <div className={styles.searchResults}>
                {profile.searchResults.length ? (
                  profile.searchResults.map((result) => (
                    <button
                      type="button"
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        profile.setSearchQuery("");
                        profile.showNotice(`${result.type}: ${result.label}`);
                      }}
                    >
                      <span>{result.type}</span>
                      {result.label}
                    </button>
                  ))
                ) : (
                  <p>No matching films or looks</p>
                )}
              </div>
            ) : null}
          </div>
          <Link href="/influencers" className={styles.joinButton}>
            Join PrimeStyleAI
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="creator-name">
          <div className={styles.heroMedia}>
            <Image
              src={data.heroImage}
              alt={`${data.name}, fashion creator`}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 760px) 100vw, 52vw"
              unoptimized
            />
            <span className={styles.latestStory}>Paris cover&nbsp; · &nbsp;August</span>
          </div>

          <div className={styles.profilePanel}>
            <div className={styles.profileIdentity}>
              <Image
                src={data.portrait}
                alt=""
                width={52}
                height={52}
                className={styles.avatar}
                loading="eager"
                unoptimized
              />
              <h1 id="creator-name">
                {data.name} <SealCheck aria-label="Verified creator" weight="fill" />
              </h1>
              <div className={styles.profileMeta}>
                <span>{data.handle}</span>
                <span>
                  <MapPin aria-hidden="true" weight="fill" /> {data.location}
                </span>
              </div>
              <p className={styles.bio}>
                {data.bio.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
              <div className={styles.profileActions}>
                <div className={styles.followers}>
                  <strong>{data.followers}</strong>
                  <span>FOLLOWERS</span>
                </div>
                <button
                  type="button"
                  className={profile.following ? styles.followingButton : styles.followButton}
                  onClick={() => profile.setFollowing(!profile.following)}
                >
                  {profile.following ? (
                    <>
                      <Check aria-hidden="true" weight="bold" /> Following
                    </>
                  ) : (
                    "Follow"
                  )}
                </button>
                <button type="button" className={styles.shareButton} onClick={profile.shareProfile}>
                  <ShareNetwork aria-hidden="true" /> Share
                </button>
              </div>
            </div>

            <aside className={styles.signature} aria-label="Maya's profile edition">
              <span>PARIS</span>
              <small>LIVING<br />SHOPPABLE<br />LOOKBOOK</small>
              <strong>M</strong>
              <div>
                <b>{data.monthlyStories}</b>
                <small>NEW STORIES<br />THIS MONTH</small>
              </div>
            </aside>
          </div>

          <nav className={styles.profileTabs} aria-label="Profile sections">
            {profileSections.map((section) => (
              <button
                type="button"
                key={section.id}
                className={profile.activeSection === section.id ? styles.activeTab : undefined}
                onClick={() => profile.setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </section>

        {profile.activeSection === "posts" ? (
          <>
            <section className={styles.lookbook} aria-labelledby="lookbook-title">
              <div className={styles.lookbookIntro}>
                <span>FEATURED LOOKBOOK</span>
                <h2 id="lookbook-title">The<br />August Edit</h2>
                <p>Late-summer dressing with a fresh perspective. Easy layers, natural fabrics, and colors that move with you.</p>
                <button type="button" onClick={() => profile.showNotice("The full look is ready to shop")}>Shop the full look <ArrowRight aria-hidden="true" weight="bold" /></button>
              </div>

              <div className={styles.lookbookVideo}>
                <span className={styles.mediaSequence}>01</span>
                <span className={styles.verticalLabel}>FILM</span>
                <div className={styles.lookbookMedia}>
                  <video
                    src={data.featuredVideoSource}
                    poster={data.featuredVideoPoster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label="The August Edit film playing inline"
                  />
                  <span>0:21</span>
                </div>
              </div>

              <div className={styles.outfitStory}>
                <span className={styles.mediaSequence}>02</span>
                <span className={styles.verticalLabel}>LOOK</span>
                <Image src={data.featuredOutfit} alt="Maya's yellow cardigan look" fill sizes="234px" loading="eager" unoptimized />
              </div>

              {data.products.map((product) => (
                <ProductStory key={product.id} product={product} onShop={(name) => profile.showNotice(`${name} opened in a tracked shop view`)} />
              ))}

            </section>

            <section className={styles.recentSection} aria-labelledby="recent-posts-title">
              <h2 id="recent-posts-title" className={styles.visuallyHidden}>Recent posts</h2>
              <div className={styles.filterBar}>
                <div role="tablist" aria-label="Filter posts">
                  {postFilters.map((filter) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profile.activeFilter === filter.id}
                      key={filter.id}
                      className={profile.activeFilter === filter.id ? styles.activeFilter : undefined}
                      onClick={() => profile.setActiveFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <p className={styles.disclosure}>I may earn commission from qualifying purchases.</p>
              </div>
              <div className={styles.recentGrid}>
                {profile.filteredPosts.map((post) => (
                  <RecentPost
                    key={post.id}
                    post={post}
                    onPlay={() => profile.showNotice(`${post.title} selected`)}
                  />
                ))}
              </div>
              <button type="button" className={styles.viewAll} onClick={() => profile.setActiveFilter("all")}>View all posts <ArrowRight aria-hidden="true" weight="bold" /></button>
            </section>
          </>
        ) : null}

        {profile.activeSection === "shop" ? (
          <section className={styles.alternateSection} aria-labelledby="shop-title">
            <span>MAYA&apos;S WARDROBE</span>
            <h2 id="shop-title">Shop every featured piece.</h2>
            <p>Approved garments from Maya&apos;s latest stories, with tracked links and clear sponsored labels.</p>
            <div className={styles.shopGrid}>
              {data.products.map((product) => (
                <ProductStory key={product.id} product={product} onShop={(name) => profile.showNotice(`${name} opened in a tracked shop view`)} />
              ))}
            </div>
          </section>
        ) : null}

        {profile.activeSection === "about" ? (
          <section className={styles.alternateSection} aria-labelledby="about-title">
            <span>ABOUT MAYA</span>
            <h2 id="about-title">Style should make real life feel easier.</h2>
            <div className={styles.aboutGrid}>
              <p>Maya Laurent is a Paris-based fashion creator known for useful color, relaxed tailoring, and thoughtful layers designed for everyday movement.</p>
              <p>Every featured product is clearly labeled. Maya may earn commission when followers purchase through eligible PrimeStyleAI tracked links.</p>
            </div>
          </section>
        ) : null}
      </main>

      {profile.notice ? <div className={styles.notice} role="status">{profile.notice}</div> : null}
    </div>
  );
}
