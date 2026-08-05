"use client";

import { useMemo, useState } from "react";
import { creatorProfileData } from "../data/influencerProfileData";
import type { PostFilter, ProfileSection } from "../types";

export function useInfluencerProfile() {
  const [activeSection, setActiveSection] = useState<ProfileSection>("posts");
  const [activeFilter, setActiveFilter] = useState<PostFilter>("all");
  const [following, setFollowing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    if (activeFilter === "all") return creatorProfileData.posts;
    return creatorProfileData.posts.filter((post) => post.filters.includes(activeFilter));
  }, [activeFilter]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return [
      ...creatorProfileData.posts.map((post) => ({
        id: post.id,
        label: post.title,
        type: "Film",
      })),
      ...creatorProfileData.products.map((product) => ({
        id: product.id,
        label: product.name,
        type: "Look",
      })),
    ]
      .filter((item) => item.label.toLowerCase().includes(query))
      .slice(0, 4);
  }, [searchQuery]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2200);
  }

  async function shareProfile() {
    const shareData = {
      title: `${creatorProfileData.name} on PrimeStyleAI`,
      text: `See ${creatorProfileData.name}'s latest shoppable fashion stories.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      showNotice("Profile link copied");
    } catch {
      // Closing the native share sheet should not surface as an error.
    }
  }

  return {
    data: creatorProfileData,
    activeSection,
    activeFilter,
    following,
    searchQuery,
    searchResults,
    filteredPosts,
    notice,
    setActiveSection,
    setActiveFilter,
    setFollowing,
    setSearchQuery,
    shareProfile,
    showNotice,
  };
}
