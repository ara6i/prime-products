import assert from "node:assert/strict";
import test from "node:test";
import { estimateSizing } from "./ai-sizing.service";
import {
  convertBodyInputSystem,
  normalizeBodyInputs,
} from "../lib/body-inputs";

for (const entryPoint of ["Profile", "AI Stylist"]) {
  test(`${entryPoint} sends normalized dimensions through the real sizing adapter`, async (t) => {
    const details =
      entryPoint === "Profile"
        ? convertBodyInputSystem(
            { height: "173", weight: "68", measurementSystem: "metric" },
            "imperial",
          )
        : {
            height: "5' 8\"",
            weight: "150 lb",
            measurementSystem: "imperial" as const,
          };
    const body = normalizeBodyInputs(details);
    let calls = 0;
    t.mock.method(
      globalThis,
      "fetch",
      async (url: string, init: RequestInit) => {
        calls++;
        assert.equal(url, "/api/users/me/sizing/estimate");
        assert.equal(init.credentials, "include");
        const request = JSON.parse(String(init.body));
        assert.equal(request.height, entryPoint === "Profile" ? 68.11 : 68);
        assert.equal(request.heightUnit, "in");
        assert.equal(request.weightUnit, "lbs");
        assert.equal(request.requiredFields.length, 8);
        assert.equal(request.bodyImage, undefined);
        assert.deepEqual(request.bodyLandmarks, { nose: { x: 0.5, y: 0.1 } });
        return new Response(
          JSON.stringify({
            estimates: Object.fromEntries(
              request.requiredFields.map((key: string) => [key, 80]),
            ),
            method: "vision",
            unit: "cm",
            confidence: "high",
          }),
          { status: 200 },
        );
      },
    );
    const result = await estimateSizing({
      ...body,
      gender: "male",
      bodyImage: "data:image/jpeg;base64,synthetic-fixture",
      bodyLandmarks: { nose: { x: 0.5, y: 0.1 } } as never,
    });
    assert.equal(result.method, "vision");
    assert.equal(Object.keys(result.estimates).length, 8);
    assert.equal(calls, 1);
  });
}
test("invalid input makes no estimation request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not request");
  });
  assert.throws(
    () =>
      normalizeBodyInputs({
        height: "173",
        weight: "68",
        measurementSystem: "imperial",
      }),
    /units/,
  );
  assert.equal(fetch.mock.callCount(), 0);
});
test("backend failure remains an error, never a fake successful sizing profile", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          message: "Unable to estimate body measurements. Please try again.",
        }),
        { status: 500 },
      ),
  );
  await assert.rejects(
    estimateSizing({
      height: 173,
      weight: 68,
      heightUnit: "cm",
      weightUnit: "kg",
      gender: "male",
    }),
    /Unable to estimate/,
  );
  assert.equal(fetch.mock.callCount(), 1);
});
