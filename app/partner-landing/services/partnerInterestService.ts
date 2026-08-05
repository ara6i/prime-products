import type { PartnerInterestPayload, PartnerInterestResult } from "../types";

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
      }),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      return { ok: false, message: error.error ?? error.message ?? "Could not join the network. Try again." };
    }

    return {
      ok: true,
      message:
        payload.audience === "influencer"
          ? "You’re on the creator waitlist. We’ll be in touch when access opens."
          : "Your request to join the network is in. We’ll be in touch with the right connection path.",
    };
  } catch {
    return { ok: false, message: payload.audience === "merchant" ? "Could not join the network. Try again." : "Could not join the waitlist. Try again." };
  }
}
