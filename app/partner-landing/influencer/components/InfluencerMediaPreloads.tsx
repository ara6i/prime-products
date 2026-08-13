"use client";

import { preload } from "react-dom";
import { INFLUENCER_HERO_REELS } from "./influencerHeroMedia";

export function InfluencerMediaPreloads() {
  for (const reel of INFLUENCER_HERO_REELS) {
    preload(reel.poster, {
      as: "image",
      type: "image/webp",
      fetchPriority: "high",
    });
  }

  preload(INFLUENCER_HERO_REELS[0].webm, {
    as: "video",
    type: "video/webm",
    fetchPriority: "high",
  });

  return null;
}
