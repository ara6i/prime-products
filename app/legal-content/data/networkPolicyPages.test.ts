import { describe, expect, it } from "vitest";
import { networkPrivacyPolicy, networkTermsPolicy } from "./networkPolicyPages";

function policyText(policy: typeof networkTermsPolicy) {
  return JSON.stringify(policy).toLowerCase();
}

describe("public network policies", () => {
  it("publishes only the 22 public terms sections", () => {
    expect(networkTermsPolicy.sections).toHaveLength(22);
    expect(networkTermsPolicy.sections.at(-1)?.title).toMatch(/^22\. Accessibility/);
    expect(policyText(networkTermsPolicy)).not.toContain("part ii");
    expect(policyText(networkTermsPolicy)).not.toContain("internal implementation checklist");
  });

  it("states the merchant transaction model and AI limitations", () => {
    const text = policyText(networkTermsPolicy);
    expect(text).toContain("merchant of record");
    expect(text).toContain("merchant's cart or checkout");
    expect(text).toContain("estimates or illustrations—not guarantees");
  });

  it("keeps photo consent separate and publishes the promised retention windows", () => {
    const terms = policyText(networkTermsPolicy);
    const privacy = policyText(networkPrivacyPolicy);

    expect(terms).toContain("separate affirmative consent");
    expect(privacy).toContain("separate affirmative consent");
    expect(privacy).toContain("within 24 hours");
    expect(privacy).toContain("up to 30 days");
  });
});
