"use client";

import { useMemo } from "react";
import { useLandingNavigation } from "../../hooks/useLandingNavigation";
import { usePartnerInterest } from "../../hooks/usePartnerInterest";
import { mapInfluencerLandingViewModel } from "../mappers/influencerLandingMapper";

export function useInfluencerLandingPage() {
  const navigation = useLandingNavigation();
  const interest = usePartnerInterest("influencer");
  const viewModel = useMemo(() => mapInfluencerLandingViewModel(), []);

  return { interest, navigation, viewModel };
}
