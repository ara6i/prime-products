import type {
  MerchantOnboardingData,
  MerchantOnboardingViewModel,
} from "../types";

export function mapMerchantOnboarding(data: MerchantOnboardingData): MerchantOnboardingViewModel {
  const profileComplete = data.profile.completed;
  const reviewApproved = data.review.status === "approved";
  const reviewReady = profileComplete && data.dns.verified;

  return {
    storeName: data.store.storeName,
    merchantName: data.store.merchantName,
    domain: data.store.domain,
    ownerEmail: data.store.ownerEmail,
    invitationCode: data.store.invitationCode,
    invitationLink: data.store.invitationLink,
    profile: data.profile,
    review: data.review,
    dnsRecord: data.dns.record,
    steps: [
      {
        id: "welcome",
        label: "01",
        title: "Welcome",
        description: "Start the SDK workspace setup for this merchant account.",
        status: profileComplete ? "complete" : "ready",
      },
      {
        id: "business",
        label: "02",
        title: "Business profile",
        description: "Tell us who owns this SDK workspace and where it will run.",
        status: profileComplete ? "complete" : "ready",
      },
      {
        id: "domain",
        label: "03",
        title: "Verify domain ownership",
        description: "Add the DNS TXT record so we can trust SDK calls from your storefront.",
        status: profileComplete ? (data.dns.verified ? "complete" : "ready") : "locked",
      },
      {
        id: "review",
        label: "04",
        title: "Wait for review",
        description: "PrimeStyleAI reviews your workspace before production access is enabled.",
        status: reviewApproved ? "complete" : reviewReady ? "ready" : "locked",
      },
    ],
  };
}
