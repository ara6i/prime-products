import assert from "node:assert/strict";
import test from "node:test";
import { mapCreatorWaitlist } from "./influencersMapper";
import type { AdminCreatorWaitlistResponse } from "../types";

test("maps every creator waitlist detail for the admin view", () => {
  const response: AdminCreatorWaitlistResponse = {
    summary: {
      total: 1,
      countries: 1,
      audienceSizes: { "50k-250k": 1 },
    },
    items: [
      {
        id: "creator-1",
        name: "Maya Laurent",
        email: "maya@example.com",
        primaryChannel: "instagram",
        creatorProfiles: [
          { platform: "instagram", url: "https://www.instagram.com/maya" },
          { platform: "tiktok", url: "https://www.tiktok.com/@maya" },
        ],
        audienceSize: "50k-250k",
        location: "France",
        timezone: "Europe/Paris",
        marketingConsent: true,
        leadSource: "creator-waitlist",
        firstJoinedAt: "2026-09-10T10:00:00.000Z",
        lastSubmittedAt: "2026-09-11T10:00:00.000Z",
        submissionCount: 2,
      },
    ],
    pagination: { page: 1, limit: 500, total: 1, totalPages: 1 },
  };

  const view = mapCreatorWaitlist(response);
  assert.equal(view.largerAudienceTotal, 1);
  assert.equal(view.items[0]?.audienceSizeLabel, "50K–250K");
  assert.equal(view.items[0]?.countryFlag, "🇫🇷");
  assert.equal(view.items[0]?.timezoneLabel, "Europe/Paris");
  assert.equal(view.items[0]?.consentLabel, "Confirmed");
  assert.equal(view.items[0]?.submissionLabel, "2 submissions");
  assert.equal(view.items[0]?.joinedNewYorkLabel, "Sep 10, 2026, 6:00 AM EDT");
  assert.equal(
    view.items[0]?.lastSubmittedNewYorkLabel,
    "Sep 11, 2026, 6:00 AM EDT",
  );
  assert.deepEqual(
    view.items[0]?.creatorProfiles.map((profile) => ({
      platform: profile.platformLabel,
      displayUrl: profile.displayUrl,
      primary: profile.primary,
    })),
    [
      {
        platform: "Instagram",
        displayUrl: "instagram.com/maya",
        primary: true,
      },
      { platform: "TikTok", displayUrl: "tiktok.com/@maya", primary: false },
    ],
  );
});
