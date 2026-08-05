"use client";

import {
  BookmarkSimple,
  CalendarBlank,
  ChartLineUp,
  ChatCircleDots,
  Check,
  ClockCountdown,
  DotsThree,
  Eye,
  FileText,
  FunnelSimple,
  InstagramLogo,
  MagnifyingGlass,
  PaperPlaneTilt,
  SealCheck,
  Storefront,
  Target,
  TiktokLogo,
  TrendUp,
  UsersThree,
  YoutubeLogo,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import styles from "./creatorPartnerships.module.css";

type CreatorTab = "find-creators" | "hired" | "performance";

interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  location: string;
  focus: string;
  followers: string;
  engagement: string;
  audience: string;
  commission: string;
  image: string;
  bio: string;
  match: string;
  averageViews: string;
  channels: string[];
}

interface HiredInfluencer {
  id: string;
  name: string;
  image: string;
  campaign: string;
  status: "Live" | "Awaiting content" | "Scheduled";
  scope: string;
  commission: string;
  nextMilestone: string;
  due: string;
  delivered: number;
  total: number;
  clicks: string;
  orders: string;
  sales: string;
  note: string;
}

const tabs: Array<{
  id: CreatorTab;
  label: string;
  detail: string;
  count: string;
  icon: typeof UsersThree;
}> = [
  {
    id: "find-creators",
    label: "Find creators",
    detail: "Search, compare and open profiles",
    count: "13,150",
    icon: MagnifyingGlass,
  },
  {
    id: "hired",
    label: "Hired influencers",
    detail: "Campaigns, content and next actions",
    count: "3 hired",
    icon: UsersThree,
  },
  {
    id: "performance",
    label: "Performance",
    detail: "Results by influencer and campaign",
    count: "+24.6%",
    icon: ChartLineUp,
  },
];

const creatorProfiles: CreatorProfile[] = [
  {
    id: "susan-adams",
    name: "Susan Adams",
    handle: "@susanadams",
    location: "Barcelona, ES",
    focus: "Beauty & fashion",
    followers: "870K",
    engagement: "4.9%",
    audience: "78% women · 24–34",
    commission: "8%",
    image:
      "/media/partner-landing/merchant-network/creator-discovery/creator-susan.webp",
    bio: "Editorial beauty, modern tailoring and polished short-form product stories for premium audiences.",
    match: "96%",
    averageViews: "284K",
    channels: ["Instagram", "TikTok", "YouTube"],
  },
  {
    id: "tamara-brown",
    name: "Tamara Brown",
    handle: "@tamarabrown",
    location: "Wellington, NZ",
    focus: "Lifestyle",
    followers: "440K",
    engagement: "5.4%",
    audience: "71% women · 25–39",
    commission: "5%",
    image:
      "/media/partner-landing/merchant-network/creator-discovery/creator-tamara.webp",
    bio: "Minimal lifestyle, capsule wardrobes and honest fit reviews with strong save and click intent.",
    match: "92%",
    averageViews: "167K",
    channels: ["Instagram", "TikTok"],
  },
  {
    id: "jay-kollor",
    name: "Jay Kollor",
    handle: "@jaykollor",
    location: "New York, USA",
    focus: "Menswear",
    followers: "315K",
    engagement: "4.3%",
    audience: "64% men · 22–36",
    commission: "6%",
    image:
      "/media/partner-landing/merchant-network/creator-discovery/creator-jay.webp",
    bio: "Contemporary menswear, occasion styling and confident product-led video with a US-first audience.",
    match: "89%",
    averageViews: "121K",
    channels: ["Instagram", "YouTube", "TikTok"],
  },
];

const hiredInfluencers: HiredInfluencer[] = [
  {
    id: "maya-laurent",
    name: "Maya Laurent",
    image: "/media/partner-landing/creator-match-maya.png",
    campaign: "Autumn tailoring launch",
    status: "Live",
    scope: "164 tailoring products",
    commission: "8.4%",
    nextMilestone: "Second styling reel",
    due: "Due 08 Aug",
    delivered: 3,
    total: 4,
    clicks: "6,842",
    orders: "64",
    sales: "$12.8K",
    note: "Strongest conversion comes from complete-look reels featuring the ivory blazer.",
  },
  {
    id: "rae-mensah",
    name: "Rae Mensah",
    image: "/media/partner-landing/creator-match-rae.png",
    campaign: "Complete Look education",
    status: "Awaiting content",
    scope: "88 approved products",
    commission: "7.5%",
    nextMilestone: "Approve first cut",
    due: "Due today",
    delivered: 1,
    total: 3,
    clicks: "3,190",
    orders: "28",
    sales: "$6.4K",
    note: "The first cut is ready for merchant review before the tracked link is released.",
  },
  {
    id: "zoe-park",
    name: "Zoe Park",
    image: "/media/partner-landing/creator-match-zoe.png",
    campaign: "Holiday occasion edit",
    status: "Scheduled",
    scope: "146 occasion products",
    commission: "9%",
    nextMilestone: "Campaign kickoff",
    due: "Starts 15 Oct",
    delivered: 0,
    total: 4,
    clicks: "—",
    orders: "—",
    sales: "Not live",
    note: "Terms are accepted. Product seeding and content production begin at campaign kickoff.",
  },
];

const creatorActivity = [
  { day: "Mon", sales: 18 },
  { day: "Tue", sales: 13 },
  { day: "Wed", sales: 29 },
  { day: "Thu", sales: 22 },
  { day: "Fri", sales: 41 },
  { day: "Sat", sales: 31 },
  { day: "Sun", sales: 35 },
];

const performanceCampaigns = [
  {
    id: "autumn-tailoring",
    creator: "Maya Laurent",
    creatorImage: "/media/partner-landing/creator-match-maya.png",
    name: "Autumn tailoring launch",
    status: "Live",
    accent: "violet",
    period: "28 Jul – 18 Aug",
    content: "3 reels · 8 stories",
    sales: "$12.8K",
    orders: "64",
    clicks: "6,842",
    conversion: "1.12%",
    products: [
      {
        name: "Navy tailored blazer",
        price: "$248",
        image:
          "/media/merchant-dashboard/generated/products/final/product-navy-blazer.webp",
      },
      {
        name: "Stone pleated trousers",
        price: "$164",
        image:
          "/media/merchant-dashboard/generated/products/final/product-stone-trousers.webp",
      },
      {
        name: "Silk column dress",
        price: "$286",
        image:
          "/media/merchant-dashboard/generated/products/final/product-silk-dress.webp",
      },
    ],
  },
  {
    id: "city-layers",
    creator: "Maya Laurent",
    creatorImage: "/media/partner-landing/creator-match-maya.png",
    name: "City layers preview",
    status: "Complete",
    accent: "mint",
    period: "05 Jul – 19 Jul",
    content: "2 reels · 4 stories",
    sales: "$5.6K",
    orders: "30",
    clicks: "2,962",
    conversion: "0.72%",
    products: [
      {
        name: "Navy tailored blazer",
        price: "$248",
        image:
          "/media/merchant-dashboard/generated/products/final/product-navy-blazer.webp",
      },
      {
        name: "Stone pleated trousers",
        price: "$164",
        image:
          "/media/merchant-dashboard/generated/products/final/product-stone-trousers.webp",
      },
      {
        name: "Sand slingback heel",
        price: "$178",
        image:
          "/media/merchant-dashboard/generated/products/final/product-sand-slingbacks.webp",
      },
    ],
  },
  {
    id: "complete-look",
    creator: "Rae Mensah",
    creatorImage: "/media/partner-landing/creator-match-rae.png",
    name: "Complete Look education",
    status: "Review",
    accent: "orange",
    period: "01 Aug – 22 Aug",
    content: "1 reel · 5 stories",
    sales: "$6.4K",
    orders: "28",
    clicks: "3,190",
    conversion: "0.88%",
    products: [
      {
        name: "Silk column dress",
        price: "$286",
        image:
          "/media/merchant-dashboard/generated/products/final/product-silk-dress.webp",
      },
      {
        name: "Sand slingback heel",
        price: "$178",
        image:
          "/media/merchant-dashboard/generated/products/final/product-sand-slingbacks.webp",
      },
      {
        name: "Navy tailored blazer",
        price: "$248",
        image:
          "/media/merchant-dashboard/generated/products/final/product-navy-blazer.webp",
      },
    ],
  },
  {
    id: "holiday-occasion",
    creator: "Zoe Park",
    creatorImage: "/media/partner-landing/creator-match-zoe.png",
    name: "Holiday occasion edit",
    status: "Scheduled",
    accent: "blue",
    period: "Starts 15 Oct",
    content: "4 deliverables planned",
    sales: "Not live",
    orders: "—",
    clicks: "—",
    conversion: "—",
    products: [
      {
        name: "Silk column dress",
        price: "$286",
        image:
          "/media/merchant-dashboard/generated/products/final/product-silk-dress.webp",
      },
      {
        name: "Sand slingback heel",
        price: "$178",
        image:
          "/media/merchant-dashboard/generated/products/final/product-sand-slingbacks.webp",
      },
      {
        name: "Stone pleated trousers",
        price: "$164",
        image:
          "/media/merchant-dashboard/generated/products/final/product-stone-trousers.webp",
      },
    ],
  },
] as const;

const hiredPerformanceProfiles = [
  {
    creatorId: "maya-laurent",
    campaignId: "autumn-tailoring",
    score: 94,
    scoreLabel: "Performance",
    tone: "violet",
    color: "#6e3df5",
    tags: ["Tailoring", "Reels", "High intent"],
    trend: [34, 48, 39, 61, 54, 72, 66],
  },
  {
    creatorId: "rae-mensah",
    campaignId: "complete-look",
    score: 88,
    scoreLabel: "Performance",
    tone: "orange",
    color: "#f08a3f",
    tags: ["Education", "Styling", "Review"],
    trend: [22, 36, 28, 44, 39, 53, 49],
  },
  {
    creatorId: "zoe-park",
    campaignId: "holiday-occasion",
    score: 76,
    scoreLabel: "Readiness",
    tone: "blue",
    color: "#4f76df",
    tags: ["Occasion", "Seasonal", "Scheduled"],
    trend: [18, 25, 31, 37, 44, 55, 62],
  },
] as const;

function CreatorChannels({ channels }: { channels: string[] }) {
  return (
    <span className={styles.channelIcons} aria-label={channels.join(", ")}>
      {channels.includes("Instagram") ? (
        <InstagramLogo size={16} aria-hidden />
      ) : null}
      {channels.includes("YouTube") ? (
        <YoutubeLogo size={16} aria-hidden />
      ) : null}
      {channels.includes("TikTok") ? (
        <TiktokLogo size={16} aria-hidden />
      ) : null}
    </span>
  );
}

function FindCreatorsWorkspace() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");
  const [followers, setFollowers] = useState("all");
  const [commission, setCommission] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const [saved, setSaved] = useState<string[]>([]);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const filteredCreators = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const parseMetric = (value: string) => Number.parseFloat(value.replace(/[^0-9.]/g, ""));
    const filtered = creatorProfiles.filter((creator) => {
      const matchesSearch =
        !normalized ||
        [creator.name, creator.location, creator.focus, creator.handle].some(
          (value) => value.toLowerCase().includes(normalized),
        );
      const matchesCountry = country === "all" || creator.location.endsWith(country);
      const followerCount = parseMetric(creator.followers);
      const matchesFollowers =
        followers === "all" ||
        (followers === "under-400" && followerCount < 400) ||
        (followers === "400-700" && followerCount >= 400 && followerCount < 700) ||
        (followers === "700-plus" && followerCount >= 700);
      const commissionRate = parseMetric(creator.commission);
      const matchesCommission =
        commission === "all" ||
        (commission === "under-6" && commissionRate < 6) ||
        (commission === "6-7" && commissionRate >= 6 && commissionRate < 8) ||
        (commission === "8-plus" && commissionRate >= 8);
      return matchesSearch && matchesCountry && matchesFollowers && matchesCommission;
    });

    return [...filtered].sort((first, second) => {
      if (sortBy === "followers") return parseMetric(second.followers) - parseMetric(first.followers);
      if (sortBy === "engagement") return parseMetric(second.engagement) - parseMetric(first.engagement);
      if (sortBy === "commission") return parseMetric(first.commission) - parseMetric(second.commission);
      return parseMetric(second.match) - parseMetric(first.match);
    });
  }, [commission, country, followers, query, sortBy]);
  const hasActiveFilters =
    Boolean(query.trim()) ||
    country !== "all" ||
    followers !== "all" ||
    commission !== "all" ||
    sortBy !== "match";

  function clearFilters() {
    setQuery("");
    setCountry("all");
    setFollowers("all");
    setCommission("all");
    setSortBy("match");
  }

  function toggleSaved(id: string) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((creatorId) => creatorId !== id)
        : [...current, id],
    );
  }

  return (
    <div className={styles.stack}>
      <section className={styles.discoveryToolbar} aria-label="Creator search and filters">
        <header>
          <span><FunnelSimple size={17} weight="duotone" aria-hidden /></span>
          <div><strong>Find creators</strong><small>Search and narrow the creator network.</small></div>
          <em>{filteredCreators.length} {filteredCreators.length === 1 ? "result" : "results"}</em>
        </header>
        <div className={styles.discoveryControls}>
          <label className={styles.discoverySearchField}>
            <span className={styles.srOnly}>Search creators</span>
            <MagnifyingGlass size={16} weight="bold" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, city, or specialty"
            />
          </label>
          <label className={styles.discoverySelect}>
            <span>Country</span>
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="all">All countries</option>
              <option value=", ES">Spain</option>
              <option value=", NZ">New Zealand</option>
              <option value=", USA">United States</option>
            </select>
          </label>
          <label className={styles.discoverySelect}>
            <span>Followers</span>
            <select value={followers} onChange={(event) => setFollowers(event.target.value)}>
              <option value="all">Any audience</option>
              <option value="under-400">Under 400K</option>
              <option value="400-700">400K–700K</option>
              <option value="700-plus">700K+</option>
            </select>
          </label>
          <label className={styles.discoverySelect}>
            <span>Commission</span>
            <select value={commission} onChange={(event) => setCommission(event.target.value)}>
              <option value="all">Any rate</option>
              <option value="under-6">Under 6%</option>
              <option value="6-7">6%–7%</option>
              <option value="8-plus">8%+</option>
            </select>
          </label>
          <label className={styles.discoverySelect}>
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="match">Best match</option>
              <option value="followers">Most followers</option>
              <option value="engagement">Highest engagement</option>
              <option value="commission">Lowest commission</option>
            </select>
          </label>
          {hasActiveFilters ? (
            <button type="button" className={styles.clearDiscoveryFilters} onClick={clearFilters}>Clear</button>
          ) : null}
        </div>
      </section>

      {previewName ? (
        <div className={styles.previewNotice} role="status">
          <Check size={17} weight="bold" aria-hidden />
          <span>
            Collaboration request for <strong>{previewName}</strong> is ready to
            preview. Nothing was sent.
          </span>
          <button type="button" onClick={() => setPreviewName(null)}>Dismiss</button>
        </div>
      ) : null}

      <section className={styles.creatorDirectory}>
        <div className={styles.creatorCards} aria-live="polite">
          {filteredCreators.map((creator) => (
            <article key={creator.id} className={styles.creatorCard}>
              <header className={styles.profileCardHeader}>
                <div className={styles.profileCardPortrait}>
                  <Image
                    src={creator.image}
                    alt={`${creator.name}, ${creator.focus} creator`}
                    fill
                    loading="eager"
                    sizes="76px"
                    unoptimized
                  />
                  <span>{creator.match} match</span>
                </div>
                <div className={styles.profileCardIntro}>
                  <div className={styles.profileCardIdentity}>
                    <span>
                      <strong>{creator.name}</strong>
                      <SealCheck size={14} weight="fill" aria-label="Verified" />
                    </span>
                    <small>{creator.handle}</small>
                    <CreatorChannels channels={creator.channels} />
                  </div>
                  <p>{creator.bio}</p>
                </div>
              </header>
              <dl className={styles.profileCardFacts}>
                <div><dt>Followers</dt><dd>{creator.followers}</dd></div>
                <div><dt>Engagement</dt><dd>{creator.engagement}</dd></div>
                <div><dt>Average views</dt><dd>{creator.averageViews}</dd></div>
                <div><dt>Commission</dt><dd>{creator.commission}</dd></div>
              </dl>
              <section className={styles.profileAudienceFit}>
                <span><Target size={14} weight="duotone" aria-hidden /> Audience fit</span>
                <strong>{creator.audience}</strong>
                <small>{creator.focus} · {creator.location}</small>
              </section>
              <div className={styles.profileCardActions}>
                <button
                  type="button"
                  aria-pressed={saved.includes(creator.id)}
                  aria-label={`${saved.includes(creator.id) ? "Remove" : "Save"} ${creator.name}`}
                  onClick={() => toggleSaved(creator.id)}
                >
                  <BookmarkSimple
                    size={16}
                    weight={saved.includes(creator.id) ? "fill" : "regular"}
                    aria-hidden
                  />
                </button>
                <button type="button" onClick={() => setPreviewName(creator.name)}>
                  Preview collaboration
                  <PaperPlaneTilt size={14} weight="bold" aria-hidden />
                </button>
              </div>
            </article>
          ))}
          {!filteredCreators.length ? (
            <div className={styles.emptyResults}>
              <MagnifyingGlass size={26} weight="duotone" aria-hidden />
              <strong>No creators match “{query}”</strong>
              <span>Try a name, city, or specialty.</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function HiredInfluencersWorkspace() {
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  return (
    <div className={styles.hiredInfluencerWorkspace}>
      <section className={styles.hiredSummaryGrid} aria-label="Hired influencer overview">
        <article data-tone="violet"><span><UsersThree size={18} weight="duotone" aria-hidden /></span><strong>3</strong><small>Hired influencers</small></article>
        <article data-tone="blue"><span><Check size={18} weight="bold" aria-hidden /></span><strong>4</strong><small>Content delivered</small></article>
        <article data-tone="mint"><span><TrendUp size={18} weight="duotone" aria-hidden /></span><strong>91%</strong><small>Avg. live performance</small></article>
        <article data-tone="orange"><span><ClockCountdown size={18} weight="duotone" aria-hidden /></span><strong>2</strong><small>Need attention</small></article>
      </section>

      {actionNotice ? (
        <div className={styles.hiredNotice} role="status">
          <Eye size={16} weight="duotone" aria-hidden />
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)}>Dismiss</button>
        </div>
      ) : null}

      <section className={styles.hiredInfluencerList} aria-label="Hired influencer campaigns">
        {hiredPerformanceProfiles.map((profile) => {
          const creator = hiredInfluencers.find(
            (candidate) => candidate.id === profile.creatorId,
          );
          const campaign = performanceCampaigns.find(
            (candidate) => candidate.id === profile.campaignId,
          );
          if (!creator || !campaign) return null;
          const trendData = profile.trend.map((value, index) => ({
            point: index,
            value,
          }));
          const scoreData = [
            { name: "score", value: profile.score },
            { name: "remaining", value: 100 - profile.score },
          ];

          return (
            <article key={creator.id} className={styles.hiredInfluencerCard} data-tone={profile.tone}>
              <div className={styles.hiredInfluencerPortrait}>
                <Image
                  src={creator.image}
                  alt={`${creator.name}, hired influencer`}
                  fill
                  sizes="(max-width: 620px) 96px, 190px"
                  priority
                />
              </div>

              <div className={styles.hiredInfluencerBody}>
                <header>
                  <div>
                    <h2>{creator.name}</h2>
                    <em data-status={creator.status}><i />{creator.status}</em>
                  </div>
                  <span>{creator.commission} commission</span>
                </header>
                <p className={styles.hiredCampaignLabel}>Campaign</p>
                <h3>{creator.campaign}</h3>
                <div className={styles.hiredCampaignTags} aria-label="Campaign tags">
                  {profile.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <div className={styles.hiredProducts}>
                  <span>Products</span>
                  <div>
                    {campaign.products.map((product) => (
                      <span key={product.name} title={product.name}>
                        <Image src={product.image} alt="" fill sizes="34px" />
                      </span>
                    ))}
                    <small>{campaign.products.map((product) => product.name).join(" · ")}</small>
                  </div>
                </div>
                <div className={styles.hiredTrendRow}>
                  <div aria-label={`${creator.name} campaign trend`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
                        <Area type="monotone" dataKey="value" stroke={profile.color} strokeWidth={2} fill={profile.color} fillOpacity={0.1} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <span><strong>{creator.delivered}/{creator.total}</strong> delivered · {creator.due}</span>
                </div>
              </div>

              <aside className={styles.hiredInfluencerScore}>
                <div className={styles.hiredScoreChart} aria-label={`${profile.score}% ${profile.scoreLabel.toLowerCase()}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={scoreData} dataKey="value" startAngle={90} endAngle={-270} innerRadius="72%" outerRadius="100%" stroke="none" isAnimationActive={false}>
                        <Cell fill={profile.color} />
                        <Cell fill="#e9eaf0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <strong>{profile.score}%</strong>
                </div>
                <span>{profile.scoreLabel}</span>
                <dl>
                  <div><dt>Sales</dt><dd>{creator.sales}</dd></div>
                  <div><dt>Orders</dt><dd>{creator.orders}</dd></div>
                </dl>
                <div className={styles.hiredCardActions}>
                  <button type="button" aria-label={`Preview note for ${creator.name}`} onClick={() => setActionNotice(creator.note)}><ChatCircleDots size={17} weight="duotone" aria-hidden /></button>
                  <Link href={`/merchants/dashboard/campaigns?tab=performance&creator=${creator.id}`} aria-label={`View ${creator.name} performance`} scroll={false}><FileText size={17} weight="duotone" aria-hidden /></Link>
                  <button type="button" aria-label={`Show next action for ${creator.name}`} onClick={() => setActionNotice(`Next: ${creator.nextMilestone} · ${creator.due}`)}><DotsThree size={18} weight="bold" aria-hidden /></button>
                </div>
              </aside>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function PerformanceWorkspace() {
  return (
    <div className={styles.performanceWorkspace}>
      <section className={styles.performanceOverview} aria-label="Creator campaign overview">
        <article className={styles.activityCard}>
          <header>
            <div>
              <span className={styles.eyebrow}>Creator activity</span>
              <h2>$24.8K</h2>
              <p>Attributed sales · last 7 days</p>
            </div>
            <span className={styles.periodPill}>
              <CalendarBlank size={13} weight="duotone" aria-hidden /> Last 7 days
            </span>
          </header>
          <div className={styles.activityChart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={creatorActivity} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e6e7ed" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#777b88", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(106, 61, 245, .05)" }}
                  contentStyle={{ border: "1px solid #e1e2ea", borderRadius: 10, boxShadow: "0 10px 24px rgba(24, 26, 44, .08)", fontSize: 10 }}
                  formatter={(value) => [`$${Number(value) * 100}`, "Attributed sales"]}
                />
                <Bar dataKey="sales" fill="#6e3df5" radius={[7, 7, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.progressCard}>
          <span className={styles.eyebrow}>Campaign progress</span>
          <div className={styles.progressHeading}>
            <strong>68%</strong>
            <span>of planned creator content is delivered</span>
          </div>
          <div className={styles.progressScale} aria-label="68 percent delivered">
            <i />
          </div>
          <div className={styles.campaignStates}>
            <span><i data-tone="violet"><ChartLineUp size={15} weight="duotone" aria-hidden /></i><strong>1</strong><small>Live</small></span>
            <span><i data-tone="orange"><Eye size={15} weight="duotone" aria-hidden /></i><strong>1</strong><small>Review</small></span>
            <span><i data-tone="mint"><Check size={15} weight="bold" aria-hidden /></i><strong>1</strong><small>Complete</small></span>
          </div>
        </article>

        <article className={styles.topCampaignCard}>
          <header>
            <span>Top campaign</span>
            <em>4.8× return</em>
          </header>
          <h3>Autumn tailoring launch</h3>
          <p>Maya Laurent is leading creator-attributed revenue this month.</p>
          <div className={styles.topCampaignFooter}>
            <span className={styles.topCreator}>
              <span><Image src="/media/partner-landing/creator-match-maya.png" alt="" fill sizes="36px" /></span>
              <span><strong>Maya Laurent</strong><small>3 reels · 8 stories</small></span>
            </span>
            <strong>$12.8K</strong>
          </div>
        </article>
      </section>

      <header className={styles.performanceSectionHeader}>
        <div>
          <span className={styles.eyebrow}>Influencer campaign performance</span>
          <h2>Results and products, campaign by campaign.</h2>
          <p>Card overview only. Open campaign detail will be added next.</p>
        </div>
        <span className={styles.networkLiftCompact}>
          <TrendUp size={17} weight="duotone" aria-hidden />
          <span><strong>+24.6%</strong><small>creator traffic lift</small></span>
        </span>
      </header>

      <section className={styles.performanceCampaignGrid} aria-label="Influencer campaign cards">
        {performanceCampaigns.map((campaign) => (
          <article key={campaign.id} className={styles.performanceCampaignCard} data-accent={campaign.accent}>
            <header className={styles.campaignCardHeader}>
              <span className={styles.campaignCreatorImage}>
                <Image src={campaign.creatorImage} alt="" fill sizes="52px" />
              </span>
              <span className={styles.campaignIdentity}>
                <strong>{campaign.creator}</strong>
                <small>{campaign.content}</small>
              </span>
              <em data-status={campaign.status}>{campaign.status}</em>
            </header>

            <div className={styles.campaignTitleRow}>
              <div>
                <h3>{campaign.name}</h3>
                <span><CalendarBlank size={13} weight="duotone" aria-hidden /> {campaign.period}</span>
              </div>
              <span className={styles.campaignSales}>
                <small>Attributed sales</small>
                <strong>{campaign.sales}</strong>
              </span>
            </div>

            <dl className={styles.campaignMetrics}>
              <div><dt><Storefront size={13} weight="duotone" aria-hidden /> Orders</dt><dd>{campaign.orders}</dd></div>
              <div><dt><Eye size={13} weight="duotone" aria-hidden /> Clicks</dt><dd>{campaign.clicks}</dd></div>
              <div><dt><Target size={13} weight="duotone" aria-hidden /> Conversion</dt><dd>{campaign.conversion}</dd></div>
            </dl>

            <section className={styles.campaignProducts}>
              <header>
                <span>Products in this campaign</span>
                <small>{campaign.products.length} products shown</small>
              </header>
              <div>
                {campaign.products.map((product) => (
                  <article key={product.name}>
                    <span>
                      <Image src={product.image} alt={product.name} fill sizes="68px" />
                    </span>
                    <div><strong>{product.name}</strong><small>{product.price}</small></div>
                  </article>
                ))}
              </div>
            </section>
          </article>
        ))}
      </section>
    </div>
  );
}

export function CreatorPartnershipsExperience() {
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const requestedTab = searchParams.get("tab");
  const activeTab: CreatorTab = tabs.some((tab) => tab.id === requestedTab)
    ? (requestedTab as CreatorTab)
    : "find-creators";

  useEffect(() => {
    const scrollParent = rootRef.current?.closest("section");
    if (scrollParent instanceof HTMLElement) scrollParent.scrollTop = 0;
  }, [activeTab]);

  return (
    <div ref={rootRef} className={styles.creatorExperience}>
      <nav className={styles.tabSwitcher} aria-label="Creator partnership views">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <Link
              key={tab.id}
              href={`/merchants/dashboard/campaigns?tab=${tab.id}`}
              className={active ? styles.tabActive : undefined}
              aria-current={active ? "page" : undefined}
              scroll={false}
            >
              <span className={styles.tabIcon}><Icon size={21} weight="duotone" aria-hidden /></span>
              <span><strong>{tab.label}</strong><small>{tab.detail}</small></span>
              <em>{tab.count}</em>
            </Link>
          );
        })}
      </nav>
      {activeTab === "hired" ? (
        <HiredInfluencersWorkspace />
      ) : activeTab === "performance" ? (
        <PerformanceWorkspace />
      ) : (
        <FindCreatorsWorkspace />
      )}
    </div>
  );
}
