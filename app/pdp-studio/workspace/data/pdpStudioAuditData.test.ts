import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { PDP_STUDIO_AUDIT_CATALOG } from "./pdpStudioAuditData";
import { PDP_STUDIO_TOOL_ASSETS } from "./pdpStudioToolAssets";

test("every visible tool has one real route and removed surfaces stay out of navigation", () => {
  const toolIds = PDP_STUDIO_AUDIT_CATALOG.tools.map((tool) => tool.id);
  assert.equal(new Set(toolIds).size, toolIds.length);
  for (const tool of PDP_STUDIO_AUDIT_CATALOG.tools) {
    const expectedRoute =
      tool.id === "ai-fashion-models"
        ? "/pdp-studio/clothing-photoshoot"
        : `/pdp-studio/tools/${tool.id}`;
    assert.equal(
      tool.href,
      expectedRoute,
      `${tool.id} must use the shared functional tool route`,
    );
  }

  const navigationLabels = PDP_STUDIO_AUDIT_CATALOG.navigation
    .flatMap((group) => group.routes ?? [])
    .map((route) => route.label);
  for (const removed of [
    "Designs",
    "Templates",
    "Usage",
    "Upgrade",
    "Visual Agents & API",
  ]) {
    assert.equal(navigationLabels.includes(removed), false);
  }
});

test("every tool canvas has a project-owned high-resolution example", async () => {
  for (const tool of PDP_STUDIO_AUDIT_CATALOG.tools) {
    const relativePath = PDP_STUDIO_TOOL_ASSETS[tool.id];
    assert.match(relativePath, /^\/images\/pdp-studio\/ai-tools-v2\/.+\.webp$/);
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    await access(absolutePath);
    const metadata = await sharp(absolutePath).metadata();
    assert.ok(
      (metadata.width ?? 0) >= 1024 && (metadata.height ?? 0) >= 1024,
      `${tool.id} must have a 1024px or larger canvas example`,
    );
  }
});
