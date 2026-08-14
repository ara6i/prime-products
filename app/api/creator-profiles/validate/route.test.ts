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
        new Response('<script>{"username":"creator","is_private":false}</script>', {
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

  it("rejects an Instagram profile when its privacy marker appears late in the page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `<script>{"username":"cristian"}${"x".repeat(220_000)}"is_private":true</script>`,
          { status: 200 },
        ),
      ),
    );

    const response = await POST(request("instagram", "instagram.com/cristian"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      status: "invalid",
      message: "Instagram profile appears private. Make it public, then try again.",
    });
  });

  it("does not show Instagram as verified from the username alone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('<script>{"username":"creator"}</script>', { status: 200 }),
      ),
    );

    const response = await POST(request("instagram", "instagram.com/creator"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unverified");
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
