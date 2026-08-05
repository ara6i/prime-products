import type {
  CreatorChannel,
  InfluencerCampaignFilter,
  InfluencerDashboardCampaign,
  InfluencerDashboardData,
  InfluencerProductFilters,
} from "../types";

export function getChannelLabel(channel: CreatorChannel) {
  if (channel === "affiliate_rakuten") return "Rakuten affiliate";
  if (channel === "affiliate_awin") return "Awin affiliate";
  return "Direct campaign";
}

function isAffiliateChannel(channel: CreatorChannel) {
  return channel === "affiliate_rakuten" || channel === "affiliate_awin";
}

function matchesCampaignFilter(
  campaign: InfluencerDashboardCampaign,
  filter: InfluencerCampaignFilter,
) {
  if (filter === "all") return true;
  if (filter === "high-rate") return campaign.rateValue >= 10;
  return campaign.kind === filter;
}

function matchesProductChannel(channel: CreatorChannel, filter: InfluencerProductFilters["channel"]) {
  if (filter === "all") return true;
  if (filter === "affiliate") return isAffiliateChannel(channel);
  return channel === "direct_connected";
}

export function mapInfluencerDashboard(
  data: InfluencerDashboardData,
  campaignFilter: InfluencerCampaignFilter,
  campaignSearch: string,
  productFilters: InfluencerProductFilters,
) {
  const normalizedCampaignSearch = campaignSearch.trim().toLowerCase();
  const campaigns = data.campaigns.filter((campaign) => {
    if (!matchesCampaignFilter(campaign, campaignFilter)) return false;
    if (!normalizedCampaignSearch) return true;
    return [
      campaign.title,
      campaign.merchant,
      campaign.category,
      campaign.region,
      campaign.network,
    ].some((value) => value.toLowerCase().includes(normalizedCampaignSearch));
  });

  const normalizedProductSearch = productFilters.search.trim().toLowerCase();
  const products = data.products.filter((product) => {
    if (!matchesProductChannel(product.channel, productFilters.channel)) return false;
    if (productFilters.campaignId !== "all" && product.campaignId !== productFilters.campaignId) return false;
    if (productFilters.category !== "all" && product.category !== productFilters.category) return false;
    if (productFilters.region !== "all" && product.region !== productFilters.region) return false;
    if (productFilters.rate === "high-rate" && product.rateValue < 10) return false;
    if (!normalizedProductSearch) return true;
    return [product.title, product.merchant, product.category, product.region, product.network]
      .some((value) => value.toLowerCase().includes(normalizedProductSearch));
  });

  const categories = [...new Set(data.products.map((product) => product.category))];
  const regions = [...new Set(data.products.map((product) => product.region))];

  return {
    ...data,
    campaigns,
    products,
    productFilterOptions: { categories, regions },
    summary: {
      approvedCampaigns: data.campaigns.length,
      approvedProducts: data.products.filter((product) => product.status === "active").length,
      activeLinks: data.generatedLinks.filter((link) => link.status === "active").length,
      availableBalance: "$2,460",
      pendingBalance: "$610",
      affiliateBalance: "$1,680",
      directBalance: "$780",
      nextPayout: "Aug 15",
      openCases: data.supportCases.filter((supportCase) => supportCase.status !== "Resolved").length,
    },
  };
}
