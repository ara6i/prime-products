import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  PdpStudioApiError,
  pdpStudioApiRequest,
} from "./pdpStudioApiClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("API client sends JSON to the authenticated BFF route", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const response = await pdpStudioApiRequest<{ ok: true }>("/jobs", {
    method: "POST",
    body: JSON.stringify({ test: true }),
  });

  assert.deepEqual(response, { ok: true });
  assert.equal(requestedUrl, "/api/pdp-studio/platform/jobs");
  assert.equal(
    (requestedInit?.headers as Record<string, string>)["Content-Type"],
    "application/json",
  );
  assert.equal(requestedInit?.cache, "no-store");
});

test("API client exposes sanitized backend failures with status", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Private asset was not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    () => pdpStudioApiRequest("/assets/missing"),
    (error: unknown) =>
      error instanceof PdpStudioApiError &&
      error.status === 404 &&
      error.message === "Private asset was not found.",
  );
});
