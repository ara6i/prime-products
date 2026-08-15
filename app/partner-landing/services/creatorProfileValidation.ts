import type { CreatorPrimaryChannel } from "../types";

export type CreatorProfileUrlValidation = {
  valid: boolean;
  normalizedUrl: string;
  handle?: string;
  message: string;
};

const PLATFORM_LABELS: Record<CreatorPrimaryChannel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  youtube: "YouTube",
  pinterest: "Pinterest",
  blog: "blog or newsletter",
  other: "creator page",
};

const PLATFORM_HOSTS: Record<
  Exclude<CreatorPrimaryChannel, "blog" | "other">,
  { canonical: string; accepted: string[] }
> = {
  instagram: {
    canonical: "www.instagram.com",
    accepted: ["instagram.com", "www.instagram.com"],
  },
  tiktok: {
    canonical: "www.tiktok.com",
    accepted: ["tiktok.com", "www.tiktok.com"],
  },
  threads: {
    canonical: "www.threads.com",
    accepted: [
      "threads.com",
      "www.threads.com",
      "threads.net",
      "www.threads.net",
    ],
  },
  youtube: {
    canonical: "www.youtube.com",
    accepted: ["youtube.com", "www.youtube.com", "m.youtube.com"],
  },
  pinterest: {
    canonical: "www.pinterest.com",
    accepted: ["pinterest.com", "www.pinterest.com"],
  },
};

const RESERVED_INSTAGRAM_PATHS = new Set([
  "about",
  "accounts",
  "challenge",
  "developer",
  "direct",
  "explore",
  "legal",
  "p",
  "privacy",
  "reel",
  "reels",
  "stories",
  "terms",
  "web",
]);

const RESERVED_PINTEREST_PATHS = new Set([
  "business",
  "ideas",
  "pin",
  "search",
  "settings",
  "today",
]);

function buildHandleUrl(
  platform: CreatorPrimaryChannel,
  rawHandle: string,
): string | null {
  const handle = rawHandle.replace(/^@/, "");
  if (!handle) return null;

  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${handle}`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "threads":
      return `https://www.threads.com/@${handle}`;
    case "youtube":
      return `https://www.youtube.com/@${handle}`;
    case "pinterest":
      return `https://www.pinterest.com/${handle}`;
    case "blog":
    case "other":
      return null;
  }
}

function prepareUrlInput(platform: CreatorPrimaryChannel, value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("@")) return buildHandleUrl(platform, trimmed) ?? trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function getPathSegments(url: URL): string[] | null {
  try {
    return url.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function isPublicWebsiteHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (
    !normalized.includes(".") ||
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".invalid") ||
    normalized.endsWith(".test") ||
    normalized.endsWith(".example")
  ) {
    return false;
  }

  // Creator URLs should be named public websites, not direct IP targets.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return false;
  if (normalized.includes(":")) return false;
  return true;
}

export function getCreatorPlatformLabel(platform: CreatorPrimaryChannel): string {
  return PLATFORM_LABELS[platform];
}

export function isCreatorPlatformHostname(
  platform: CreatorPrimaryChannel,
  hostname: string,
): boolean {
  if (platform === "blog" || platform === "other") {
    return isPublicWebsiteHostname(hostname);
  }

  return PLATFORM_HOSTS[platform].accepted.includes(hostname.toLowerCase());
}

function invalid(
  message: string,
  normalizedUrl = "",
): CreatorProfileUrlValidation {
  return { valid: false, normalizedUrl, message };
}

export function validateCreatorProfileUrl(
  platform: CreatorPrimaryChannel,
  value: string,
): CreatorProfileUrlValidation {
  const label = getCreatorPlatformLabel(platform);
  if (!value.trim()) return invalid(`Enter your ${label} profile link.`);

  let url: URL;
  try {
    url = new URL(prepareUrlInput(platform, value));
  } catch {
    return invalid(`Enter a valid ${label} profile link.`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return invalid(`Use a public http or https ${label} link.`);
  }
  if (url.username || url.password || url.port) {
    return invalid(`Enter the standard public ${label} profile link.`);
  }
  if (!isCreatorPlatformHostname(platform, url.hostname)) {
    if (platform === "blog" || platform === "other") {
      return invalid("Use a public website address, not a local or private link.");
    }
    const requiredHost = PLATFORM_HOSTS[platform].accepted[0];
    const article = platform === "instagram" ? "an" : "a";
    return invalid(`Use ${article} ${label} profile link from ${requiredHost}.`);
  }

  const segments = getPathSegments(url);
  if (!segments) return invalid(`Enter a valid ${label} profile link.`);

  let handle: string | undefined;
  let normalizedPath = url.pathname;

  if (platform === "instagram") {
    const candidate = segments[0]?.replace(/^@/, "");
    if (
      segments.length !== 1 ||
      !candidate ||
      !/^[a-z\d._]{1,30}$/i.test(candidate) ||
      candidate.startsWith(".") ||
      candidate.endsWith(".") ||
      candidate.includes("..") ||
      RESERVED_INSTAGRAM_PATHS.has(candidate.toLowerCase())
    ) {
      return invalid("Paste an Instagram profile link, not a post or Instagram page.");
    }
    handle = candidate;
    normalizedPath = `/${candidate}`;
  } else if (platform === "tiktok" || platform === "threads") {
    const candidate = segments[0]?.replace(/^@/, "");
    if (
      segments.length !== 1 ||
      !candidate ||
      !/^[a-z\d._-]{1,40}$/i.test(candidate)
    ) {
      return invalid(`Paste a ${label} profile link, not a post or platform page.`);
    }
    handle = candidate;
    normalizedPath = `/@${candidate}`;
  } else if (platform === "youtube") {
    const first = segments[0] ?? "";
    const second = segments[1] ?? "";
    const isHandle =
      segments.length === 1 &&
      first.startsWith("@") &&
      /^[a-z\d._-]{1,100}$/i.test(first.slice(1));
    const isLegacyChannel =
      segments.length === 2 &&
      ["channel", "c", "user"].includes(first.toLowerCase()) &&
      /^[a-z\d._-]{2,120}$/i.test(second);

    if (!isHandle && !isLegacyChannel) {
      return invalid("Paste a YouTube channel link, not a video or YouTube page.");
    }
    handle = isHandle ? first.slice(1) : second;
    normalizedPath = isHandle ? `/@${handle}` : `/${first}/${second}`;
  } else if (platform === "pinterest") {
    const candidate = segments[0]?.replace(/^@/, "");
    if (
      segments.length !== 1 ||
      !candidate ||
      !/^[a-z\d_-]{1,60}$/i.test(candidate) ||
      RESERVED_PINTEREST_PATHS.has(candidate.toLowerCase())
    ) {
      return invalid("Paste a Pinterest profile link, not a pin or Pinterest page.");
    }
    handle = candidate;
    normalizedPath = `/${candidate}`;
  }

  url.protocol = "https:";
  if (platform !== "blog" && platform !== "other") {
    url.hostname = PLATFORM_HOSTS[platform].canonical;
  }
  url.pathname = normalizedPath;
  url.search = "";
  url.hash = "";

  return {
    valid: true,
    normalizedUrl: url.toString(),
    handle,
    message: `${label} link format is valid.`,
  };
}
