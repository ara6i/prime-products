import type { PartnerInterestPayload, PartnerInterestResult } from "../types";
import { validateCreatorProfileUrl } from "./creatorProfileValidation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitPartnerInterest(
  payload: PartnerInterestPayload,
): Promise<PartnerInterestResult> {
  if (!payload.name.trim() || !EMAIL_PATTERN.test(payload.email.trim())) {
    return {
      ok: false,
      message: "Add your name and a valid email so we can follow up.",
    };
  }

  if (
    payload.audience === "influencer" &&
    ((!payload.creatorProfiles?.length && !payload.website?.trim()) ||
      (payload.creatorProfiles?.some(
        (profile) =>
          !profile.platform ||
          !validateCreatorProfileUrl(profile.platform, profile.url).valid,
      ) ??
        false) ||
      !payload.audienceSize ||
      !payload.location?.trim() ||
      payload.marketingConsent !== true)
  ) {
    return {
      ok: false,
      message:
        "Complete your creator profile details and consent before joining.",
    };
  }

  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "";
    const response = await fetch(`${apiBase}/api/contact/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email.trim(),
        product: payload.audience,
        name: payload.name.trim(),
        website: payload.website?.trim() || undefined,
        creatorProfiles: payload.creatorProfiles?.map((profile) => {
          const validation = validateCreatorProfileUrl(
            profile.platform,
            profile.url,
          );
          return {
            platform: profile.platform,
            url: validation.valid
              ? validation.normalizedUrl
              : profile.url.trim(),
          };
        }),
        audienceSize: payload.audienceSize,
        location: payload.location?.trim() || undefined,
        timezone: payload.timezone?.trim() || undefined,
        marketingConsent: payload.marketingConsent,
        leadSource: payload.leadSource,
      }),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      return {
        ok: false,
        message:
          error.error ??
          error.message ??
          "Could not join the network. Try again.",
      };
    }

    return {
      ok: true,
      message:
        payload.audience === "influencer"
          ? "You’re on the creator waitlist. We’ll be in touch when access opens."
          : payload.audience === "supplier"
            ? "Your supplier request is in. We’ll be in touch about the right merchant connection path."
            : "Your request to join the network is in. We’ll be in touch with the right connection path.",
    };
  } catch {
    return {
      ok: false,
      message:
        payload.audience === "influencer"
          ? "Could not join the waitlist. Try again."
          : "Could not join the network. Try again.",
    };
  }
}
