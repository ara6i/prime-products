import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function request(platform: string, url: string) {
  return new Request("http://localhost/api/creator-profiles/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, url }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("creator profile validation route", () => {
  it("rejects a post URL before making a public-page request", async () => {
    const publicFetch = vi.fn();
    vi.stubGlobal("fetch", publicFetch);

    const response = await POST(request("instagram", "instagram.com/p/abc"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.status).toBe("invalid");
    expect(publicFetch).not.toHaveBeenCalled();
  });

  it("accepts a valid link when a platform blocks automated checks", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 403 })));

    const response = await POST(request("instagram", "instagram.com/creator"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "unverified",
      normalizedUrl: "https://www.instagram.com/creator",
    });
  });

  it("rejects a profile that the public page reports as missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>This page isn't available</html>", { status: 200 }),
      ),
    );

    const response = await POST(request("threads", "threads.net/@missing-person"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.status).toBe("invalid");
  });

  it("confirms only that a matching profile page is public", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('<script>{"username":"creator"}</script>', {
          status: 200,
        }),
      ),
    );

    const response = await POST(request("instagram", "instagram.com/creator"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "verified",
      message: "Public Instagram profile confirmed.",
    });
    expect(body.message).not.toMatch(/human|ownership/i);
  });

  it("does not fetch arbitrary blog URLs", async () => {
    const publicFetch = vi.fn();
    vi.stubGlobal("fetch", publicFetch);

    const response = await POST(request("blog", "creator.example.org"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unverified");
    expect(publicFetch).not.toHaveBeenCalled();
  });
});
