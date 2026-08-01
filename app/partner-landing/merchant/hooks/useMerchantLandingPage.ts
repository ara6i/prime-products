"use client";

import { useMemo } from "react";
import { useLandingNavigation } from "../../hooks/useLandingNavigation";
import { usePartnerInterest } from "../../hooks/usePartnerInterest";
import { mapMerchantLandingViewModel } from "../mappers/merchantLandingMapper";

export function useMerchantLandingPage() {
  const navigation = useLandingNavigation();
  const interest = usePartnerInterest("merchant");
  const viewModel = useMemo(() => mapMerchantLandingViewModel(), []);

  return { interest, navigation, viewModel };
}
