import { afterEach, describe, expect, it, vi } from "vitest";
import { submitPartnerInterest } from "./partnerInterestService";

const creatorProfiles = [
  { platform: "instagram" as const, url: "https://www.instagram.com/nike/" },
  { platform: "tiktok" as const, url: "https://www.tiktok.com/@nike" },
  { platform: "threads" as const, url: "https://www.threads.com/@nike" },
  { platform: "youtube" as const, url: "https://www.youtube.com/@Nike" },
  { platform: "pinterest" as const, url: "https://www.pinterest.com/nike/" },
  { platform: "blog" as const, url: "https://about.nike.com/en/newsroom" },
  { platform: "other" as const, url: "https://www.facebook.com/nike/" },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitPartnerInterest", () => {
  it("submits every creator profile without duplicating the first link as a website", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitPartnerInterest({
      audience: "influencer",
      name: "Arash QA Test",
      email: "ara6i.sn@gmail.com",
      creatorProfiles,
      audienceSize: "under-10k",
      location: "Armenia",
      timezone: "Asia/Yerevan",
      marketingConsent: true,
      leadSource: "creator-waitlist",
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));

    expect(body).not.toHaveProperty("website");
    expect(body).not.toHaveProperty("primaryChannel");
    expect(body.creatorProfiles).toHaveLength(7);
    expect(body.creatorProfiles.map((profile: { platform: string }) => profile.platform)).toEqual(
      creatorProfiles.map((profile) => profile.platform),
    );
  });
});
