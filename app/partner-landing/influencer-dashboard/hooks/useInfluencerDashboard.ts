"use client";

import { useEffect, useMemo, useState } from "react";
import { INFLUENCER_DASHBOARD_DATA } from "../data/influencerDashboardData";
import { mapInfluencerDashboard } from "../mappers/influencerDashboardMapper";
import type {
  GeneratedLink,
  InfluencerCampaignFilter,
  InfluencerDashboardSection,
  InfluencerProductFilters,
  SupportCase,
  SupportCaseType,
} from "../types";

const INITIAL_PRODUCT_FILTERS: InfluencerProductFilters = {
  channel: "all",
  campaignId: "all",
  category: "all",
  region: "all",
  rate: "any",
  search: "",
};

export function useInfluencerDashboard() {
  const [section, setSection] = useState<InfluencerDashboardSection>("overview");
  const [campaignFilter, setCampaignFilter] = useState<InfluencerCampaignFilter>("all");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [productFilters, setProductFilters] = useState<InfluencerProductFilters>(INITIAL_PRODUCT_FILTERS);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [linkLabel, setLinkLabel] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState(INFLUENCER_DASHBOARD_DATA.generatedLinks);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [acceptedCampaigns, setAcceptedCampaigns] = useState(
    () => new Set(INFLUENCER_DASHBOARD_DATA.campaignTerms.filter((terms) => terms.termsAccepted).map((terms) => terms.campaignId)),
  );
  const [supportCases, setSupportCases] = useState(INFLUENCER_DASHBOARD_DATA.supportCases);
  const [supportType, setSupportType] = useState<SupportCaseType>("missing_transaction");
  const [supportReference, setSupportReference] = useState("");
  const [supportDetails, setSupportDetails] = useState("");
  const [submittedCase, setSubmittedCase] = useState<string | null>(null);

  useEffect(() => {
    const applySectionFromHash = () => {
      const sectionFromHash = window.location.hash.slice(1) as InfluencerDashboardSection;
      if (["overview", "campaigns", "products", "links", "earnings", "transactions", "payouts", "profile", "support"].includes(sectionFromHash)) {
        setSection(sectionFromHash);
      }
    };
    const frame = window.requestAnimationFrame(applySectionFromHash);
    window.addEventListener("hashchange", applySectionFromHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", applySectionFromHash);
    };
  }, []);

  const currentData = useMemo(
    () => ({ ...INFLUENCER_DASHBOARD_DATA, generatedLinks, supportCases }),
    [generatedLinks, supportCases],
  );

  const viewModel = useMemo(
    () => mapInfluencerDashboard(currentData, campaignFilter, campaignSearch, productFilters),
    [currentData, campaignFilter, campaignSearch, productFilters],
  );

  const selectedCampaign = currentData.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const selectedCampaignTerms = currentData.campaignTerms.find((terms) => terms.campaignId === selectedCampaignId) ?? null;
  const selectedProduct = currentData.products.find((product) => product.id === selectedProductId) ?? null;
  const selectedLink = generatedLinks.find((link) => link.id === selectedLinkId) ?? null;

  const setProductFilter = <Key extends keyof InfluencerProductFilters>(
    key: Key,
    value: InfluencerProductFilters[Key],
  ) => {
    setProductFilters((current) => ({ ...current, [key]: value }));
  };

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // A visible confirmation still makes the UI preview useful when clipboard access is blocked.
    }
    setCopiedValue(key);
    window.setTimeout(() => setCopiedValue(null), 1800);
  };

  const selectCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setSelectedProductId(null);
    setGeneratedUrl(null);
  };

  const openProductsForCampaign = (campaignId: string) => {
    setSection("products");
    setSelectedCampaignId(campaignId);
    setProductFilters((current) => ({ ...current, campaignId }));
    setSelectedProductId(null);
    setGeneratedUrl(null);
  };

  const selectProduct = (productId: string) => {
    const product = currentData.products.find((item) => item.id === productId);
    if (!product) return;
    setSelectedProductId(productId);
    setSelectedCampaignId(product.campaignId);
    setLinkLabel(`${product.merchant} · ${product.title}`);
    setGeneratedUrl(null);
  };

  const acceptCampaignTerms = (campaignId: string) => {
    setAcceptedCampaigns((current) => new Set([...current, campaignId]));
  };

  const canGenerateSelectedLink = Boolean(
    selectedProduct
      && selectedProduct.status !== "unavailable"
      && selectedProduct.status !== "suspended"
      && (selectedProduct.status !== "terms_review" || acceptedCampaigns.has(selectedProduct.campaignId)),
  );

  const generateSelectedLink = () => {
    if (!selectedProduct || !canGenerateSelectedLink || !linkLabel.trim()) return;
    const url = `https://primestyle.ai/r/${currentData.creator.publisherId.toLowerCase()}/${selectedProduct.id.toLowerCase()}`;
    const campaign = currentData.campaigns.find((item) => item.id === selectedProduct.campaignId);
    const newLink: GeneratedLink = {
      id: `link-new-${generatedLinks.length + 1}`,
      label: linkLabel.trim(),
      productId: selectedProduct.id,
      product: selectedProduct.title,
      merchant: selectedProduct.merchant,
      campaignId: selectedProduct.campaignId,
      campaign: campaign?.title ?? "Approved campaign",
      channel: selectedProduct.channel,
      clicks: 0,
      conversions: 0,
      attributionExpiresAt: selectedCampaignTerms?.attributionWindow ?? "Campaign terms",
      lastActivity: "Created just now",
      status: "active",
      url,
    };
    setGeneratedLinks((current) => [newLink, ...current]);
    setGeneratedUrl(url);
  };

  const toggleLinkDisabled = (linkId: string) => {
    setGeneratedLinks((current) => current.map((link) => (
      link.id === linkId && (link.status === "active" || link.status === "disabled")
        ? { ...link, status: link.status === "active" ? "disabled" as const : "active" as const }
        : link
    )));
  };

  const openSupport = (type: SupportCaseType, reference = "") => {
    setSection("support");
    setSupportType(type);
    setSupportReference(reference);
    setSubmittedCase(null);
  };

  const submitSupport = () => {
    if (!supportReference.trim() || !supportDetails.trim()) return;
    const caseId = `CASE-${160 + supportCases.length}`;
    const newCase: SupportCase = {
      id: caseId,
      type: supportType,
      subject: supportReference.trim(),
      updatedAt: "Submitted just now",
      status: "Open",
    };
    setSupportCases((current) => [newCase, ...current]);
    setSubmittedCase(caseId);
    setSupportReference("");
    setSupportDetails("");
  };

  return {
    viewModel,
    section,
    setSection,
    campaignFilter,
    setCampaignFilter,
    campaignSearch,
    setCampaignSearch,
    productFilters,
    setProductFilter,
    selectedCampaign,
    selectedCampaignTerms,
    selectedProduct,
    selectedLink,
    selectCampaign,
    openProductsForCampaign,
    selectProduct,
    selectedLinkId,
    setSelectedLinkId,
    linkLabel,
    setLinkLabel,
    generatedUrl,
    generateSelectedLink,
    canGenerateSelectedLink,
    acceptedCampaigns,
    acceptCampaignTerms,
    copiedValue,
    copyText,
    toggleLinkDisabled,
    supportType,
    setSupportType,
    supportReference,
    setSupportReference,
    supportDetails,
    setSupportDetails,
    submittedCase,
    openSupport,
    submitSupport,
  };
}
