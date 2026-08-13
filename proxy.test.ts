import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const ENVIRONMENT_KEYS = [
  "ADMIN_HOSTS",
  "CREATOR_HOSTS",
  "CREATOR_PUBLIC_URL",
  "PRIME_PRODUCTS_SITE_AUTH_ENABLED",
  "PUBLIC_SITE_HOSTS",
] as const;

const originalEnvironment = Object.fromEntries(
  ENVIRONMENT_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENVIRONMENT_KEYS)[number], string | undefined>;

function request(
  pathname: string,
  options: { host?: string; method?: string } = {},
): NextRequest {
  const host = options.host ?? "creators.localhost:3000";
  return new NextRequest(`http://${host}${pathname}`, {
    method: options.method ?? "GET",
    headers: { host },
  });
}

beforeEach(() => {
  for (const key of ENVIRONMENT_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENVIRONMENT_KEYS) {
    const originalValue = originalEnvironment[key];
    if (originalValue === undefined) delete process.env[key];
    else process.env[key] = originalValue;
  }
});

describe("creator subdomain routing", () => {
  it("serves the influencer landing at the creator-domain root", async () => {
    const response = await proxy(request("/?utm_source=test"));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://creators.localhost:3000/influencers?utm_source=test",
    );
  });

  it("serves creator legal pages and redirects unrelated pages to root", async () => {
    const dashboard = await proxy(request("/dashboard?preview=1"));
    const privacy = await proxy(request("/privacy-policy"));
    const terms = await proxy(request("/terms"));

    expect(dashboard.status).toBe(307);
    expect(dashboard.headers.get("location")).toBe(
      "http://creators.localhost:3000/",
    );
    expect(privacy.headers.get("x-middleware-next")).toBe("1");
    expect(terms.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows only POST and OPTIONS for creator waitlist APIs", async () => {
    const notifyPost = await proxy(
      request("/api/contact/notify", { method: "POST" }),
    );
    const validationPost = await proxy(
      request("/api/creator-profiles/validate", { method: "POST" }),
    );
    const notifyGet = await proxy(request("/api/contact/notify"));
    const validationGet = await proxy(request("/api/creator-profiles/validate"));
    const anotherApi = await proxy(request("/api/users", { method: "POST" }));

    expect(notifyPost.headers.get("x-middleware-next")).toBe("1");
    expect(validationPost.headers.get("x-middleware-next")).toBe("1");
    expect(notifyGet.status).toBe(404);
    expect(validationGet.status).toBe(404);
    expect(anotherApi.status).toBe(404);
  });

  it("redirects the old public landing URL without moving nested routes", async () => {
    const landing = await proxy(
      request("/influencers?utm_source=legacy", {
        host: "primestyleai.com",
      }),
    );
    const profile = await proxy(
      request("/influencers/maya-laurent", {
        host: "primestyleai.com",
      }),
    );

    expect(landing.status).toBe(308);
    expect(landing.headers.get("location")).toBe(
      "https://creators.primestyleai.com/?utm_source=legacy",
    );
    expect(profile.headers.get("x-middleware-next")).toBe("1");
  });
});
