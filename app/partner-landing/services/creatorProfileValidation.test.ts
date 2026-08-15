import { describe, expect, it } from "vitest";
import { validateCreatorProfileUrl } from "./creatorProfileValidation";

describe("validateCreatorProfileUrl", () => {
  it("adds https and normalizes an Instagram profile URL", () => {
    expect(validateCreatorProfileUrl("instagram", "instagram.com/a")).toMatchObject({
      valid: true,
      normalizedUrl: "https://www.instagram.com/a",
      handle: "a",
    });
  });

  it("rejects the wrong domain and Instagram post links", () => {
    expect(
      validateCreatorProfileUrl("instagram", "https://example.com/creator").valid,
    ).toBe(false);
    expect(
      validateCreatorProfileUrl("instagram", "instagram.com/p/abc123").valid,
    ).toBe(false);
  });

  it("normalizes profile handles for TikTok and Threads", () => {
    expect(validateCreatorProfileUrl("tiktok", "tiktok.com/creator")).toMatchObject({
      valid: true,
      normalizedUrl: "https://www.tiktok.com/@creator",
    });
    expect(validateCreatorProfileUrl("threads", "@creator")).toMatchObject({
      valid: true,
      normalizedUrl: "https://www.threads.com/@creator",
    });
    expect(
      validateCreatorProfileUrl("threads", "threads.net/@creator"),
    ).toMatchObject({
      valid: true,
      normalizedUrl: "https://www.threads.com/@creator",
    });
  });

  it("accepts YouTube channels but rejects YouTube videos", () => {
    expect(
      validateCreatorProfileUrl("youtube", "youtube.com/@creator").valid,
    ).toBe(true);
    expect(
      validateCreatorProfileUrl("youtube", "youtube.com/watch?v=abc").valid,
    ).toBe(false);
  });

  it("rejects local and direct-IP websites", () => {
    expect(validateCreatorProfileUrl("blog", "http://localhost:3000").valid).toBe(
      false,
    );
    expect(validateCreatorProfileUrl("other", "http://127.0.0.1/profile").valid).toBe(
      false,
    );
  });
});
