import assert from "node:assert/strict";
import test from "node:test";
import {
  convertBodyInputSystem,
  normalizeBodyInputs,
  parseBodyHeight,
  parseBodyWeight,
} from "./body-inputs";

for (const raw of [
  "5' 8\"",
  "5′ 8″",
  "5 ft 8 in",
  "5 feet 8 inches",
  "68",
  "68 in",
]) {
  test(`imperial height ${raw} means 68 inches, not five`, () => {
    assert.equal(parseBodyHeight(raw, "imperial"), 68);
    assert.equal(
      normalizeBodyInputs({
        height: raw,
        weight: "150 lb",
        measurementSystem: "imperial",
      }).height,
      68,
    );
  });
}
test("metric inputs and optional units remain supported", () => {
  assert.deepEqual(
    normalizeBodyInputs({
      height: "173 cm",
      weight: "68 kg",
      measurementSystem: "metric",
    }),
    { height: 173, weight: 68, heightUnit: "cm", weightUnit: "kg" },
  );
  assert.equal(parseBodyHeight("173,5", "metric"), 173.5);
  assert.equal(parseBodyWeight("68,5 kg", "metric"), 68.5);
});
test("explicit units are respected independently of the selected display system", () => {
  assert.equal(parseBodyHeight("172.72 cm", "imperial"), 68);
  assert.equal(parseBodyHeight("5' 8\"", "metric"), 172.72);
  assert.equal(parseBodyWeight("150 lb", "metric"), 68.04);
  assert.equal(parseBodyWeight("68 kg", "imperial"), 149.91);
});
test("unit toggles convert both values and preserve other profile data", () => {
  const profile = {
    height: "173 cm",
    weight: "68 kg",
    measurementSystem: "metric" as const,
    firstName: "Test",
  };
  const imperial = convertBodyInputSystem(profile, "imperial");
  assert.deepEqual(imperial, {
    height: "68.11",
    weight: "149.91",
    measurementSystem: "imperial",
    firstName: "Test",
  });
  const restored = convertBodyInputSystem(imperial, "metric");
  assert.equal(restored.height, "173");
  assert.equal(restored.weight, "68");
  assert.equal(profile.height, "173 cm");
  assert.doesNotThrow(() => normalizeBodyInputs(imperial));
});
test("unit toggles convert feet/inches text and leave empty fields empty", () => {
  assert.deepEqual(
    convertBodyInputSystem(
      { height: "5' 8\"", weight: "", measurementSystem: "imperial" },
      "metric",
    ),
    { height: "172.72", weight: "", measurementSystem: "metric" },
  );
});
test("an unchanged system does not reconvert values", () => {
  const input = {
    height: "68",
    weight: "150",
    measurementSystem: "imperial" as const,
  };
  assert.equal(convertBodyInputSystem(input, "imperial"), input);
});
test("supported height boundaries survive a unit change", () => {
  for (const height of ["120", "230"]) {
    const metric = {
      height,
      weight: "68",
      measurementSystem: "metric" as const,
    };
    assert.doesNotThrow(() =>
      normalizeBodyInputs(convertBodyInputSystem(metric, "imperial")),
    );
  }
});
test("invalid or incomplete text is not silently erased by a unit toggle", () => {
  const input = {
    height: "five",
    weight: "?",
    measurementSystem: "imperial" as const,
  };
  const converted = convertBodyInputSystem(input, "metric");
  assert.equal(converted.height, "five");
  assert.equal(converted.weight, "?");
});
for (const raw of [
  "",
  "five",
  "5.8",
  "173",
  "5' 18\"",
  "68 nonsense",
  "NaN",
  "Infinity",
  "-68",
  "0",
]) {
  test(`invalid imperial height ${JSON.stringify(raw)} is stopped before a request`, () => {
    assert.throws(
      () =>
        normalizeBodyInputs({
          height: raw,
          weight: "150",
          measurementSystem: "imperial",
        }),
      /height|inches/i,
    );
  });
}
for (const raw of ["", "150abc", "NaN", "Infinity", "-68", "0"]) {
  test(`invalid weight ${JSON.stringify(raw)} is stopped before a request`, () => {
    assert.throws(
      () =>
        normalizeBodyInputs({
          height: "173",
          weight: raw,
          measurementSystem: "metric",
        }),
      /weight/i,
    );
  });
}
