import type {
  MerchantOnboardingData,
  MerchantOnboardingViewModel,
} from "../types";

export function mapMerchantOnboarding(data: MerchantOnboardingData): MerchantOnboardingViewModel {
  return {
    storeName: data.store.storeName,
    merchantName: data.store.merchantName,
    domain: data.store.domain,
    ownerEmail: data.store.ownerEmail,
    invitationCode: data.store.invitationCode,
    invitationLink: data.store.invitationLink,
    dnsRecord: data.dns.record,
    steps: [
      {
        id: "environment",
        label: "01",
        title: "Workspace prepared",
        description: "Your dedicated PrimeStyleAI environment is reserved for this store.",
        status: "complete",
      },
      {
        id: "domain",
        label: "02",
        title: "Verify domain ownership",
        description: "Add the DNS TXT record so we can trust SDK calls from your storefront.",
        status: data.dns.verified ? "complete" : "ready",
      },
      {
        id: "api-key",
        label: "03",
        title: "Create production key",
        description: "Generate the key your SDK and API integration will use.",
        status: data.dns.verified ? "ready" : "locked",
      },
    ],
  };
}
