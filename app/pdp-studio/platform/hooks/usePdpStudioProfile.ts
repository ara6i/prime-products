"use client";

import { useEffect, useState } from "react";
import type { PdpStudioUser } from "../../shared/pdpStudioAuthService";
import { getPdpStudioProfile } from "../services/pdpStudioProfileService";
import type { PdpStudioProfile } from "../types/pdpStudioPlatform";

export function usePdpStudioProfile(user: PdpStudioUser | null) {
  const [profile, setProfile] = useState<PdpStudioProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void getPdpStudioProfile()
      .then(setProfile)
      .catch(() => undefined);
  }, [user]);

  return profile;
}
