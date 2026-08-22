import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SdkWearIndex } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";

export const SDK_WEAR_SCAN_ID = /^(?:IT|NA|NL)-\d{4}-A$/;

export async function heldoutWearPerson(scanId: string) {
  if (!SDK_WEAR_SCAN_ID.test(scanId)) return null;
  const indexPath = path.join(process.cwd(), ".local-ml", "wear-sdk-heldout", "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8")) as SdkWearIndex;
  return index.people.find((person) => person.scanId === scanId && person.role === "test") ?? null;
}
