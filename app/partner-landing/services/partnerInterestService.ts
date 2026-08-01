import type { PartnerInterestPayload, PartnerInterestResult } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitPartnerInterest(
  payload: PartnerInterestPayload,
): Promise<PartnerInterestResult> {
  await new Promise((resolve) => setTimeout(resolve, 650));

  if (!payload.name.trim() || !EMAIL_PATTERN.test(payload.email.trim())) {
    return {
      ok: false,
      message: "Add your name and a valid email so we can follow up.",
    };
  }

  return {
    ok: true,
    message:
      payload.audience === "influencer"
        ? "You’re on the creator-access list. We’ll be in touch shortly."
        : "Your campaign request is ready for our merchant team.",
  };
}
