import {
  getCreatorPlatformLabel,
  isCreatorPlatformHostname,
  validateCreatorProfileUrl,
} from "../../../partner-landing/services/creatorProfileValidation";
import type { CreatorPrimaryChannel } from "@/app/partner-landing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerificationStatus = "verified" | "unverified" | "invalid";

type VerificationResult = {
  status: VerificationStatus;
  normalizedUrl: string;
  message: string;
};

type PublicPageFetchResult =
  | { kind: "response"; response: Response; url: URL }
  | { kind: "login-wall" }
  | { kind: "unsafe-redirect" }
  | { kind: "too-many-redirects" };

const CREATOR_CHANNELS = new Set<CreatorPrimaryChannel>([
  "instagram",
  "tiktok",
  "threads",
  "youtube",
  "pinterest",
  "blog",
  "other",
]);

function isCreatorPrimaryChannel(value: unknown): value is CreatorPrimaryChannel {
  return typeof value === "string" && CREATOR_CHANNELS.has(value as CreatorPrimaryChannel);
}

function isLoginOrChallengeUrl(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  return (
    path.includes("/login") ||
    path.includes("/accounts/login") ||
    path.includes("/challenge") ||
    path.includes("/consent") ||
    path.includes("/auth")
  );
}

async function fetchPublicProfilePage(
  platform: CreatorPrimaryChannel,
  normalizedUrl: string,
  signal: AbortSignal,
): Promise<PublicPageFetchResult> {
  let currentUrl = new URL(normalizedUrl);

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; PrimeStyleAI-ProfileCheck/1.0; +https://primestyleai.com)",
      },
    });

    if (response.status < 300 || response.status >= 400) {
      return { kind: "response", response, url: currentUrl };
    }

    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => undefined);
    if (!location) return { kind: "unsafe-redirect" };

    const nextUrl = new URL(location, currentUrl);
    if (isLoginOrChallengeUrl(nextUrl)) return { kind: "login-wall" };
    if (!isCreatorPlatformHostname(platform, nextUrl.hostname)) {
      return { kind: "unsafe-redirect" };
    }
    currentUrl = nextUrl;
  }

  return { kind: "too-many-redirects" };
}

async function readResponsePrefix(
  response: Response,
  limit = 900_000,
): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (received < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = limit - received;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      received += chunk.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function normalizeInspectableHtml(html: string): string {
  return html
    .toLowerCase()
    .replaceAll("&quot;", '"')
    .replaceAll("\\u0022", '"')
    .replaceAll('\\"', '"')
    .replace(/\s+/g, " ");
}

function appearsMissing(html: string): boolean {
  return [
    "sorry, this page isn't available",
    "this page isn't available",
    "page not found",
    "account not found",
    "couldn't find this account",
    "could not find this account",
    "profile not found",
  ].some((marker) => html.includes(marker));
}

function appearsPrivate(html: string): boolean {
  return (
    /"(?:is_?private|privateaccount)"\s*:\s*true/i.test(html) ||
    html.includes("this account is private") ||
    html.includes("this profile is private")
  );
}

function hasPublicProfileSignal(
  platform: CreatorPrimaryChannel,
  html: string,
  handle?: string,
): boolean {
  if (!handle) return false;
  const compact = html.replace(/\s+/g, "");
  const normalizedHandle = handle.toLowerCase().replace(/^@/, "");
  const usernameSignals = [
    `"username":"${normalizedHandle}"`,
    `"uniqueid":"${normalizedHandle}"`,
    `username=${normalizedHandle}`,
    `/@${normalizedHandle}`,
  ];
  const hasUsernameSignal = usernameSignals.some((signal) => compact.includes(signal));

  if (platform === "instagram") {
    const usernameSignal = `"username":"${normalizedHandle}"`;
    let usernameIndex = compact.indexOf(usernameSignal);

    while (usernameIndex >= 0) {
      const profileWindow = compact.slice(
        Math.max(0, usernameIndex - 2_000),
        Math.min(compact.length, usernameIndex + 5_000),
      );
      if (/"is_?private":false/i.test(profileWindow)) return true;
      usernameIndex = compact.indexOf(usernameSignal, usernameIndex + usernameSignal.length);
    }

    return false;
  }
  if (platform === "youtube") {
    return hasUsernameSignal && compact.includes('"channelid"');
  }
  if (platform === "pinterest") {
    return hasUsernameSignal && compact.includes('property="og:title"');
  }
  return hasUsernameSignal;
}

function result(
  status: VerificationStatus,
  normalizedUrl: string,
  message: string,
): VerificationResult {
  return { status, normalizedUrl, message };
}

function manualReviewMessage(label: string): string {
  return `${label} link saved. We couldn’t confirm automatically that the profile is public, so we’ll verify it during review.`;
}

async function verifyTikTokProfileWithOEmbed(
  normalizedUrl: string,
  handle: string | undefined,
  signal: AbortSignal,
): Promise<VerificationResult | null> {
  const endpoint = new URL("https://www.tiktok.com/oembed");
  endpoint.searchParams.set("url", normalizedUrl);

  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (compatible; PrimeStyleAI-ProfileCheck/1.0; +https://primestyleai.com)",
    },
  });

  if ([400, 404, 410].includes(response.status)) {
    await response.body?.cancel().catch(() => undefined);
    return result(
      "invalid",
      normalizedUrl,
      "No public TikTok profile was found at this link. Check the username.",
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    author_url?: unknown;
    provider_name?: unknown;
    embed_type?: unknown;
  } | null;
  if (
    !payload ||
    payload.provider_name !== "TikTok" ||
    payload.embed_type !== "profile" ||
    typeof payload.author_url !== "string"
  ) {
    return null;
  }

  const authorProfile = validateCreatorProfileUrl("tiktok", payload.author_url);
  if (
    !authorProfile.valid ||
    !authorProfile.handle ||
    !handle ||
    authorProfile.handle.toLowerCase() !== handle.toLowerCase()
  ) {
    return null;
  }

  return result("verified", normalizedUrl, "Public TikTok profile confirmed.");
}

async function verifyPublicCreatorProfile(
  platform: CreatorPrimaryChannel,
  normalizedUrl: string,
  handle?: string,
): Promise<VerificationResult> {
  const label = getCreatorPlatformLabel(platform);

  // Arbitrary websites are deliberately not fetched: doing so would turn this
  // public endpoint into an SSRF surface. Their format is checked here and the
  // page is reviewed with the application.
  if (platform === "blog" || platform === "other") {
    return result(
      "unverified",
      normalizedUrl,
      `${label[0].toUpperCase()}${label.slice(1)} link saved. We’ll review the public page before approval.`,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_500);

  try {
    if (platform === "tiktok") {
      const oEmbedResult = await verifyTikTokProfileWithOEmbed(
        normalizedUrl,
        handle,
        controller.signal,
      );
      if (oEmbedResult) return oEmbedResult;
    }

    const fetched = await fetchPublicProfilePage(
      platform,
      normalizedUrl,
      controller.signal,
    );

    if (fetched.kind !== "response") {
      return result(
        "unverified",
        normalizedUrl,
        manualReviewMessage(label),
      );
    }

    const { response } = fetched;
    if (response.status === 404 || response.status === 410) {
      await response.body?.cancel().catch(() => undefined);
      return result(
        "invalid",
        normalizedUrl,
        `No public ${label} profile was found at this link. Check the username.`,
      );
    }
    if ([401, 403, 429].includes(response.status) || response.status >= 500) {
      await response.body?.cancel().catch(() => undefined);
      return result(
        "unverified",
        normalizedUrl,
        manualReviewMessage(label),
      );
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return result(
        "invalid",
        normalizedUrl,
        `No public ${label} profile was found at this link. Check the username.`,
      );
    }

    const inspectionLimit =
      platform === "youtube" || platform === "pinterest" ? 1_500_000 : 900_000;
    const html = normalizeInspectableHtml(
      await readResponsePrefix(response, inspectionLimit),
    );
    if (appearsPrivate(html)) {
      return result(
        "invalid",
        normalizedUrl,
        `${label} profile appears private. Make it public, then try again.`,
      );
    }

    const publicProfileConfirmed = hasPublicProfileSignal(platform, html, handle);

    // TikTok includes localized missing-account messages in the JavaScript
    // dictionary of valid profile pages. Its matching user-detail payload is
    // the stronger signal and must be checked before those generic strings.
    if (platform === "tiktok" && publicProfileConfirmed) {
      return result(
        "verified",
        normalizedUrl,
        `Public ${label} profile confirmed.`,
      );
    }
    if (appearsMissing(html)) {
      return result(
        "invalid",
        normalizedUrl,
        `No public ${label} profile was found at this link. Check the username.`,
      );
    }
    if (publicProfileConfirmed) {
      return result(
        "verified",
        normalizedUrl,
        `Public ${label} profile confirmed.`,
      );
    }

    return result(
      "unverified",
      normalizedUrl,
      manualReviewMessage(label),
    );
  } catch {
    return result(
      "unverified",
      normalizedUrl,
      manualReviewMessage(label),
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: { platform?: unknown; url?: unknown };
  try {
    body = (await request.json()) as { platform?: unknown; url?: unknown };
  } catch {
    return Response.json(
      { status: "invalid", normalizedUrl: "", message: "Enter a profile link." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isCreatorPrimaryChannel(body.platform) || typeof body.url !== "string") {
    return Response.json(
      { status: "invalid", normalizedUrl: "", message: "Choose a platform and enter its profile link." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const validation = validateCreatorProfileUrl(body.platform, body.url);
  if (!validation.valid) {
    return Response.json(
      {
        status: "invalid",
        normalizedUrl: validation.normalizedUrl,
        message: validation.message,
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const verification = await verifyPublicCreatorProfile(
    body.platform,
    validation.normalizedUrl,
    validation.handle,
  );
  return Response.json(verification, {
    status: verification.status === "invalid" ? 422 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
